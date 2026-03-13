import { Cloud, Droplets, Wind, Thermometer, Navigation } from 'lucide-react'

function getTempColor(temp) {
  if (temp == null) return '#9CA3AF'
  const t = Number(temp)
  if (t < 15) return '#60a5fa'
  if (t > 35) return '#ef4444'
  if (t > 28) return '#f59e0b'
  return '#374151'
}

function getRainColor(rainfall) {
  if (rainfall == null) return '#9CA3AF'
  return Number(rainfall) > 0 ? '#3b82f6' : '#4ade80'
}

export default function WeatherWidget({ weather }) {
  if (!weather) return <div className="text-label-tertiary text-sm text-center py-4">No weather data</div>

  const airTemp = weather.air_temp ?? weather.air_temperature
  const trackTemp = weather.track_temp ?? weather.track_temperature
  const windDir = weather.wind_direction

  const items = [
    { icon: Thermometer, label: 'Air', value: airTemp != null ? `${Number(airTemp).toFixed(1)}°C` : '-', color: getTempColor(airTemp) },
    { icon: Thermometer, label: 'Track', value: trackTemp != null ? `${Number(trackTemp).toFixed(1)}°C` : '-', color: getTempColor(trackTemp) },
    { icon: Droplets, label: 'Humidity', value: weather.humidity != null ? `${weather.humidity}%` : '-' },
    {
      icon: Wind, label: 'Wind',
      value: weather.wind_speed != null ? `${Number(weather.wind_speed).toFixed(1)} km/h` : '-',
      extra: windDir != null ? (
        <Navigation className="w-3 h-3 inline-block ml-1" style={{ transform: `rotate(${windDir}deg)`, color: '#9CA3AF' }} title={`${windDir}°`} />
      ) : null,
    },
    { icon: Cloud, label: 'Rain', value: weather.rainfall != null ? (Number(weather.rainfall) > 0 ? 'Yes' : 'No') : '-', color: getRainColor(weather.rainfall) },
  ]

  return (
    <div className="grid grid-cols-5 gap-2">
      {items.map(({ icon: Icon, label, value, color, extra }) => (
        <div key={label} className="text-center">
          <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: color || '#9CA3AF' }} />
          <div className="text-caption">{label}</div>
          <div className="text-sm font-medium" style={color ? { color } : {}}>
            {value}{extra}
          </div>
        </div>
      ))}
    </div>
  )
}
