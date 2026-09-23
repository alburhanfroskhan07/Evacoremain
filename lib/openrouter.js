/**
 * OpenRouter AI Client for EVACORE
 *
 * Calls OpenRouter API using top-tier free models with automatic fallbacks:
 * 1. meta-llama/llama-3.3-70b-instruct:free
 * 2. google/gemini-2.0-flash-exp:free
 * 3. qwen/qwen-2.5-72b-instruct:free
 * 4. mistralai/mistral-7b-instruct:free
 */

const FALLBACK_MODELS = [
  process.env.OPENROUTER_MODEL || "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-3.5-lightning:free",
  "google/gemma-4-31b-it:free",
  "google/gemma-4-26b-a4b-it:free",
];

export async function queryOpenRouter({
  prompt,
  systemPrompt = "You are EVACORE AI, an expert disaster response and emergency relief intelligence assistant. Return strictly valid JSON when asked.",
  temperature = 0.2,
  responseFormatJson = true,
}) {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured.");
  }

  let lastError = null;

  for (const model of FALLBACK_MODELS) {
    try {
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ];

      const bodyPayload = {
        model,
        messages,
        temperature,
      };

      if (responseFormatJson) {
        bodyPayload.response_format = { type: "json_object" };
      }

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "EVACORE Disaster Relief System",
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`OpenRouter model ${model} failed (${res.status}):`, errText);
        lastError = new Error(`OpenRouter (${res.status}): ${errText}`);
        continue; // Try next fallback model
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || "";

      if (!content) {
        throw new Error("Empty response received from OpenRouter.");
      }

      // If JSON format is expected, extract and parse JSON cleanly
      if (responseFormatJson) {
        const cleaned = content
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/gi, "")
          .trim();
        return JSON.parse(cleaned);
      }

      return content;
    } catch (err) {
      console.warn(`Error querying OpenRouter with model ${model}:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("All OpenRouter models failed to respond.");
}
