import { NextResponse } from "next/server";
import { queryOpenRouter } from "@/lib/openrouter";
import { getDb } from "@/lib/firebase-admin";

const CATEGORIES = ["medical", "trapped", "food-water", "other"];
const URGENCY_LEVELS = ["low", "medium", "high"];

const SYSTEM_PROMPT = `You triage SOS messages from a disaster-relief app.
Classify the message and respond with ONLY a JSON object with exactly these fields:
- category: one of ${CATEGORIES.join(", ")}
- urgencyLevel: one of ${URGENCY_LEVELS.join(", ")}
Base urgency on life-safety factors (medical emergencies, being trapped, children/elderly involved, flood water rising). Respond with valid JSON only. No markdown fences, no preamble.`;

function sanitize(value, allowed, fallback) {
  if (allowed.includes(value)) return value;
  return fallback;
}

function mapUrgency(value) {
  const v = String(value ?? "").trim().toLowerCase();
  if (URGENCY_LEVELS.includes(v)) return v;
  if (["critical", "severe", "emergency", "urgent", "extreme", "danger"].includes(v)) {
    return "high";
  }
  if (["low", "minor", "routine", "info", "none"].includes(v)) return "low";
  return "medium";
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { alertId, message, sosList } = body || {};

  // Handle bulk sosList array (e.g. from Admin SOS Dashboard)
  if (Array.isArray(sosList)) {
    const triaged = sosList.map((item, idx) => {
      const msg = (item.message || item.text || item.description || "").toLowerCase();
      let cat = "other";
      let urg = "medium";
      if (msg.includes("medical") || msg.includes("doctor") || msg.includes("blood") || msg.includes("heart") || msg.includes("insulin") || msg.includes("injured")) {
        cat = "medical";
        urg = "high";
      } else if (msg.includes("trap") || msg.includes("roof") || msg.includes("water") || msg.includes("flood") || msg.includes("submerged") || msg.includes("infant")) {
        cat = "trapped";
        urg = "high";
      } else if (msg.includes("food") || msg.includes("water") || msg.includes("ration") || msg.includes("hungry")) {
        cat = "food-water";
        urg = "medium";
      }
      return {
        id: item.id || `sos-${idx}`,
        alertId: item.id || `sos-${idx}`,
        category: cat,
        urgencyLevel: urg,
        priorityLevel: urg === "high" ? "P1-CRITICAL" : "P2-HIGH",
      };
    });
    return NextResponse.json({
      success: true,
      triaged,
      results: triaged,
    });
  }

  if (!alertId && !message) {
    return NextResponse.json(
      { error: "alertId, message, or sosList is required." },
      { status: 400 }
    );
  }

  let category = "other";
  let urgencyLevel = "medium";

  // If text note provided, query OpenRouter for smart triage
  if (message && typeof message === "string" && message.trim().length > 0) {
    try {
      const parsed = await queryOpenRouter({
        prompt: `SOS Emergency Message: "${message}". Triage category and urgency.`,
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.1,
        responseFormatJson: true,
      });

      const rawCategory =
        typeof parsed.category === "string" ? parsed.category.trim().toLowerCase() : "";
      const rawUrgency =
        typeof parsed.urgencyLevel === "string"
          ? parsed.urgencyLevel.trim()
          : typeof parsed.urgency === "string"
            ? parsed.urgency.trim()
            : "";
      category = sanitize(rawCategory, CATEGORIES, "other");
      urgencyLevel = mapUrgency(rawUrgency);
    } catch (err) {
      console.warn("OpenRouter triage error, using heuristics:", err.message);
      // Fallback heuristics
      const lower = message.toLowerCase();
      if (lower.includes("medical") || lower.includes("doctor") || lower.includes("blood") || lower.includes("heart") || lower.includes("injured")) {
        category = "medical";
        urgencyLevel = "high";
      } else if (lower.includes("trap") || lower.includes("roof") || lower.includes("water rising") || lower.includes("submerged")) {
        category = "trapped";
        urgencyLevel = "high";
      } else if (lower.includes("food") || lower.includes("water") || lower.includes("ration") || lower.includes("hungry")) {
        category = "food-water";
        urgencyLevel = "medium";
      }
    }
  }

  const db = getDb();
  const ref = db.collection("sos_alerts").doc(alertId);
  const snap = await ref.get();
  if (snap.exists) {
    await ref.update({ category, urgencyLevel });
  }

  return NextResponse.json({ success: true, alertId, category, urgencyLevel }, { status: 200 });
}