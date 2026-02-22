// ============================================================
// AI Advisory Service — Gemini-powered clinical decision support
// Uses official @google/genai SDK with Gemini 2.5 Flash
// ============================================================

import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const MODEL_ID = "gemini-2.5-flash";

// Response schema for structured JSON output
const ADVISORY_SCHEMA = {
  type: "object",
  properties: {
    possibleConditions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          condition: { type: "string" },
          likelihood: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["condition", "likelihood", "explanation"],
      },
    },
    missedRiskFactors: {
      type: "array",
      items: {
        type: "object",
        properties: {
          factor: { type: "string" },
          reasoning: { type: "string" },
        },
        required: ["factor", "reasoning"],
      },
    },
    recommendedActions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          urgency: { type: "string" },
        },
        required: ["action", "urgency"],
      },
    },
    overallAssessment: { type: "string" },
  },
  required: [
    "possibleConditions",
    "missedRiskFactors",
    "recommendedActions",
    "overallAssessment",
  ],
};

/**
 * Build a clinical prompt for the Gemini LLM.
 * Includes vitals, chief complaint, patient demographics, and context.
 */
function buildClinicalPrompt({
  patient,
  vitals,
  chiefComplaint,
  symptomDuration,
  consciousness,
  redFlags,
  news2Score,
  riskLevel,
}) {
  const month = new Date().toLocaleString("en-IN", { month: "long" });
  const season = getIndianSeason(new Date().getMonth());

  return `You are a clinical decision-support assistant for an ASHA (community health) worker in rural India.
Given the following patient data, provide:
1. **Possible Conditions** — up to 4 differential diagnoses ranked by likelihood, each with a one-line explanation.
2. **Missed Risk Factors** — 2-3 things the health worker should check or consider (e.g., endemic diseases for the region/season, medication history, comorbidities).
3. **Recommended Actions** — 3-4 concrete next steps (referral urgency, tests, home-care advice).

Keep language simple (ASHA-worker level). Be concise. Use bullet points.
Do NOT diagnose — frame everything as "Consider…" or "Possible…".

--- PATIENT ---
Name: ${patient.name || "Unknown"}
Age: ${patient.age || "Unknown"} years
Gender: ${patient.gender || "Unknown"}
Village: ${patient.village || "Unknown"}
Season: ${season} (${month})

--- PRESENTATION ---
Chief Complaint: ${chiefComplaint || "Not recorded"}
Duration: ${symptomDuration ? symptomDuration + " days" : "Not recorded"}

--- VITALS ---
Respiratory Rate: ${vitals.respiratoryRate || "N/A"} breaths/min
Pulse Rate: ${vitals.pulseRate || "N/A"} bpm
Temperature: ${vitals.temperature || "N/A"} °C
SpO2: ${vitals.spo2 || "N/A"} %
Systolic BP: ${vitals.systolicBP || "N/A"} mmHg
Consciousness: ${consciousness || "Alert"}

--- CLINICAL FLAGS ---
NEWS2 Score: ${news2Score ?? "Not calculated"}
Risk Level: ${riskLevel || "Not assessed"}
Red Flags: ${redFlags.length > 0 ? redFlags.join(", ") : "None"}

Respond in this exact JSON format (no markdown, no code fences):
{
  "possibleConditions": [
    { "condition": "...", "likelihood": "High|Medium|Low", "explanation": "..." }
  ],
  "missedRiskFactors": [
    { "factor": "...", "reasoning": "..." }
  ],
  "recommendedActions": [
    { "action": "...", "urgency": "Immediate|Soon|Routine" }
  ],
  "overallAssessment": "A single-sentence clinical summary."
}`;
}

/**
 * Determine Indian season from month index (0-11)
 */
function getIndianSeason(month) {
  if (month >= 2 && month <= 5) return "Summer / Pre-monsoon";
  if (month >= 6 && month <= 9) return "Monsoon / Rainy season";
  return "Winter / Post-monsoon";
}

/**
 * Call Google Gemini SDK for clinical advisory
 * @returns {{ possibleConditions, missedRiskFactors, recommendedActions, overallAssessment }}
 */
export async function getAIClinicalAdvisory(params) {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY_MISSING");
  }

  const prompt = buildClinicalPrompt(params);
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL_ID,
        contents: prompt,
        config: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: ADVISORY_SCHEMA,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("GEMINI_EMPTY_RESPONSE");
      }

      try {
        const clean = text
          .replace(/```json\s*/g, "")
          .replace(/```\s*/g, "")
          .trim();
        return JSON.parse(clean);
      } catch (parseErr) {
        console.error("Failed to parse Gemini response:", text);
        throw new Error("GEMINI_PARSE_ERROR");
      }
    } catch (err) {
      // Retry on rate limit (429)
      if (
        err?.status === 429 ||
        err?.message?.includes("429") ||
        err?.message?.includes("RESOURCE_EXHAUSTED")
      ) {
        if (attempt < MAX_RETRIES) {
          const waitMs = (attempt + 1) * 12000;
          console.warn(
            `Gemini rate limited, retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`,
          );
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        throw new Error("GEMINI_RATE_LIMITED");
      }
      // Re-throw known errors
      if (err.message?.startsWith("GEMINI_")) throw err;
      console.error("Gemini SDK error:", err);
      throw new Error(`GEMINI_API_ERROR`);
    }
  }
}

/**
 * Check if the Gemini API key is configured
 */
export function isAIAdvisoryAvailable() {
  return Boolean(GEMINI_API_KEY);
}
