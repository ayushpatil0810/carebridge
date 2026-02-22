// ============================================================
// Sarvam AI Service — Speech-to-Text + SBAR Generation
// ============================================================
// ARCHITECTURAL RULES:
// - AI does NOT make medical decisions
// - AI does NOT calculate risk scores
// - AI only converts speech→text and structures notes→SBAR
// - All final decisions remain human-controlled
// - Fallback template exists if AI fails
// ============================================================

const SARVAM_API_KEY = import.meta.env.VITE_SARVAM_API_KEY || "";
const SARVAM_BASE_URL = "https://api.sarvam.ai";

// Language code mapping from i18n locale to Sarvam BCP-47
const LOCALE_TO_SARVAM = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  pa: "pa-IN",
  bn: "bn-IN",
  gu: "gu-IN",
};

/**
 * Check if Sarvam API is available (key configured)
 */
export function isSarvamAvailable() {
  return Boolean(SARVAM_API_KEY && SARVAM_API_KEY.length > 5);
}

/**
 * Get Sarvam language code from i18n locale
 */
export function getSarvamLanguageCode(locale) {
  return LOCALE_TO_SARVAM[locale] || "en-IN";
}

// ============================================================
// SPEECH-TO-TEXT
// ============================================================

/**
 * Convert audio blob to text using Sarvam Speech-to-Text API (Saaras v3)
 *
 * @param {Blob} audioBlob - Recorded audio blob (WebM/WAV)
 * @param {string} locale - Current i18n locale (e.g., 'mr', 'hi', 'en')
 * @returns {Promise<{transcript: string, languageCode: string}>}
 */
export async function speechToText(audioBlob, locale = "en") {
  if (!isSarvamAvailable()) {
    throw new Error("SARVAM_API_KEY_MISSING");
  }

  if (!audioBlob || audioBlob.size === 0) {
    throw new Error("EMPTY_AUDIO");
  }

  const formData = new FormData();
  // Determine file extension and normalize MIME type (strip codec params)
  const ext = audioBlob.type?.includes("webm") ? "webm" : "wav";
  const cleanMime = ext === "webm" ? "audio/webm" : "audio/wav";
  const cleanBlob = new Blob([audioBlob], { type: cleanMime });
  formData.append("file", cleanBlob, `recording.${ext}`);
  formData.append("model", "saaras:v3");
  formData.append("language_code", getSarvamLanguageCode(locale));
  formData.append("mode", "transcribe");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(`${SARVAM_BASE_URL}/speech-to-text`, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      throw new Error("SARVAM_RATE_LIMITED");
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Sarvam STT error:", response.status, errorText);
      throw new Error("SARVAM_STT_FAILED");
    }

    const data = await response.json();
    return {
      transcript: data.transcript || "",
      languageCode: data.language_code || getSarvamLanguageCode(locale),
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("SARVAM_TIMEOUT");
    }
    throw err;
  }
}

// ============================================================
// SBAR GENERATION
// ============================================================

/**
 * Build the controlled SBAR prompt.
 * Strips patient name/identifiers for privacy.
 */
function buildSBARPrompt(noteText, vitals, riskScore, patientInfo = {}) {
  const age = patientInfo.age || "Unknown";
  const gender = patientInfo.gender || "Unknown";
  const redFlags =
    patientInfo.redFlags && patientInfo.redFlags.length > 0
      ? patientInfo.redFlags.join(", ")
      : "None reported";
  const consciousness = patientInfo.consciousness || "Alert";
  const symptomDuration = patientInfo.symptomDuration || "Not recorded";
  const riskLevel = patientInfo.riskLevel || "Unknown";

  return `Convert the following clinical information into structured SBAR format.
Do not provide diagnosis. Do not provide medical decision. Do not generate new medical facts.
Only structure the given information clearly and maintain medical neutrality.

--- CLINICAL DATA ---
Patient Age: ${age} years
Gender: ${gender}
Chief Complaint: ${noteText || "Not recorded"}
Symptom Duration: ${symptomDuration}

Vitals:
- Respiratory Rate: ${vitals?.respiratoryRate || "N/A"} breaths/min
- Pulse Rate: ${vitals?.pulseRate || "N/A"} bpm
- Temperature: ${vitals?.temperature || "N/A"} °C
- SpO2: ${vitals?.spo2 || "N/A"} %
- Systolic BP: ${vitals?.systolicBP || "N/A"} mmHg
- Consciousness (AVPU): ${consciousness}

Risk Score (NEWS2): ${riskScore ?? "N/A"} (${riskLevel} Risk)
Red Flags: ${redFlags}

--- OUTPUT FORMAT ---
Respond ONLY in SBAR format as below:

S: [Situation - Brief statement of the patient presentation]
B: [Background - Relevant patient background and symptom history]
A: [Assessment - Clinical observations and risk score, NO diagnosis]
R: [Recommendation - Suggested actions based on protocol, NO medical decisions]`;
}

/**
 * Generate SBAR summary using Sarvam Chat Completion API (sarvam-m).
 *
 * @param {string} noteText - Chief complaint / clinical notes
 * @param {object} vitals - Structured vitals object
 * @param {number} riskScore - Already-calculated NEWS2 score
 * @param {object} patientInfo - { age, gender, redFlags, consciousness, symptomDuration, riskLevel }
 * @param {string} locale - Target language locale for multilingual SBAR
 * @returns {Promise<{sbarEnglish: string, sbarTranslated: string|null, aiGenerated: boolean}>}
 */
export async function generateSBAR(
  noteText,
  vitals,
  riskScore,
  patientInfo = {},
  locale = "en",
) {
  // If API unavailable, use fallback immediately
  if (!isSarvamAvailable()) {
    console.warn("Sarvam API key missing. Using fallback SBAR template.");
    return {
      sbarEnglish: generateFallbackSBAR(noteText, vitals, riskScore, patientInfo),
      sbarTranslated: null,
      aiGenerated: false,
    };
  }

  const prompt = buildSBARPrompt(noteText, vitals, riskScore, patientInfo);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(`${SARVAM_BASE_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sarvam-m",
        messages: [
          {
            role: "system",
            content:
              "You are a clinical documentation assistant. You structure clinical information into SBAR format. You do NOT diagnose, do NOT make medical decisions, and do NOT generate new medical facts. You only organize the provided information.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 429) {
      throw new Error("SARVAM_RATE_LIMITED");
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error("Sarvam SBAR error:", response.status, errorText);
      throw new Error("SARVAM_SBAR_FAILED");
    }

    const data = await response.json();
    const sbarEnglish =
      data.choices?.[0]?.message?.content?.trim() ||
      generateFallbackSBAR(noteText, vitals, riskScore, patientInfo);

    // If non-English locale, translate SBAR
    let sbarTranslated = null;
    if (locale !== "en") {
      try {
        sbarTranslated = await translateText(
          sbarEnglish,
          "en-IN",
          getSarvamLanguageCode(locale),
        );
      } catch (translateErr) {
        console.warn("SBAR translation failed, storing English only:", translateErr);
      }
    }

    return {
      sbarEnglish,
      sbarTranslated,
      aiGenerated: true,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("SBAR generation failed, using fallback:", err);
    return {
      sbarEnglish: generateFallbackSBAR(noteText, vitals, riskScore, patientInfo),
      sbarTranslated: null,
      aiGenerated: false,
    };
  }
}

// ============================================================
// TRANSLATION
// ============================================================

/**
 * Translate text using Sarvam Translate API (Mayura v1)
 *
 * @param {string} text - Input text to translate
 * @param {string} sourceLang - Source language code (e.g., 'en-IN')
 * @param {string} targetLang - Target language code (e.g., 'mr-IN')
 * @returns {Promise<string>} Translated text
 */
export async function translateText(text, sourceLang, targetLang) {
  if (!isSarvamAvailable() || !text) return text;

  // Split into chunks of 2000 chars for API limit
  const chunks = [];
  for (let i = 0; i < text.length; i += 1800) {
    chunks.push(text.substring(i, i + 1800));
  }

  const translatedChunks = [];
  for (const chunk of chunks) {
    const response = await fetch(`${SARVAM_BASE_URL}/translate`, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: chunk,
        source_language_code: sourceLang,
        target_language_code: targetLang,
        model: "mayura:v1",
        mode: "formal",
      }),
    });

    if (!response.ok) {
      throw new Error("SARVAM_TRANSLATE_FAILED");
    }

    const data = await response.json();
    translatedChunks.push(data.translated_text || chunk);
  }

  return translatedChunks.join("");
}

// ============================================================
// FALLBACK SBAR TEMPLATE (Deterministic — No AI)
// ============================================================

/**
 * Generate a deterministic SBAR template when AI is unavailable.
 * This is a simple string template — NO AI, NO medical decisions.
 *
 * @param {string} noteText - Chief complaint
 * @param {object} vitals - Vitals object
 * @param {number} riskScore - NEWS2 score
 * @param {object} patientInfo - Patient metadata
 * @returns {string} SBAR formatted text
 */
export function generateFallbackSBAR(
  noteText,
  vitals,
  riskScore,
  patientInfo = {},
) {
  const age = patientInfo.age || "Unknown";
  const gender = patientInfo.gender || "Unknown";
  const consciousness = patientInfo.consciousness || "Alert";
  const riskLevel = patientInfo.riskLevel || "Unknown";
  const redFlags =
    patientInfo.redFlags && patientInfo.redFlags.length > 0
      ? patientInfo.redFlags.join(", ")
      : "None";
  const symptomDuration = patientInfo.symptomDuration || "Not recorded";

  const rr = vitals?.respiratoryRate || "N/A";
  const pr = vitals?.pulseRate || "N/A";
  const temp = vitals?.temperature || "N/A";
  const spo2 = vitals?.spo2 || "N/A";
  const sbp = vitals?.systolicBP || "N/A";

  let recommendation = "Continue routine monitoring.";
  if (riskLevel === "Red") {
    recommendation =
      "Urgent PHC review recommended. Consider immediate referral per protocol.";
  } else if (riskLevel === "Yellow") {
    recommendation =
      "Increased monitoring recommended. PHC review advised within clinical protocol timeline.";
  }

  return `S: ${age}-year-old ${gender} patient presenting with ${noteText || "unspecified complaint"}. Symptom duration: ${symptomDuration}.
B: Community health visit. Consciousness level: ${consciousness}. Red flags: ${redFlags}.
A: Vitals — RR: ${rr}/min, Pulse: ${pr} bpm, Temp: ${temp}°C, SpO2: ${spo2}%, SBP: ${sbp} mmHg. NEWS2 Score: ${riskScore ?? "N/A"} (${riskLevel} Risk).
R: ${recommendation}`;
}
