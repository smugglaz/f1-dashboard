from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, UniqueConstraint
)
from sqlalchemy.orm import declarative_base, relationship
from datetime import datetime

Base = declarative_base()


class Circuit(Base):
    __tablename__ = "circuits"
    id = Column(Integer, primary_key=True, autoincrement=True)
    circuit_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    country = Column(String(100))
    locality = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    # Enriched fields
    wiki_url = Column(String(500))
    track_length_km = Column(Float)
    num_corners = Column(Integer)
    altitude = Column(Integer)  # metres above sea level
    races = relationship("Race", back_populates="circuit")


class Race(Base):
    __tablename__ = "races"
    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(Integer, nullable=False)
    round = Column(Integer, nullable=False)
    race_name = Column(String(200), nullable=False)
    circuit_id = Column(Integer, ForeignKey("circuits.id"))
    date = Column(String(20))
    time = Column(String(20))
    url = Column(String(500))
    # Practice session dates/times from Jolpica schedule
    fp1_date = Column(String(20))
    fp1_time = Column(String(20))
    fp2_date = Column(String(20))
    fp2_time = Column(String(20))
    fp3_date = Column(String(20))
    fp3_time = Column(String(20))
    # Qualifying dates (separate from race date)
    qualifying_date = Column(String(20))
    qualifying_time = Column(String(20))
    # Sprint weekend fields
    has_sprint = Column(Boolean, default=False)
    sprint_date = Column(String(20))
    sprint_time = Column(String(20))
    sprint_qualifying_date = Column(String(20))
    sprint_qualifying_time = Column(String(20))
    # Qualifying format context for historical display
    # LEGACY (pre-2003), ONE_LAP (2003-2005), KNOCKOUT (2006+)
    qualifying_format = Column(String(20), default='KNOCKOUT')
    circuit = relationship("Circuit", back_populates="races")
    results = relationship("RaceResult", back_populates="race", cascade="all, delete-orphan")
    qualifying_results = relationship("QualifyingResult", back_populates="race", cascade="all, delete-orphan")
    pit_stops = relationship("PitStop", back_populates="race", cascade="all, delete-orphan")
    sprint_results = relationship("SprintResult", back_populates="race", cascade="all, delete-orphan")
    sprint_shootout_results = relationship("SprintShootoutResult", back_populates="race", cascade="all, delete-orphan")
    lap_times = relationship("LapTime", back_populates="race", cascade="all, delete-orphan")
    stints = relationship("Stint", back_populates="race", cascade="all, delete-orphan")
    fastf1_laps = relationship("FastF1Lap", back_populates="race", cascade="all, delete-orphan")
    weather_samples = relationship("SessionWeather", back_populates="race", cascade="all, delete-orphan")
    race_control_messages = relationship("RaceControlMessage", back_populates="race", cascade="all, delete-orphan")
    __table_args__ = (UniqueConstraint("year", "round"),)


class Driver(Base):
    __tablename__ = "drivers"
    id = Column(Integer, primary_key=True, autoincrement=True)
    driver_id = Column(String(50), unique=True, nullable=False)
    code = Column(String(5))
    number = Column(Integer)
    first_name = Column(String(100))
    last_name = Column(String(100))
    nationality = Column(String(50))
    date_of_birth = Column(String(20))
    # Enriched fields
    wiki_url = Column(String(500))
    permanent_number = Column(Integer)  # official FIA permanent number


class Constructor(Base):
    __tablename__ = "constructors"
    id = Column(Integer, primary_key=True, autoincrement=True)
    constructor_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    nationality = Column(String(50))


class RaceResult(Base):
    __tablename__ = "race_results"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    constructor_id = Column(Integer, ForeignKey("constructors.id"))
    grid = Column(Integer)
    position = Column(Integer)
    position_text = Column(String(10))
    points = Column(Float, default=0)
    laps = Column(Integer)
    status = Column(String(100))
    time_text = Column(String(50))
    time_millis = Column(Integer)
    fastest_lap_rank = Column(Integer)
    fastest_lap_time = Column(String(20))
    fastest_lap_speed = Column(String(20))
    race = relationship("Race", back_populates="results")
    driver = relationship("Driver")
    constructor = relationship("Constructor")
    __table_args__ = (UniqueConstraint("race_id", "driver_id"),)


class QualifyingResult(Base):
    __tablename__ = "qualifying_results"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    constructor_id = Column(Integer, ForeignKey("constructors.id"))
    position = Column(Integer)
    q1 = Column(String(20))
    q2 = Column(String(20))
    q3 = Column(String(20))
    race = relationship("Race", back_populates="qualifying_results")
    driver = relationship("Driver")
    constructor = relationship("Constructor")
    __table_args__ = (UniqueConstraint("race_id", "driver_id"),)


class SprintResult(Base):
    """Sprint race results (2021+). Points awarded to top 8."""
    __tablename__ = "sprint_results"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    constructor_id = Column(Integer, ForeignKey("constructors.id"))
    grid = Column(Integer)
    position = Column(Integer)
    position_text = Column(String(10))
    points = Column(Float, default=0)
    laps = Column(Integer)
    status = Column(String(100))
    time_text = Column(String(50))
    time_millis = Column(Integer)
    fastest_lap_time = Column(String(20))
    race = relationship("Race", back_populates="sprint_results")
    driver = relationship("Driver")
    constructor = relationship("Constructor")
    __table_args__ = (UniqueConstraint("race_id", "driver_id"),)


class SprintShootoutResult(Base):
    """Sprint Shootout / Sprint Qualifying results (2021+).
    Sets the sprint race grid. SQ1/SQ2/SQ3 format from 2023;
    single-phase sprint qualifying in 2021-2022."""
    __tablename__ = "sprint_shootout_results"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    constructor_id = Column(Integer, ForeignKey("constructors.id"))
    position = Column(Integer)
    sq1 = Column(String(20))
    sq2 = Column(String(20))
    sq3 = Column(String(20))
    race = relationship("Race", back_populates="sprint_shootout_results")
    driver = relationship("Driver")
    constructor = relationship("Constructor")
    __table_args__ = (UniqueConstraint("race_id", "driver_id"),)


class DriverStanding(Base):
    __tablename__ = "driver_standings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(Integer, nullable=False)
    round = Column(Integer, nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    constructor_id = Column(Integer, ForeignKey("constructors.id"))
    position = Column(Integer, nullable=False)
    points = Column(Float, nullable=False)
    wins = Column(Integer, default=0)
    driver = relationship("Driver")
    constructor = relationship("Constructor")
    __table_args__ = (UniqueConstraint("year", "round", "driver_id"),)


class ConstructorStanding(Base):
    __tablename__ = "constructor_standings"
    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(Integer, nullable=False)
    round = Column(Integer, nullable=False)
    constructor_id = Column(Integer, ForeignKey("constructors.id"), nullable=False)
    position = Column(Integer, nullable=False)
    points = Column(Float, nullable=False)
    wins = Column(Integer, default=0)
    constructor = relationship("Constructor")
    __table_args__ = (UniqueConstraint("year", "round", "constructor_id"),)


class PitStop(Base):
    __tablename__ = "pit_stops"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    stop_number = Column(Integer)
    lap = Column(Integer)
    time_of_day = Column(String(20))
    duration = Column(String(20))
    # OpenF1-enriched fields (2024 US GP onward)
    duration_seconds = Column(Float)       # parsed float of duration
    stop_duration_seconds = Column(Float)  # stationary time only (OpenF1 2024+)
    race = relationship("Race", back_populates="pit_stops")
    driver = relationship("Driver")
    __table_args__ = (UniqueConstraint("race_id", "driver_id", "stop_number"),)


class LapTime(Base):
    """Per-lap times from Jolpica (1996+).
    Race lap times only — not qualifying/sprint laps."""
    __tablename__ = "lap_times"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    lap_number = Column(Integer, nullable=False)
    lap_time = Column(String(20))          # e.g. "1:23.456"
    position = Column(Integer)             # track position at end of lap
    race = relationship("Race", back_populates="lap_times")
    driver = relationship("Driver")
    __table_args__ = (UniqueConstraint("race_id", "driver_id", "lap_number"),)


class Stint(Base):
    """Tire stint data. Source: FastF1 (2018+) or OpenF1 (2023+).
    One row per stint per driver per session."""
    __tablename__ = "stints"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    session_type = Column(String(30), nullable=False)   # Race, Qualifying, Sprint, FP1, etc.
    stint_number = Column(Integer, nullable=False)
    compound = Column(String(20))          # SOFT, MEDIUM, HARD, INTERMEDIATE, WET
    lap_start = Column(Integer)
    lap_end = Column(Integer)
    tyre_age_at_start = Column(Integer)    # laps already on this set when stint began
    fresh_tyre = Column(Boolean)
    source = Column(String(20))            # 'fastf1' or 'openf1'
    race = relationship("Race", back_populates="stints")
    driver = relationship("Driver")
    __table_args__ = (UniqueConstraint("race_id", "driver_id", "session_type", "stint_number"),)


class FastF1Lap(Base):
    """Per-lap enriched data from FastF1 (2018+).
    Includes sector times, speeds, compound, position, accuracy flags."""
    __tablename__ = "fastf1_laps"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=False)
    session_type = Column(String(30), nullable=False)   # Race, Qualifying, Sprint, FP1, etc.
    lap_number = Column(Integer, nullable=False)
    lap_time_ms = Column(Integer)          # lap time in milliseconds
    sector1_ms = Column(Integer)
    sector2_ms = Column(Integer)
    sector3_ms = Column(Integer)
    compound = Column(String(20))
    tyre_life = Column(Integer)            # laps on this tyre at the END of the lap
    is_pit_out = Column(Boolean)
    is_pit_in = Column(Boolean)
    stint_number = Column(Integer)
    speed_i1 = Column(Float)              # speed trap at intermediate 1 (km/h)
    speed_i2 = Column(Float)              # speed trap at intermediate 2
    speed_fl = Column(Float)              # finish line speed
    speed_st = Column(Float)              # speed trap (main straight)
    track_status = Column(String(10))      # '1'=green, '2'=yellow, '4'=SC, '5'=red, etc.
    position = Column(Integer)             # race position at end of lap
    is_accurate = Column(Boolean)          # FastF1 accuracy flag
    deleted = Column(Boolean)             # lap deleted (track limits)
    is_personal_best = Column(Boolean)
    race = relationship("Race", back_populates="fastf1_laps")
    driver = relationship("Driver")
    __table_args__ = (UniqueConstraint("race_id", "driver_id", "session_type", "lap_number"),)


class SessionWeather(Base):
    """Weather samples per session from FastF1 (2018+) or OpenF1 (2023+).
    Sampled roughly every 60 seconds during a session."""
    __tablename__ = "session_weather"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=False)
    session_type = Column(String(30), nullable=False)
    timestamp_s = Column(Float)            # seconds since session start
    air_temp = Column(Float)               # °C
    track_temp = Column(Float)             # °C
    humidity = Column(Float)               # %
    pressure = Column(Float)               # mbar
    rainfall = Column(Boolean)
    wind_direction = Column(Integer)       # degrees, 0=North
    wind_speed = Column(Float)             # m/s
    source = Column(String(20))            # 'fastf1' or 'openf1'
    race = relationship("Race", back_populates="weather_samples")
    __table_args__ = (UniqueConstraint("race_id", "session_type", "timestamp_s"),)


class RaceControlMessage(Base):
    """Race control messages (flags, safety cars, DRS, penalties) from FastF1 (2018+) or OpenF1 (2023+)."""
    __tablename__ = "race_control_messages"
    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(Integer, ForeignKey("races.id"), nullable=False)
    session_type = Column(String(30), nullable=False)
    timestamp_s = Column(Float)            # seconds since session start
    category = Column(String(50))          # Flag, SafetyCar, Drs, Other
    flag = Column(String(30))             # GREEN, YELLOW, RED, CHEQUERED, SC, VSC
    message = Column(Text)
    driver_id = Column(Integer, ForeignKey("drivers.id"), nullable=True)  # if driver-specific
    scope = Column(String(30))             # Track, Sector, Driver
    sector = Column(Integer)               # sector number if scope=Sector
    lap_number = Column(Integer)
    source = Column(String(20))            # 'fastf1' or 'openf1'
    race = relationship("Race", back_populates="race_control_messages")
    driver = relationship("Driver")


class LiveTimingSnapshot(Base):
    __tablename__ = "live_timing_snapshots"
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_key = Column(Integer, nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    data = Column(JSON)


class NewsArticle(Base):
    __tablename__ = "news_articles"
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(500), nullable=False)
    url = Column(String(1000), unique=True, nullable=False)
    summary = Column(Text)
    source = Column(String(100))
    image_url = Column(String(1000))
    published = Column(DateTime)
    fetched_at = Column(DateTime, default=datetime.utcnow)
    category = Column(String(50))


class PredictionResult(Base):
    __tablename__ = "prediction_results"
    id = Column(Integer, primary_key=True, autoincrement=True)
    year = Column(Integer, nullable=False)
    round = Column(Integer, nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"))
    predicted_podium_prob = Column(Float)
    predicted_win_prob = Column(Float)
    actual_position = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    driver = relationship("Driver")
    __table_args__ = (UniqueConstraint("year", "round", "driver_id"),)


class SyncStatus(Base):
    """Tracks which data has been downloaded to enable resumable sync.

    sync_type values:
      'jolpica_year'      — Phase 1 bulk year sync (year=YYYY, round=0)
      'lap_times_round'   — Phase 2 per-round lap times (year=YYYY, round=N)
      'fastf1_session'    — Phase 3 FastF1 session (year=YYYY, round=N, notes=session_type)
      'openf1_year'       — Phase 4 OpenF1 year enrichment (year=YYYY, round=0)
    Legacy:
      'season'            — Original round-by-round sync (year=YYYY, round=0)
      'round'             — Round-level sync (year=YYYY, round=N)
    """
    __tablename__ = "sync_status"
    id = Column(Integer, primary_key=True, autoincrement=True)
    sync_type = Column(String(50), nullable=False)
    year = Column(Integer)
    round = Column(Integer)
    notes = Column(String(200))            # e.g. session_type for fastf1_session
    last_synced = Column(DateTime, default=datetime.utcnow)
    status = Column(String(20), default="completed")
    rows_written = Column(Integer, default=0)
    __table_args__ = (UniqueConstraint("sync_type", "year", "round", "notes"),)
