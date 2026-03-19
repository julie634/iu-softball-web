interface WeatherBadgeProps {
  temp: number | null;
  precipProbability: number | null;
  windSpeed: number | null;
  weatherCode: number | null;
  compact?: boolean;
}

function getWeatherInfo(code: number): { label: string; icon: string } {
  if (code === 0) return { label: "Clear", icon: "☀️" };
  if (code >= 1 && code <= 3) return { label: "Partly Cloudy", icon: "⛅" };
  if (code >= 45 && code <= 48) return { label: "Foggy", icon: "🌫️" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "🌦️" };
  if (code >= 61 && code <= 67) return { label: "Rain", icon: "🌧️" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "❄️" };
  if (code >= 80 && code <= 82) return { label: "Showers", icon: "🌧️" };
  if (code >= 85 && code <= 86) return { label: "Snow Showers", icon: "❄️" };
  if (code >= 95 && code <= 99) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Unknown", icon: "🌤️" };
}

export default function WeatherBadge({
  temp,
  precipProbability,
  windSpeed,
  weatherCode,
  compact = false,
}: WeatherBadgeProps) {
  if (temp == null || weatherCode == null) return null;

  const { label, icon } = getWeatherInfo(weatherCode);

  if (compact) {
    return (
      <div
        className="inline-flex items-center gap-1.5 text-sm bg-muted/60 rounded-lg px-2.5 py-1"
        data-testid="weather-badge-compact"
      >
        <span className="text-base leading-none">{icon}</span>
        <span className="font-semibold tabular-nums">{temp}°F</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-3 bg-muted/50 rounded-xl px-3 py-2.5 text-sm"
      data-testid="weather-badge"
    >
      <span className="text-xl leading-none">{icon}</span>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold tabular-nums">{temp}°F</span>
          <span className="text-muted-foreground text-xs">{label}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {windSpeed != null && (
            <span className="tabular-nums">💨 {windSpeed} mph</span>
          )}
          {precipProbability != null && precipProbability > 0 && (
            <span className="tabular-nums">💧 {precipProbability}%</span>
          )}
        </div>
      </div>
    </div>
  );
}
