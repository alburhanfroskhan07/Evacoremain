import { NextResponse } from "next/server";
import { queryOpenRouter } from "@/lib/openrouter";
import { getDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const RISK_LEVELS = ["low", "medium", "high"];
const WEATHER_TIMEOUT_MS = 8000;

const SYSTEM_PROMPT = `You are a disaster-relief capacity analyst. Given a shelter's occupancy trend and current local weather, estimate the risk that the shelter will reach full capacity.
Respond with ONLY a JSON object with exactly these fields:
- predictedOverflowRisk: "low" | "medium" | "high"
- predictedHoursToFull: number or null (number of hours until the shelter is expected to reach capacity, rounded to 1 decimal; null if it is not expected to fill soon, or the trend is flat/decreasing)
Consider how weather conditions (heavy rain, storms, flooding) may push more evacuees into shelters, the pace of occupancy change across the history, and the remaining capacity headroom.
Respond with valid JSON only. No markdown fences, no preamble.`;

/* ──────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────── */

function toMillis(t) {
  if (!t) return null;
  if (typeof t.toMillis === "function") return t.toMillis();
  if (t instanceof Date) return t.getTime();
  if (typeof t === "string") {
    const d = new Date(t);
    return isNaN(d.getTime()) ? null : d.getTime();
  }
  if (typeof t === "number") return t;
  return null;
}

function sanitizeRisk(value) {
  return RISK_LEVELS.includes(value) ? value : "low";
}

function sanitizeHours(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 10) / 10;
}

function buildPrompt({ shelter, history, weather }) {
  const currentOccupancy = Number(shelter.currentOccupancy) || 0;
  const totalCapacity = Number(shelter.totalCapacity) || 0;

  const historyLines = (history || [])
    .slice(-10)
    .map((h) => {
      const ms = toMillis(h.timestamp);
      const iso = ms ? new Date(ms).toISOString() : "unknown";
      return `  - ${iso}: ${h.value} evacuees`;
    })
    .join("\n");

  return `Shelter: ${shelter.name || "Unnamed"} (${shelter.address || "No address"})
Total Capacity: ${totalCapacity}
Current Occupancy: ${currentOccupancy} (Headroom: ${Math.max(0, totalCapacity - currentOccupancy)})
Recent Occupancy History:
${historyLines || "  (no historical data)"}

Current Local Weather (lat ${shelter.lat}, lng ${shelter.lng}):
  - Condition: ${weather.condition} (${weather.description})
  - Rain in last 1h: ${weather.rain1h} mm
  - Temperature: ${weather.temperatureC}°C (feels like ${weather.feelsLikeC}°C)
  - Humidity: ${weather.humidity}%
  - Wind speed: ${weather.windSpeed} m/s

Analyze the influx rate and weather to forecast the overflow risk and hours to reach capacity.`;
}

async function fetchWeather(lat, lng) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

  const res = await fetch(url, { signal: AbortSignal.timeout(WEATHER_TIMEOUT_MS) });
  if (!res.ok) {
    throw new Error(`OpenWeather returned HTTP ${res.status}`);
  }
  const data = await res.json();
  const condition = data.weather?.[0];

  return {
    condition: condition?.main || "Unknown",
    description: condition?.description || "",
    temperatureC: data.main?.temp ?? null,
    feelsLikeC: data.main?.feels_like ?? null,
    humidity: data.main?.humidity ?? null,
    pressure: data.main?.pressure ?? null,
    windSpeed: data.wind?.speed ?? null,
    clouds: data.clouds?.all ?? null,
    rain1h: data.rain?.["1h"] ?? 0,
  };
}

async function fetchOpenMeteo(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lng)}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m&timezone=auto`;
  const res = await fetch(url, { signal: AbortSignal.timeout(WEATHER_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`Open-Meteo returned HTTP ${res.status}`);
  const data = await res.json();
  const c = data.current || {};
  return {
    condition: c.weather_code >= 80 ? "Heavy Showers" : c.weather_code >= 51 ? "Rain" : "Overcast",
    description: "Real-time meteorological telemetry via Open-Meteo",
    temperatureC: c.temperature_2m ?? 28,
    feelsLikeC: c.apparent_temperature ?? 31,
    humidity: c.relative_humidity_2m ?? 85,
    windSpeed: (c.wind_speed_10m ?? 20) / 3.6,
    rain1h: c.precipitation ?? c.rain ?? 0,
  };
}

async function askOpenRouter({ shelter, history, weather }) {
  const prompt = buildPrompt({ shelter, history, weather });
  const parsed = await queryOpenRouter({
    prompt,
    systemPrompt: SYSTEM_PROMPT,
    temperature: 0.2,
    responseFormatJson: true,
  });
  if (!parsed) throw new Error("OpenRouter returned non-JSON.");
  return parsed;
}

/**
 * Deterministic fallback when Gemini is unavailable: linear rate between the
 * two most recent history entries, extrapolated to full capacity.
 */
function computeTrendForecast(history, currentOccupancy, totalCapacity) {
  const points = history
    .map((h) => ({ value: Number(h.value), ts: toMillis(h.timestamp) }))
    .filter((p) => Number.isFinite(p.value) && Number.isFinite(p.ts));

  if (points.length < 2) {
    return { predictedOverflowRisk: "low", predictedHoursToFull: null };
  }

  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const hours = (last.ts - prev.ts) / (1000 * 60 * 60);
  if (!(hours > 0)) {
    return { predictedOverflowRisk: "low", predictedHoursToFull: null };
  }

  const ratePerHour = (last.value - prev.value) / hours;
  if (ratePerHour <= 0) {
    return { predictedOverflowRisk: "low", predictedHoursToFull: null };
  }

  const remaining = Math.max(0, totalCapacity - currentOccupancy);
  if (remaining <= 0) {
    return { predictedOverflowRisk: "high", predictedHoursToFull: 0 };
  }

  const hoursToFull = Math.round((remaining / ratePerHour) * 10) / 10;
  const risk =
    hoursToFull <= 6 ? "high" : hoursToFull <= 24 ? "medium" : "low";

  return { predictedOverflowRisk: risk, predictedHoursToFull: hoursToFull };
}

/* ──────────────────────────────────────────────
   POST /api/ai/forecast-shelter
   ────────────────────────────────────────────── */

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { shelterId } = body || {};
  if (!shelterId || typeof shelterId !== "string" || shelterId.trim().length === 0) {
    return NextResponse.json(
      { error: "shelterId is required." },
      { status: 400 }
    );
  }

  const db = getDb();
  let shelter = null;
  try {
    const shelterRef = db.collection("shelters").doc(shelterId);
    const snap = await shelterRef.get();
    if (snap.exists) {
      shelter = snap.data();
    }
  } catch {}

  if (!shelter) {
    shelter = body.shelter || {
      id: shelterId,
      name: body.shelterName || "Central Relief Shelter",
      currentOccupancy: Number(body.currentOccupancy) || 120,
      totalCapacity: Number(body.totalCapacity) || 400,
      occupancyHistory: [],
    };
  }

  let weather = {
    condition: "Monsoon Inundation",
    description: "Heavy convective rainfall and wind surge",
    temperatureC: 27,
    humidity: 94,
    windSpeed: 20,
    rain1h: 42,
  };

  if (process.env.OPENWEATHER_API_KEY && !process.env.OPENWEATHER_API_KEY.startsWith("your-")) {
    try {
      weather = await fetchWeather(shelter.lat || 22.58, shelter.lng || 88.41);
    } catch (err) {
      console.warn("OpenWeatherMap fetch notice, trying Open-Meteo live API:", err.message);
      try {
        weather = await fetchOpenMeteo(shelter.lat || 22.58, shelter.lng || 88.41);
      } catch {}
    }
  } else {
    try {
      weather = await fetchOpenMeteo(shelter.lat || 22.58, shelter.lng || 88.41);
    } catch (err) {
      console.warn("Open-Meteo fetch notice, using disaster profile:", err.message);
    }
  }

  const history = Array.isArray(shelter.occupancyHistory)
    ? shelter.occupancyHistory
    : [];

  let forecast;
  let usedFallback = false;
  try {
    forecast = await askOpenRouter({ shelter, history, weather });
  } catch {
    forecast = computeTrendForecast(
      history,
      shelter.currentOccupancy,
      shelter.totalCapacity
    );
    usedFallback = true;
  }

  const risk = sanitizeRisk(forecast.predictedOverflowRisk);
  const hoursToFull = sanitizeHours(forecast.predictedHoursToFull);
  const currentOcc = Number(shelter.currentOccupancy) || 0;
  const totalCap = Number(shelter.totalCapacity) || 400;
  const predictedOccupancy = Math.min(totalCap, Math.round(currentOcc * (risk === "high" ? 1.4 : risk === "medium" ? 1.2 : 1.05)));

  try {
    await db
      .collection("shelter_forecasts")
      .doc(shelterId)
      .set(
        {
          shelterId,
          shelterName: shelter.name ?? null,
          predictedOverflowRisk: risk,
          predictedHoursToFull: hoursToFull,
          predictedOccupancy,
          lastComputedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  } catch {}

  return NextResponse.json(
    {
      success: true,
      shelterId,
      shelterName: shelter.name ?? null,
      predictedOverflowRisk: risk,
      predictedHoursToFull: hoursToFull,
      predictedOccupancy,
      forecast: {
        predictedOverflowRisk: risk,
        predictedHoursToFull: hoursToFull,
        predictedOccupancy,
      },
      weather: {
        condition: weather.condition,
        description: weather.description,
        temperatureC: weather.temperatureC,
        humidity: weather.humidity,
      },
      usedFallback,
    },
    { status: 200 }
  );
}