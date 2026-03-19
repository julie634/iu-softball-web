import { useQuery } from "@tanstack/react-query";

export interface WeatherData {
  temp: number;
  precipProbability: number;
  windSpeed: number;
  weatherCode: number;
  isLoading: boolean;
}

async function fetchWeather(
  lat: number,
  lon: number,
  date: string
): Promise<Omit<WeatherData, "isLoading">> {
  const dateOnly = date.split("T")[0];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America/New_York&start_date=${dateOnly}&end_date=${dateOnly}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);

  const data = await res.json();
  const hourly = data.hourly;

  if (!hourly || !hourly.time || hourly.time.length === 0) {
    throw new Error("No hourly data returned");
  }

  // Find the hour closest to typical game time (~2-4 PM local)
  // Use index 15 (3 PM) as a reasonable default, fallback to midday
  const targetIndex = Math.min(15, hourly.time.length - 1);

  return {
    temp: Math.round(hourly.temperature_2m[targetIndex] ?? 0),
    precipProbability: hourly.precipitation_probability[targetIndex] ?? 0,
    windSpeed: Math.round(hourly.windspeed_10m[targetIndex] ?? 0),
    weatherCode: hourly.weathercode[targetIndex] ?? 0,
  };
}

export function useWeather(
  lat: number | null,
  lon: number | null,
  date: string
) {
  const now = new Date();
  const gameDate = new Date(date);
  const diffDays = (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  const withinForecastRange = lat != null && lon != null && diffDays >= -1 && diffDays <= 7;

  const query = useQuery({
    queryKey: ["weather", lat, lon, date],
    queryFn: () => fetchWeather(lat!, lon!, date),
    enabled: withinForecastRange,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  return {
    temp: query.data?.temp ?? null,
    precipProbability: query.data?.precipProbability ?? null,
    windSpeed: query.data?.windSpeed ?? null,
    weatherCode: query.data?.weatherCode ?? null,
    isLoading: query.isLoading && withinForecastRange,
  };
}
