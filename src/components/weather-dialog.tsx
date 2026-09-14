import { useEffect, useState } from "react";
import {
  Cloud,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  MapPin,
  RefreshCw,
  Sun,
  Wind,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { IconTooltip } from "./ui/icon-tooltip";
import { LoadingSkeleton, Skeleton } from "./ui/skeleton";

type Conditions = Record<string, number | null> & { time?: never };
type Report = { current: Conditions; time: string };
type Place = { name: string; admin1?: string };
const numberText = (value: number | null | undefined, unit = "") =>
  typeof value === "number" && Number.isFinite(value)
    ? `${Math.round(value * 10) / 10}${unit}`
    : "—";

function weatherLabel(code: number | null | undefined) {
  if (code === 0) return { label: "맑음", Icon: Sun };
  if (code === 1 || code === 2) return { label: "구름 조금", Icon: CloudSun };
  if (code === 3) return { label: "흐림", Icon: Cloud };
  if (code === 45 || code === 48) return { label: "안개", Icon: Cloud };
  if (code != null && [71, 73, 75, 77, 85, 86].includes(code))
    return { label: "눈", Icon: CloudSnow };
  if (code != null && [95, 96, 99].includes(code))
    return { label: "뇌우", Icon: CloudRain };
  if (
    code != null &&
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)
  )
    return { label: "비", Icon: CloudRain };
  return { label: "날씨 정보", Icon: CloudSun };
}

async function report(url: string, signal: AbortSignal): Promise<Report> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error("Weather service unavailable");
  const data = await response.json();
  if (!data.current || typeof data.current.time !== "string")
    throw new Error("Missing weather data");
  const { time, ...values } = data.current;
  return { current: values, time };
}

async function reverseGeocode(
  latitude: string,
  longitude: string,
  signal: AbortSignal,
): Promise<Place> {
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=ko`,
    { signal },
  );
  if (!response.ok) throw new Error("Location service unavailable");
  const data = await response.json();
  const name = data.city || data.locality || data.principalSubdivision;
  if (!name || typeof name !== "string")
    throw new Error("Missing location data");
  return { name, admin1: typeof data.principalSubdivision === "string" && data.principalSubdivision !== name ? data.principalSubdivision : undefined };
}

export function WeatherDialog() {
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [weather, setWeather] = useState<Report | null>(null);
  const [air, setAir] = useState<Report | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  useEffect(() => {
    if (!open) return;
    let active = true;
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout>;
    setLoading(true);
    setError("");
    setWeather(null);
    setAir(null);
    setPlace(null);
    async function load() {
      try {
        if (!navigator.geolocation)
          throw new Error("이 브라우저에서는 위치를 확인할 수 없습니다.");
        const location = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              (cause) =>
                reject(
                  new Error(
                    cause.code === 1
                      ? "위치 권한이 꺼져 있습니다. 브라우저의 사이트 설정에서 위치를 허용한 뒤 다시 시도해 주세요."
                      : cause.code === 3
                        ? "위치 확인이 지연되고 있습니다. 잠시 후 다시 시도해 주세요."
                        : "현재 위치를 확인하지 못했습니다. 위치 설정을 확인해 주세요.",
                  ),
                ),
              { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
            );
          },
        );
        if (!active) return;
        const params = new URLSearchParams({
          latitude: location.coords.latitude.toFixed(2),
          longitude: location.coords.longitude.toFixed(2),
          timezone: "auto",
        });
        timeout = setTimeout(() => controller.abort(), 15000);
        const results = await Promise.allSettled([
          report(
            `https://api.open-meteo.com/v1/forecast?${params}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&wind_speed_unit=ms&forecast_days=1`,
            controller.signal,
          ),
          report(
            `https://air-quality-api.open-meteo.com/v1/air-quality?${params}&current=pm10,pm2_5,us_aqi`,
            controller.signal,
          ),
          reverseGeocode(
            params.get("latitude") ?? "",
            params.get("longitude") ?? "",
            controller.signal,
          ),
        ]);
        if (!active) return;
        setWeather(results[0].status === "fulfilled" ? results[0].value : null);
        setAir(results[1].status === "fulfilled" ? results[1].value : null);
        setPlace(results[2].status === "fulfilled" ? results[2].value : null);
        if (
          results[0].status === "rejected" &&
          results[1].status === "rejected"
        )
          setError(
            "날씨 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
          );
      } catch (cause) {
        if (active)
          setError(
            cause instanceof Error
              ? cause.message
              : "날씨 정보를 불러오지 못했습니다.",
          );
      } finally {
        clearTimeout(timeout);
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [open, retry]);
  const { label, Icon } = weatherLabel(weather?.current.weather_code);
  const aqi = air?.current.us_aqi;
  const airStatus =
    typeof aqi !== "number"
      ? "⚪ 정보 없음"
      : aqi <= 50
        ? "🟢 좋음"
        : aqi <= 100
          ? "🟡 보통"
          : aqi <= 150
            ? "🟠 민감군 주의"
            : aqi <= 200
              ? "🔴 나쁨"
              : aqi <= 300
                ? "🟣 매우 나쁨"
                : "⚫ 위험";
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <IconTooltip label="날씨">
      <DialogTrigger asChild>
        <button
          type="button"
          className="memo-launcher"
          aria-label="현재 위치 날씨"
        >
          <CloudSun size={19} />
        </button>
      </DialogTrigger>
      </IconTooltip>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>오늘의 날씨</DialogTitle>
          <DialogDescription className="flex items-center justify-center sm:justify-start gap-1.5">
            <MapPin size={13} />
            {place
              ? `${place.admin1 ? `${place.admin1} · ` : ""}${place.name}`
              : loading ? "도시 확인 중…" : "도시명을 확인하지 못했습니다"}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <LoadingSkeleton label="현재 위치와 날씨" className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
            <Skeleton className="h-32 w-full mt-4" />
          </LoadingSkeleton>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-muted p-6 text-sm leading-7">
            {error}
          </p>
        ) : (
          <>
            {weather ? (
              <>
                <div className="flex items-center justify-between rounded-xl bg-[#edf2f8] p-6">
                  <div>
                    <p className="text-4xl font-semibold tracking-tight text-[#17283f]">
                      {numberText(weather.current.temperature_2m, "°")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5 text-[#627da0]">
                    <Icon size={36} strokeWidth={1.5} aria-hidden="true" />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    {
                      title: "습도",
                      value: numberText(
                        weather.current.relative_humidity_2m,
                        "%",
                      ),
                      Icon: Droplets,
                    },
                    {
                      title: "바람",
                      value: numberText(weather.current.wind_speed_10m, " m/s"),
                      Icon: Wind,
                    },
                    {
                      title: "강수량",
                      value: numberText(weather.current.precipitation, " mm"),
                      Icon: CloudRain,
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-lg border p-3">
                      <item.Icon
                        size={16}
                        className="mx-auto mb-2 text-muted-foreground"
                      />
                      <p className="text-xs text-muted-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm font-semibold">{item.value}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p role="status" className="rounded-lg bg-muted p-4 text-sm">
                날씨를 불러오지 못했습니다. 다시 조회해 주세요.
              </p>
            )}
            <section className="rounded-xl border p-5" aria-label="미세먼지">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold">공기 상태</h2>
                <span className="rounded-md bg-muted px-2 py-1 text-xs">
                  {air ? airStatus : "⚪ 조회 실패"}
                </span>
              </div>
              {!air && (
                <p className="mt-3 text-xs text-muted-foreground">
                  미세먼지 정보를 불러오지 못했습니다. 다시 조회해 주세요.
                </p>
              )}
            </section>
          </>
        )}
        <div className="flex items-center justify-between gap-3 border-t pt-4">
          <p className="text-[10px] leading-5 text-muted-foreground">
            <a
              href="https://open-meteo.com/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Open-Meteo
            </a>{" "}
            ·{" "}
            <a
              href="https://atmosphere.copernicus.eu/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              CAMS
            </a>
            {" · "}<a href="https://www.bigdatacloud.com/" target="_blank" rel="noreferrer" className="underline underline-offset-2">BigDataCloud</a>
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => setRetry((value) => value + 1)}
          >
            <RefreshCw size={14} />
            새로고침
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
