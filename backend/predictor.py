import logging
import os
from datetime import datetime

import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import TimeSeriesSplit
from sqlalchemy.orm import Session

from backend import models

logger = logging.getLogger("f1-dashboard.predictor")

MODEL_PATH = "./cache/f1_model.pkl"
MAX_CONFIDENCE = 0.70


class F1Predictor:
    def __init__(self, session_factory):
        self.session_factory = session_factory
        self.model = None
        self.feature_importance = {}
        self.accuracy_history = []
        self.feature_columns = [
            "grid_position",
            "driver_season_points",
            "constructor_season_points",
            "circuit_driver_avg_finish",
            "circuit_constructor_avg_finish",
            "qualifying_delta_to_pole_pct",
            "season_position",
            "dnf_rate_recent",
            "is_street_circuit",
            "home_race",
        ]
        self._load_model()

    def _load_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                data = joblib.load(MODEL_PATH)
                self.model = data["model"]
                self.feature_importance = data.get("feature_importance", {})
                self.accuracy_history = data.get("accuracy_history", [])
                logger.info("Loaded prediction model from cache")
            except Exception as e:
                logger.warning(f"Could not load model: {e}")

    def _save_model(self):
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump(
            {
                "model": self.model,
                "feature_importance": self.feature_importance,
                "accuracy_history": self.accuracy_history,
                "trained_at": datetime.utcnow().isoformat(),
            },
            MODEL_PATH,
        )

    def build_training_data(self) -> tuple[pd.DataFrame, pd.Series]:
        db = self.session_factory()
        try:
            # Get all race results with qualifying
            results = (
                db.query(models.RaceResult)
                .join(models.Race)
                .filter(models.Race.year >= 2018)
                .order_by(models.Race.year, models.Race.round)
                .all()
            )

            rows = []
            for r in results:
                if r.position is None:
                    continue

                race = r.race
                driver = r.driver
                constructor = r.constructor

                # Get qualifying position
                qual = (
                    db.query(models.QualifyingResult)
                    .filter(
                        models.QualifyingResult.race_id == race.id,
                        models.QualifyingResult.driver_id == driver.id,
                    )
                    .first()
                )
                grid_pos = qual.position if qual else r.grid

                # Driver season points (standings before this race)
                standing = (
                    db.query(models.DriverStanding)
                    .filter(
                        models.DriverStanding.year == race.year,
                        models.DriverStanding.driver_id == driver.id,
                    )
                    .order_by(models.DriverStanding.round.desc())
                    .first()
                )
                driver_points = standing.points if standing else 0
                season_pos = standing.position if standing else 20

                # Constructor season points
                if constructor:
                    cs = (
                        db.query(models.ConstructorStanding)
                        .filter(
                            models.ConstructorStanding.year == race.year,
                            models.ConstructorStanding.constructor_id == constructor.id,
                        )
                        .order_by(models.ConstructorStanding.round.desc())
                        .first()
                    )
                    constructor_points = cs.points if cs else 0
                else:
                    constructor_points = 0

                # Circuit history for driver
                circuit_results = (
                    db.query(models.RaceResult.position)
                    .join(models.Race)
                    .filter(
                        models.Race.circuit_id == race.circuit_id,
                        models.RaceResult.driver_id == driver.id,
                        models.Race.year < race.year,
                        models.RaceResult.position.isnot(None),
                    )
                    .all()
                )
                circuit_driver_avg = (
                    np.mean([cr[0] for cr in circuit_results]) if circuit_results else 10.0
                )

                # Circuit history for constructor
                if constructor:
                    cc_results = (
                        db.query(models.RaceResult.position)
                        .join(models.Race)
                        .filter(
                            models.Race.circuit_id == race.circuit_id,
                            models.RaceResult.constructor_id == constructor.id,
                            models.Race.year < race.year,
                            models.RaceResult.position.isnot(None),
                        )
                        .all()
                    )
                    circuit_const_avg = (
                        np.mean([cr[0] for cr in cc_results]) if cc_results else 10.0
                    )
                else:
                    circuit_const_avg = 10.0

                # DNF rate (last 10 races)
                recent = (
                    db.query(models.RaceResult)
                    .join(models.Race)
                    .filter(
                        models.RaceResult.driver_id == driver.id,
                        models.Race.year <= race.year,
                    )
                    .order_by(models.Race.year.desc(), models.Race.round.desc())
                    .limit(10)
                    .all()
                )
                dnfs = sum(1 for rr in recent if rr.status and rr.status != "Finished" and "Lap" not in rr.status)
                dnf_rate = dnfs / max(len(recent), 1)

                # Qualifying delta to pole (approximate)
                if qual and qual.position:
                    qual_delta = (qual.position - 1) / 20.0
                else:
                    qual_delta = (grid_pos - 1) / 20.0 if grid_pos else 0.5

                # Street circuit heuristic
                circuit = race.circuit
                street_circuits = {"monaco", "jeddah", "baku", "singapore", "las_vegas", "melbourne"}
                is_street = 1 if circuit and circuit.circuit_id in street_circuits else 0

                # Home race
                home_race = 0  # Simplified: would need nationality-to-country mapping

                rows.append({
                    "grid_position": grid_pos or 20,
                    "driver_season_points": driver_points,
                    "constructor_season_points": constructor_points,
                    "circuit_driver_avg_finish": circuit_driver_avg,
                    "circuit_constructor_avg_finish": circuit_const_avg,
                    "qualifying_delta_to_pole_pct": qual_delta,
                    "season_position": season_pos / 20.0,
                    "dnf_rate_recent": dnf_rate,
                    "is_street_circuit": is_street,
                    "home_race": home_race,
                    "podium": 1 if r.position <= 3 else 0,
                    "year": race.year,
                    "round": race.round,
                })

            df = pd.DataFrame(rows)
            if df.empty:
                return pd.DataFrame(), pd.Series()

            X = df[self.feature_columns]
            y = df["podium"]
            return X, y
        finally:
            db.close()

    def train(self):
        logger.info("Training prediction model...")
        X, y = self.build_training_data()

        if X.empty or len(X) < 50:
            logger.warning("Not enough training data")
            return

        self.model = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.1,
            subsample=0.8,
            min_samples_leaf=10,
            random_state=42,
        )
        self.model.fit(X, y)

        # Feature importance
        self.feature_importance = dict(
            zip(self.feature_columns, self.model.feature_importances_.tolist())
        )

        # Cross-validation accuracy
        tss = TimeSeriesSplit(n_splits=3)
        scores = []
        for train_idx, test_idx in tss.split(X):
            clf = GradientBoostingClassifier(
                n_estimators=200, max_depth=4, learning_rate=0.1,
                subsample=0.8, min_samples_leaf=10, random_state=42,
            )
            clf.fit(X.iloc[train_idx], y.iloc[train_idx])
            scores.append(clf.score(X.iloc[test_idx], y.iloc[test_idx]))

        avg_accuracy = np.mean(scores)
        logger.info(f"Model trained. CV accuracy: {avg_accuracy:.3f}")

        self._save_model()

    def _cap_confidence(self, probs: np.ndarray) -> np.ndarray:
        capped = np.minimum(probs, MAX_CONFIDENCE)
        total = capped.sum()
        if total > 0:
            capped = capped / total * probs.sum()
        return capped

    def predict_race(self, year: int, round_num: int) -> dict:
        if self.model is None:
            return {"error": "Model not trained yet. Wait for initial data sync."}

        db = self.session_factory()
        try:
            race = (
                db.query(models.Race)
                .filter(models.Race.year == year, models.Race.round == round_num)
                .first()
            )
            if not race:
                return {"error": f"Race {year} round {round_num} not found"}

            # Get qualifying results for this race
            quals = (
                db.query(models.QualifyingResult)
                .filter(models.QualifyingResult.race_id == race.id)
                .order_by(models.QualifyingResult.position)
                .all()
            )

            if not quals:
                # Fall back to any available driver data
                results = (
                    db.query(models.RaceResult)
                    .filter(models.RaceResult.race_id == race.id)
                    .all()
                )
                if not results:
                    return {"error": "No qualifying or race data available"}

            predictions = []
            for q in quals:
                driver = q.driver
                constructor = q.constructor

                features = self._build_features_for_prediction(
                    db, race, driver, constructor, q.position
                )
                if features is None:
                    continue

                X = pd.DataFrame([features])[self.feature_columns]
                prob = self.model.predict_proba(X)[0]
                podium_prob = float(prob[1]) if len(prob) > 1 else 0.0
                podium_prob = min(podium_prob, MAX_CONFIDENCE)

                predictions.append({
                    "driver": {
                        "id": driver.driver_id,
                        "code": driver.code,
                        "name": f"{driver.first_name} {driver.last_name}",
                    },
                    "constructor": constructor.name if constructor else None,
                    "grid_position": q.position,
                    "podium_probability": round(podium_prob, 3),
                    "confidence_note": "Capped at 70% — F1 is unpredictable",
                })

            predictions.sort(key=lambda p: p["podium_probability"], reverse=True)

            return {
                "race": {
                    "year": race.year,
                    "round": race.round,
                    "name": race.race_name,
                    "date": race.date,
                },
                "predictions": predictions,
                "feature_importance": self.feature_importance,
                "disclaimer": "F1 is unpredictable. Treat these as informed estimates, not forecasts.",
            }
        finally:
            db.close()

    def _build_features_for_prediction(self, db, race, driver, constructor, grid_pos):
        try:
            standing = (
                db.query(models.DriverStanding)
                .filter(
                    models.DriverStanding.year == race.year,
                    models.DriverStanding.driver_id == driver.id,
                )
                .order_by(models.DriverStanding.round.desc())
                .first()
            )
            driver_points = standing.points if standing else 0
            season_pos = standing.position if standing else 20

            constructor_points = 0
            if constructor:
                cs = (
                    db.query(models.ConstructorStanding)
                    .filter(
                        models.ConstructorStanding.year == race.year,
                        models.ConstructorStanding.constructor_id == constructor.id,
                    )
                    .order_by(models.ConstructorStanding.round.desc())
                    .first()
                )
                constructor_points = cs.points if cs else 0

            circuit_results = (
                db.query(models.RaceResult.position)
                .join(models.Race)
                .filter(
                    models.Race.circuit_id == race.circuit_id,
                    models.RaceResult.driver_id == driver.id,
                    models.RaceResult.position.isnot(None),
                )
                .all()
            )
            circuit_driver_avg = (
                np.mean([cr[0] for cr in circuit_results]) if circuit_results else 10.0
            )

            circuit_const_avg = 10.0
            if constructor:
                cc_results = (
                    db.query(models.RaceResult.position)
                    .join(models.Race)
                    .filter(
                        models.Race.circuit_id == race.circuit_id,
                        models.RaceResult.constructor_id == constructor.id,
                        models.RaceResult.position.isnot(None),
                    )
                    .all()
                )
                if cc_results:
                    circuit_const_avg = np.mean([cr[0] for cr in cc_results])

            recent = (
                db.query(models.RaceResult)
                .join(models.Race)
                .filter(models.RaceResult.driver_id == driver.id)
                .order_by(models.Race.year.desc(), models.Race.round.desc())
                .limit(10)
                .all()
            )
            dnfs = sum(1 for rr in recent if rr.status and rr.status != "Finished" and "Lap" not in rr.status)
            dnf_rate = dnfs / max(len(recent), 1)

            qual_delta = (grid_pos - 1) / 20.0

            circuit = race.circuit
            street_circuits = {"monaco", "jeddah", "baku", "singapore", "las_vegas", "melbourne"}
            is_street = 1 if circuit and circuit.circuit_id in street_circuits else 0

            return {
                "grid_position": grid_pos or 20,
                "driver_season_points": driver_points,
                "constructor_season_points": constructor_points,
                "circuit_driver_avg_finish": circuit_driver_avg,
                "circuit_constructor_avg_finish": circuit_const_avg,
                "qualifying_delta_to_pole_pct": qual_delta,
                "season_position": season_pos / 20.0,
                "dnf_rate_recent": dnf_rate,
                "is_street_circuit": is_street,
                "home_race": 0,
            }
        except Exception as e:
            logger.error(f"Error building features for {driver.code}: {e}")
            return None

    def get_model_info(self) -> dict:
        return {
            "trained": self.model is not None,
            "feature_importance": self.feature_importance,
            "feature_columns": self.feature_columns,
            "max_confidence": MAX_CONFIDENCE,
            "accuracy_history": self.accuracy_history,
        }
