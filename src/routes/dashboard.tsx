import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CloudSun, Droplets, Loader2, MapPin, RefreshCw, Wind } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { SectionHeader } from "@/components/SectionHeader";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Goa Live Weather & Air Quality — EcoExplore" },
      { name: "description", content: "Live regional weather and air-quality readings from towns across Goa." },
    ],
  }),
  component: Dashboard,
});

type WeatherResponse = {
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
  };
};

type AirQualityResponse = {
  current: {
    time: string;
    us_aqi: number;
    pm2_5: number;
  };
};

type GoaLocation = {
  name: string;
  region: string;
  latitude: string;
  longitude: string;
};

type PlaceReading = {
  location: GoaLocation;
  weather: WeatherResponse;
  air: AirQualityResponse;
};

type DashboardData = {
  places: PlaceReading[];
  hourly: { time: string; temperature: number; rain: number }[];
  updatedAt: string;
  average: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    precipitation: number;
    aqi: number;
    pm2_5: number;
  };
};

const goaLocations: GoaLocation[] = [
  { name: "Mapusa", region: "North Goa", latitude: "15.5937", longitude: "73.8141" },
  { name: "Panjim", region: "Central Goa", latitude: "15.4909", longitude: "73.8278" },
  { name: "Vasco da Gama", region: "Central Goa", latitude: "15.3991", longitude: "73.8110" },
  { name: "Margao", region: "South Goa", latitude: "15.2993", longitude: "74.1240" },
  { name: "Canacona", region: "South Goa", latitude: "14.9951", longitude: "74.0500" },
];

const weatherDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

function aqiDescription(aqi: number) {
  if (aqi <= 50) return { label: "Good", tone: "text-eco bg-eco/10" };
  if (aqi <= 100) return { label: "Moderate", tone: "text-foreground bg-sun/15" };
  if (aqi <= 150) return { label: "Unhealthy for sensitive groups", tone: "text-coral bg-coral/10" };
  if (aqi <= 200) return { label: "Unhealthy", tone: "text-coral bg-coral/10" };
  if (aqi <= 300) return { label: "Very unhealthy", tone: "text-destructive bg-destructive/10" };
  return { label: "Hazardous", tone: "text-destructive bg-destructive/10" };
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Data service returned ${response.status}. Please try again.`);
  }
  return response.json() as Promise<T>;
}

function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const latitude = goaLocations.map((location) => location.latitude).join(",");
    const longitude = goaLocations.map((location) => location.longitude).join(",");
    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.search = new URLSearchParams({
      latitude,
      longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
      hourly: "temperature_2m,precipitation_probability",
      forecast_days: "1",
      timezone: "Asia/Kolkata",
    }).toString();

    const airUrl = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    airUrl.search = new URLSearchParams({
      latitude,
      longitude,
      current: "us_aqi,pm2_5",
      timezone: "Asia/Kolkata",
    }).toString();

    Promise.all([
      fetchJson<WeatherResponse[]>(weatherUrl.toString(), controller.signal),
      fetchJson<AirQualityResponse[]>(airUrl.toString(), controller.signal),
    ])
      .then(([weather, air]) => {
        if (weather.length !== goaLocations.length || air.length !== goaLocations.length) {
          throw new Error("Some Goa location readings are unavailable. Please try again.");
        }
        const places = goaLocations.map((location, index) => {
          const weatherReading = weather[index];
          const airReading = air[index];
          if (!Number.isFinite(weatherReading?.current?.temperature_2m) || !Number.isFinite(airReading?.current?.us_aqi)) {
            throw new Error(`The data service returned an incomplete reading for ${location.name}.`);
          }
          return { location, weather: weatherReading, air: airReading };
        });

        const averageOf = (values: number[]) =>
          values.reduce((total, value) => total + value, 0) / values.length;
        const { time, temperature_2m, precipitation_probability } = places[0].weather.hourly;
        const currentIndex = Math.max(0, time.findIndex((hour) => hour >= places[0].weather.current.time));
        const hourly = time.slice(currentIndex, currentIndex + 12).map((hour, offset) => ({
          time: hour.slice(11, 16),
          temperature: Number(averageOf(places.map((place) => place.weather.hourly.temperature_2m[currentIndex + offset]).filter(Number.isFinite)).toFixed(1)),
          rain: Math.round(averageOf(places.map((place) => place.weather.hourly.precipitation_probability[currentIndex + offset]).filter(Number.isFinite))),
        }));
        const [hour, minute] = places[0].weather.current.time.slice(11, 16).split(":").map(Number);

        setData({
          places,
          hourly,
          updatedAt: `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`,
          average: {
            temperature: averageOf(places.map((place) => place.weather.current.temperature_2m)),
            feelsLike: averageOf(places.map((place) => place.weather.current.apparent_temperature)),
            humidity: averageOf(places.map((place) => place.weather.current.relative_humidity_2m)),
            precipitation: averageOf(places.map((place) => place.weather.current.precipitation)),
            aqi: averageOf(places.map((place) => place.air.current.us_aqi)),
            pm2_5: averageOf(places.map((place) => place.air.current.pm2_5)),
          },
        });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Could not load live conditions.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refreshKey]);

  const airStatus = data ? aqiDescription(data.average.aqi) : null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          eyebrow="Live conditions · North, Central & South Goa"
          title="Goa, right now."
          subtitle="Weather and air quality across five towns, with regional averages and local readings."
        />
        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-accent disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </button>
      </div>

      <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="size-4 text-primary" />
        <span>Goa regional average · {goaLocations.length} locations</span>
        {data?.updatedAt && <span>· Updated {data.updatedAt} IST</span>}
      </div>

      {error && (
        <div role="alert" className="mt-6 flex flex-col gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-destructive">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            <RefreshCw className="size-4" /> Try again
          </button>
        </div>
      )}

      {loading && !data ? (
        <div className="mt-8 grid min-h-56 place-items-center rounded-3xl border border-border/60 bg-card">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-primary" /> Loading current conditions…
          </div>
        </div>
      ) : data ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <WeatherCard icon={CloudSun} label="Average temperature" value={`${data.average.temperature.toFixed(1)}°`} detail="Across five towns in Goa" />
            <WeatherCard
              icon={Wind}
              label="Average feels like"
              value={`${data.average.feelsLike.toFixed(1)}°`}
              detail={`Mean wind ${Math.round(data.places.reduce((sum, place) => sum + place.weather.current.wind_speed_10m, 0) / data.places.length)} km/h`}
            />
            <WeatherCard
              icon={Droplets}
              label="Average humidity"
              value={`${Math.round(data.average.humidity)}%`}
              detail={`${data.average.precipitation.toFixed(1)} mm average current precipitation`}
            />
            <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Wind className="size-4 text-primary" /> Air quality (US AQI)
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-4xl tabular-nums">{Math.round(data.average.aqi)}</span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${airStatus?.tone}`}>{airStatus?.label}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Regional PM2.5 average · {data.average.pm2_5.toFixed(1)} μg/m³</p>
            </div>
          </div>

          <section className="mt-6 rounded-3xl border border-border/60 bg-card p-5 shadow-soft sm:p-7">
            <div className="mb-5">
              <h2 className="font-display text-2xl">Goa forecast · next 12 hours</h2>
              <p className="mt-1 text-sm text-muted-foreground">Average temperature and rain chance across the selected locations.</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.hourly} margin={{ left: -18, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="temperatureFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.46 0.11 190)" stopOpacity={0.28} />
                      <stop offset="100%" stopColor="oklch(0.46 0.11 190)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="oklch(0.5 0.025 200 / 0.15)" vertical={false} />
                  <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "currentColor" }} minTickGap={24} />
                  <YAxis
                    yAxisId="temperature"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "currentColor" }}
                    domain={["dataMin - 2", "dataMax + 2"]}
                    unit="°"
                  />
                  <YAxis yAxisId="rain" orientation="right" hide domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.9 0.02 180)" }}
                    formatter={(value, name) => [
                      name === "temperature" ? `${value}°C` : `${value}%`,
                      name === "temperature" ? "Temperature" : "Rain chance",
                    ]}
                  />
                  <Area yAxisId="temperature" type="monotone" dataKey="temperature" stroke="oklch(0.46 0.11 190)" strokeWidth={2.5} fill="url(#temperatureFill)" />
                  <Area yAxisId="rain" type="monotone" dataKey="rain" stroke="oklch(0.72 0.18 35)" strokeWidth={2} fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-primary" /> Temperature</span>
              <span className="inline-flex items-center gap-2"><span className="size-2 rounded-full bg-coral" /> Rain chance</span>
            </div>
          </section>

          <section className="mt-6">
            <div className="mb-4">
              <h2 className="font-display text-2xl">Local conditions</h2>
              <p className="mt-1 text-sm text-muted-foreground">Live model readings for towns across North, Central, and South Goa.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.places.map((place) => {
                const localAir = aqiDescription(place.air.current.us_aqi);
                return (
                  <article key={place.location.name} className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-xl">{place.location.name}</h3>
                        <p className="text-xs text-muted-foreground">{place.location.region}</p>
                      </div>
                      <MapPin className="size-4 text-primary" />
                    </div>
                    <div className="mt-5 flex items-end justify-between gap-3">
                      <div>
                        <div className="font-display text-4xl tabular-nums">{Math.round(place.weather.current.temperature_2m)}°</div>
                        <p className="mt-1 text-sm text-muted-foreground">{weatherDescriptions[place.weather.current.weather_code] ?? "Current conditions"}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${localAir.tone}`}>{localAir.label}</span>
                        <p className="mt-1 text-xs text-muted-foreground">AQI {Math.round(place.air.current.us_aqi)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      <span>Feels {Math.round(place.weather.current.apparent_temperature)}°</span>
                      <span>Humidity {Math.round(place.weather.current.relative_humidity_2m)}%</span>
                      <span>Wind {Math.round(place.weather.current.wind_speed_10m)} km/h</span>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      <p className="mt-5 text-xs text-muted-foreground">
        Regional weather and air-quality estimates for Mapusa, Panjim, Vasco da Gama, Margao, and Canacona. Data provided by{" "}
        <a href="https://open-meteo.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
          Open-Meteo
        </a>
        . Regional averages are computed from these five representative locations; values are model-based estimates, not live station measurements.
      </p>
    </div>
  );
}

function WeatherCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof CloudSun;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 text-primary" /> {label}
      </div>
      <div className="mt-3 font-display text-4xl tabular-nums">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
