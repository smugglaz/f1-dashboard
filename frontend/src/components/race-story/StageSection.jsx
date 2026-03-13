import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, Thermometer, Cloud, Wind } from 'lucide-react'
import StartingGrid from './StartingGrid'

export default function StageSection({ circuit, qualifying, weather, race }) {
  const circuitInfo = circuit?.circuit
  const weatherSamples = weather?.samples

  // Get first weather reading as race-start conditions
  const startWeather = weatherSamples?.[0]

  return (
    <section id="stage" className="scroll-mt-8 space-y-6">
      <div>
        <h2 className="text-title-1 font-semibold">The Stage</h2>
        <p className="text-footnote text-label-secondary mt-1">
          {race?.name || 'Grand Prix'} — {circuitInfo?.locality}, {circuitInfo?.country}
        </p>
      </div>

      {/* Circuit + Weather side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Circuit info */}
        {circuitInfo && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-label-tertiary" />
                <span className="text-headline">{circuitInfo.name || circuit?.race?.circuit?.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {circuitInfo.track_length_km && (
                  <div>
                    <span className="text-label-tertiary">Length</span>
                    <p className="font-mono font-semibold">{circuitInfo.track_length_km} km</p>
                  </div>
                )}
                {circuitInfo.num_corners && (
                  <div>
                    <span className="text-label-tertiary">Corners</span>
                    <p className="font-mono font-semibold">{circuitInfo.num_corners}</p>
                  </div>
                )}
                {circuitInfo.altitude != null && (
                  <div>
                    <span className="text-label-tertiary">Altitude</span>
                    <p className="font-mono font-semibold">{circuitInfo.altitude}m</p>
                  </div>
                )}
                {race?.has_sprint && (
                  <div>
                    <Badge variant="warning" className="text-[10px]">Sprint Weekend</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Weather at race start */}
        {startWeather && (
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Cloud className="h-4 w-4 text-label-tertiary" />
                <span className="text-headline">Race Start Conditions</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <Thermometer className="h-3 w-3 text-label-tertiary" />
                  <div>
                    <span className="text-label-tertiary">Air</span>
                    <p className="font-mono font-semibold">{startWeather.air_temp?.toFixed(1)}°C</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Thermometer className="h-3 w-3 text-orange-500" />
                  <div>
                    <span className="text-label-tertiary">Track</span>
                    <p className="font-mono font-semibold">{startWeather.track_temp?.toFixed(1)}°C</p>
                  </div>
                </div>
                {startWeather.humidity != null && (
                  <div>
                    <span className="text-label-tertiary">Humidity</span>
                    <p className="font-mono font-semibold">{startWeather.humidity?.toFixed(0)}%</p>
                  </div>
                )}
                {startWeather.wind_speed != null && (
                  <div className="flex items-center gap-1.5">
                    <Wind className="h-3 w-3 text-label-tertiary" />
                    <div>
                      <span className="text-label-tertiary">Wind</span>
                      <p className="font-mono font-semibold">{startWeather.wind_speed?.toFixed(1)} m/s</p>
                    </div>
                  </div>
                )}
              </div>
              {startWeather.rainfall > 0 && (
                <Badge variant="secondary" className="text-[10px]">Wet Track</Badge>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Starting Grid */}
      <Card>
        <CardContent className="p-5">
          <p className="text-caption-2 uppercase tracking-wider text-label-tertiary mb-4">Starting Grid</p>
          <StartingGrid qualifying={qualifying?.results || qualifying} />
        </CardContent>
      </Card>
    </section>
  )
}
