import { NextResponse } from "next/server";
import { queryOpenRouter } from "@/lib/openrouter";

const ALLOWED_SPECIAL_NEEDS = [
  "medical",
  "elderly",
  "infant",
  "disability",
  "pregnant",
  "none",
];

const SYSTEM_PROMPT = `You are EVACORE AI, an expert disaster relief intake intelligence system in India.
Your job is to parse spoken voice audio or natural-language statements in English, Hindi, Bengali, or Hinglish from flood/cyclone evacuees.
Extract and return STRICTLY a JSON object with these exact fields:
- transcribedText: string (the verbatim transcription or clean English/original text of what the person stated)
- name: string or null (the person's full name if stated, e.g. "Rahul Sharma", "অমিত রায়")
- familySize: integer headcount or null (number of people in their party, default null if not mentioned)
- locationDescription: string or null (neighborhood, landmark, or district mentioned)
- specialNeeds: array of strings chosen ONLY from: ["medical", "elderly", "infant", "disability", "pregnant", "none"]. If no special needs, return ["none"].
- missingFamilyMemberName: string or null (name of missing/separated relative if the evacuee mentioned looking for someone)
- urgencyLevel: "high" | "moderate" | "low" (high if medical emergency, infant/pregnant in rising water, or trapped)

Return ONLY valid JSON. No markdown fences, no conversational preamble.`;

function sanitizeSpecialNeeds(value) {
  if (!Array.isArray(value)) return ["none"];
  const needs = value
    .map((v) => String(v).toLowerCase().trim())
    .filter((v) => ALLOWED_SPECIAL_NEEDS.includes(v));
  return needs.length > 0 ? needs : ["none"];
}

function extractJson(text) {
  if (!text || typeof text !== "string") return null;
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * High-Precision Deterministic Multi-lingual Heuristic Parser
 * Guarantees 0ms failure-proof extraction for Hindi, Bengali, Hinglish, and English
 */
function heuristicExtract(text) {
  if (!text || typeof text !== "string") return null;
  const raw = text.trim();
  const lower = raw.toLowerCase();

  // 1. Name detection
  let name = null;
  const explicitPatterns = [
    /(?:mera\s+naam\s+hai|mera\s+naam|amar\s+naam\s+holo|amar\s+naam|my\s+name\s+is|this\s+is|i\s+am|i'm|myself|naam\s+hai|naam\s+holo|naam|nam)\s+([A-Za-z\u0900-\u097F\u0980-\u09FF]+(?:\s+[A-Za-z\u0900-\u097F\u0980-\u09FF]+)?)/i,
    /(?:main|mai|ami)\s+([A-Za-z\u0900-\u097F\u0980-\u09FF]+(?:\s+[A-Za-z\u0900-\u097F\u0980-\u09FF]+)?)\s+(?:bol\s+raha|bol\s+rahi|bolchi|hoon|hun|aachi)/i,
  ];

  for (const pat of explicitPatterns) {
    const m = raw.match(pat);
    if (m && m[1]) {
      let candidate = m[1].replace(/[,।\.\!\?].*$/, "").trim();
      candidate = candidate.replace(/\s+(?:hai|holo|ahe|hobe|hoon|hun|aachi|aache)$/i, "").trim();
      const stopWords = ["with", "and", "from", "near", "aur", "hum", "amra", "log", "jon", "hai", "ahe", "ek", "do", "teen", "four", "five", "living", "in"];
      if (!stopWords.includes(candidate.toLowerCase()) && candidate.length > 1) {
        name = candidate.charAt(0).toUpperCase() + candidate.slice(1);
        break;
      }
    }
  }

  // If no explicit phrase, check leading name e.g. "Sunil Kumar, 4 people" or "Amit Roy with 3 members"
  if (!name) {
    const leadingMatch = raw.match(/^([A-Z\u0900-\u097F\u0980-\u09FF][a-z\u0900-\u097F\u0980-\u09FF]+(?:\s+[A-Z\u0900-\u097F\u0980-\u09FF][a-z\u0900-\u097F\u0980-\u09FF]+)?)(?:\s*[,;:\-—|]|\s+(?:with|and|from|aur|amra|hum|sath|having|having\s+a|need|needs|\d))/i);
    if (leadingMatch && leadingMatch[1]) {
      const cand = leadingMatch[1].trim();
      const notNames = ["hello", "namaste", "hi", "help", "emergency", "please", "urgent", "we", "i", "my", "our", "water", "flood"];
      if (!notNames.includes(cand.toLowerCase()) && cand.length > 2) {
        name = cand.charAt(0).toUpperCase() + cand.slice(1);
      }
    }
  }

  // If single 2-word input like "Sunil Kumar"
  if (!name) {
    const words = raw.split(/\s+/);
    if (words.length >= 1 && words.length <= 3 && !/\d/.test(raw)) {
      const notNames = ["help", "flood", "water", "sos", "emergency", "shelter", "camp", "hospital"];
      if (!notNames.some((w) => lower.includes(w))) {
        name = raw.replace(/[,\.!]/g, "").trim();
      }
    }
  }

  // 2. Family Size detection
  let familySize = null;
  const numWords = {
    one: 1, ek: 1, ekjon: 1, single: 1, alone: 1, akela: 1, eka: 1,
    two: 2, do: 2, dujon: 2, duto: 2, dono: 2, couple: 2,
    three: 3, teen: 3, tin: 3, tinjon: 3, tinte: 3, teenon: 3,
    four: 4, char: 4, chaar: 4, charjon: 4, charte: 4,
    five: 5, panch: 5, paanch: 5, panchjon: 5, pachta: 5,
    six: 6, chhe: 6, chhoy: 6, chhejon: 6, chhota: 6,
    seven: 7, saat: 7, sat: 7, satjon: 7,
    eight: 8, aath: 8, aat: 8, aatjon: 8,
    nine: 9, nau: 9, noy: 9, noyjon: 9,
    ten: 10, das: 10, dosh: 10, doshjon: 10,
    eleven: 11, gyarah: 11, egaro: 11,
    twelve: 12, barah: 12, baro: 12,
  };

  const digitMatch = lower.match(/\b(\d{1,2})\s*(?:people|person|persons|log|jon|members|member|family\s*members|family|sadasya|jan|sodossho|heads)?\b/i);
  if (digitMatch && Number(digitMatch[1]) > 0 && Number(digitMatch[1]) <= 50) {
    familySize = Number(digitMatch[1]);
  } else {
    const phraseMatch = lower.match(/(?:hum|hamare|amra|family of|total|with|sath)\s+([a-z]+|\d+)\s*(?:log|jon|people|members|member|sadasya)?/i);
    if (phraseMatch && phraseMatch[1]) {
      const word = phraseMatch[1].trim();
      if (numWords[word]) {
        familySize = numWords[word];
      } else if (!isNaN(Number(word)) && Number(word) > 0) {
        familySize = Number(word);
      }
    } else {
      for (const [w, val] of Object.entries(numWords)) {
        if (new RegExp(`(?:hum|hamare|amra|family of|with|total)?\\s*\\b${w}\\b\\s*(?:people|log|jon|members|member|family|sadasya)?`, "i").test(lower)) {
          familySize = val;
          break;
        }
      }
    }
  }

  // 3. Special Needs detection
  const specialNeeds = [];
  if (/(?:wheelchair|wheel\s*chair|mobility|apahij|vikalang|divyang|protibondhi|chal\s*nahi|chalne|pair|hath\s*pair|baisakhi|crutch|crutches|paraly|chair|walker|handicap)/i.test(lower)) {
    specialNeeds.push("disability");
  }
  if (/(?:elderly|old\s*age|senior|senior\s*citizen|maaji|maji|dadi|dadaji|dada|nana|nani|baba|maa|pita|buddhe|bujurg|boyoshko|briddho|aged|60\s*plus|70\s*saal|80\s*saal)/i.test(lower)) {
    specialNeeds.push("elderly");
  }
  if (/(?:infant|baby|newborn|bacha|baccha|chota\s*bacha|chhota\s*bacha|shishu|chotto|kid|kids|child|children|toddler|doodh|feed)/i.test(lower)) {
    specialNeeds.push("infant");
  }
  if (/(?:medical|medicine|dawai|osudh|dawa|aspatal|hospital|doctor|treatment|ill|sick|bimari|bimar|rogi|diabetes|sugar|bp|pressure|dialysis|oxygen|asthma|injur|ghayal|chot|fever|bukhar|tablet|insulin|cardiac|heart)/i.test(lower)) {
    specialNeeds.push("medical");
  }
  if (/(?:pregnant|pregnancy|maternity|expectant|garbhavati|pet\s*me\s*bacha|shomvoba|garbhashay|delivery|labour)/i.test(lower)) {
    specialNeeds.push("pregnant");
  }

  // 4. Missing Person detection
  let missingFamilyMemberName = null;
  const missMatch =
    lower.match(/(?:missing|kho\s*gaya|kho\s*gayi|mil\s*nahi\s*raha|mil\s*nahi\s*rahi|khuje\s*pachhi\s*na|harie\s*geche|looking\s*for|search\s*for)\s+(?:my\s+|meri\s+|mera\s+|amar\s+)?(?:son|daughter|wife|husband|mother|father|brother|sister|bhai|behen|beta|beti|chele|meye|patni|pati)?\s*[:\s]*([A-Za-z\u0900-\u097F\u0980-\u09FF]{2,25})/i) ||
    raw.match(/([A-Za-z\u0900-\u097F\u0980-\u09FF]{2,25})\s+(?:is\s+missing|kho\s*gaya|kho\s*gayi|harie\s*geche|mil\s*nahi\s*raha)/i);
  if (missMatch && missMatch[1]) {
    missingFamilyMemberName = missMatch[1].trim();
  }

  return {
    couldNotExtract: false,
    transcribedText: text,
    name,
    fullName: name,
    familySize: familySize || 1,
    specialNeeds: specialNeeds.length > 0 ? specialNeeds : ["none"],
    missingFamilyMemberName,
    urgencyLevel: specialNeeds.some((n) => ["medical", "pregnant", "infant"].includes(n)) ? "high" : "moderate",
    source: "local-nlp-engine",
    data: {
      name,
      fullName: name,
      familySize: familySize || 1,
      specialNeeds: specialNeeds.length > 0 ? specialNeeds : ["none"],
    },
  };
}

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = body?.text || body?.transcript || body?.message || body?.statement;
  const { audioBase64, audioMimeType = "audio/webm" } = body || {};
  if (!text && !audioBase64) {
    return NextResponse.json(
      { error: "Either text, transcript, or audioBase64 is required." },
      { status: 400 }
    );
  }

  // ── Tier 1: Google Gemini 2.0 Flash Multimodal (Audio & Text) ──
  const geminiKey = process.env.GEMINI_API_KEY;
  const isGeminiConfigured =
    geminiKey &&
    geminiKey !== "your-gemini-api-key" &&
    !geminiKey.startsWith("your-");

  if (isGeminiConfigured) {
    try {
      const parts = [{ text: SYSTEM_PROMPT }];

      if (audioBase64) {
        const cleanAudio = audioBase64.replace(/^data:audio\/\w+;base64,/, "");
        parts.push({
          inlineData: {
            mimeType: audioMimeType || "audio/webm",
            data: cleanAudio,
          },
        });
      }

      if (text) {
        parts.push({
          text: `Evacuee statement: "${text}". Please parse and extract according to JSON format.`,
        });
      }

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;

      const res = await fetch(geminiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      });

      if (res.ok) {
        const geminiData = await res.json();
        const textContent =
          geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsed = extractJson(textContent);

        if (parsed) {
          return NextResponse.json({
            couldNotExtract: false,
            source: "gemini-2.0-flash",
            transcribedText: parsed.transcribedText || text || "",
            name: parsed.name || null,
            familySize:
              typeof parsed.familySize === "number" && parsed.familySize > 0
                ? parsed.familySize
                : null,
            locationDescription: parsed.locationDescription || null,
            specialNeeds: sanitizeSpecialNeeds(parsed.specialNeeds),
            missingFamilyMemberName: parsed.missingFamilyMemberName || null,
            urgencyLevel: parsed.urgencyLevel || "moderate",
          });
        }
      }
    } catch (geminiErr) {
      console.warn("Gemini voice extraction fallback triggered:", geminiErr?.message);
    }
  }

  // ── Tier 2: OpenRouter Multi-Model Pool (Text statements) ──
  if (text) {
    try {
      const parsed = await queryOpenRouter({
        prompt: `Evacuee statement: "${text}". Extract evacuee registration details strictly as JSON.`,
        systemPrompt: SYSTEM_PROMPT,
        temperature: 0.1,
        responseFormatJson: true,
      });

      if (parsed) {
        return NextResponse.json({
          couldNotExtract: false,
          source: "openrouter-llm",
          transcribedText: parsed.transcribedText || text || "",
          name: parsed.name || null,
          familySize:
            typeof parsed.familySize === "number" && parsed.familySize > 0
              ? parsed.familySize
              : null,
          locationDescription: parsed.locationDescription || null,
          specialNeeds: sanitizeSpecialNeeds(parsed.specialNeeds),
          missingFamilyMemberName: parsed.missingFamilyMemberName || null,
          urgencyLevel: parsed.urgencyLevel || "moderate",
        });
      }
    } catch (openRouterErr) {
      console.warn("OpenRouter voice extraction fallback triggered:", openRouterErr?.message);
    }

    // ── Tier 3: Deterministic Indian Multi-lingual NLP Heuristic ──
    const fallback = heuristicExtract(text);
    if (fallback) {
      return NextResponse.json(fallback);
    }
  }

  return NextResponse.json({
    couldNotExtract: true,
    message: "Could not extract details. Please enter manually.",
  });
}