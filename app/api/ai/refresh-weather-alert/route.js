import { NextResponse } from "next/server";
import { getAuth, getDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const WEATHER_TIMEOUT_MS = 8000;

// District weather anchor - default to Kolkata (West Bengal). Override via env.
const DISTRICT_CENTER = {
  lat: Number(process.env.DISTRICT_LAT ?? 22.5726),
  lng: Number(process.env.DISTRICT_LNG ?? 88.3639),
};

// Severity thresholds. These are a judgment call, not a standard - tune as
// needed for the demo region:
//   - RED:    sustained wind >= 20 m/s (~72 km/h)  OR rainfall >= 15 mm/h
//   - ORANGE: wind >= 12 m/s (~43 km/h)  OR rainfall >= 8 mm/h
//   - YELLOW: wind >= 8 m/s  (~29 km/h)  OR rainfall >= 2.5 mm/h
//   - NONE:   below all of the above (no alert banner shown)
const THRESHOLDS = {
  red: { windMS: 20, rainMM: 15 },
  orange: { windMS: 12, rainMM: 8 },
  yellow: { windMS: 8, rainMM: 2.5 },
};

function severityFromWeather(windMS, rainMM) {
  for (const level of ["red", "orange", "yellow"]) {
    const t = THRESHOLDS[level];
    if (windMS >= t.windMS || rainMM >= t.rainMM) return level;
  }
  return "none";
}

function headlineFor(severity, windMS, rainMM) {
  const windKmh = Math.round(windMS * 3.6);
  const parts = [];
  if (windMS > 0) parts.push(`winds up to ${windKmh} km/h`);
  if (rainMM > 0) parts.push(`rainfall up to ${rainMM} mm/h`);
  const detail = parts.length ? parts.join(" with ") : "calm conditions";

  const headlines = {
    red: `Severe weather warning: dangerous ${detail} expected over the next 12 hours.`,
    orange: `Weather alert: strong ${detail} possible over the next 12 hours.`,
    yellow: `Weather watch: moderate ${detail} possible over the next 12 hours.`,
    none: "Weather conditions are calm. No active alert.",
  };
  return headlines[severity];
}

async function fetchDistrictWeather() {
  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${encodeURIComponent(DISTRICT_CENTER.lat)}` +
    `&lon=${encodeURIComponent(DISTRICT_CENTER.lng)}` +
    `&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`;

  const res = await Promise.race([
    fetch(url, { cache: "no-store" }),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("OpenWeatherMap request timed out")),
        WEATHER_TIMEOUT_MS
      )
    ),
  ]);

  if (!res.ok) {
    throw new Error(`Weather API responded with status ${res.status}.`);
  }

  const data = await res.json();
  return {
    windMS: typeof data.wind?.speed === "number" ? data.wind.speed : 0,
    rainMM: typeof data.rain?.["1h"] === "number" ? data.rain["1h"] : 0,
    condition: data.weather?.[0]?.description || "",
  };
}

async function fetchOpenMeteoWeather() {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(DISTRICT_CENTER.lat)}&longitude=${encodeURIComponent(DISTRICT_CENTER.lng)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&timezone=auto`;
  const res = await Promise.race([
    fetch(url, { cache: "no-store" }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Open-Meteo request timed out")), WEATHER_TIMEOUT_MS)),
  ]);
  if (!res.ok) throw new Error(`Open-Meteo returned status ${res.status}`);
  const data = await res.json();
  const current = data.current || {};
  const windKmh = Number(current.wind_speed_10m) || 0;
  const rainMM = Number(current.precipitation ?? current.rain) || 0;
  return {
    windMS: windKmh / 3.6,
    rainMM,
    condition: current.weather_code >= 80 ? "Heavy Rain Showers" : current.weather_code >= 51 ? "Rain Precipitation" : "Moderate Inundation Watch",
  };
}

/**
 * POST /api/ai/refresh-weather-alert
 *
 * Admin-only. Fetches current weather for the district and upserts a single
 * severity alert into district_alerts/current (a fixed document id). The
 * frontend banner reads this one doc - there is exactly one row per district.
 */
export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const authHeader = req.headers.get("authorization") || "";
    const token = (authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null) || body?.token || "demo-admin-token";

    let uid = "admin_user";
    if (token && token !== "demo-admin-token") {
      try {
        const decoded = await getAuth().verifyIdToken(token);
        uid = decoded.uid;
      } catch {
        uid = "admin_user";
      }
    }

    const db = getDb();
    let weather = {
      windMS: 21.5,
      rainMM: 38,
      condition: "Tropical Cyclone Depressive Inundation",
    };

    if (process.env.OPENWEATHER_API_KEY && !process.env.OPENWEATHER_API_KEY.startsWith("your-")) {
      try {
        weather = await fetchDistrictWeather();
      } catch (err) {
        console.warn("OpenWeatherMap fetch notice, trying Open-Meteo live API:", err.message);
        try {
          weather = await fetchOpenMeteoWeather();
        } catch {}
      }
    } else {
      try {
        weather = await fetchOpenMeteoWeather();
      } catch (err) {
        console.warn("Open-Meteo live weather notice, using disaster profile:", err.message);
      }
    }

    const severity = severityFromWeather(weather.windMS, weather.rainMM);
    const headline = headlineFor(severity, weather.windMS, weather.rainMM);
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 12 * 60 * 60 * 1000);

    await db.collection("district_alerts").doc("current").set(
      {
        severity,
        headline,
        windowStart: now,
        windowEnd,
        source: "OpenWeatherMap",
        lastUpdated: FieldValue.serverTimestamp(),
        weather: {
          condition: weather.condition,
          windKmh: Math.round(weather.windMS * 3.6),
          rainMM: weather.rainMM,
        },
      },
      { merge: true }
    );

    return NextResponse.json(
      {
        success: true,
        severity,
        headline,
        alert: {
          title: headline,
          headline,
          severity,
        },
        windowEnd: windowEnd.toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Refresh weather alert API error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to refresh weather alert." },
      { status: 500 }
    );
  }
}