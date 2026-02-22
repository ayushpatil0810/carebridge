// ============================================================
// Vitals Validation — Clinical range checks for vital signs
// Returns warnings (out-of-range but possible) and errors
// (impossible values that should be blocked).
// ============================================================

/**
 * Clinical reference ranges for vital signs.
 * Each entry has:
 *   - min/max: absolute physiological limits (values outside = error)
 *   - warnLow/warnHigh: concerning clinical thresholds (values outside = warning)
 *   - unit: display unit
 *   - label: human-readable name
 */
const VITAL_RANGES = {
  respiratoryRate: {
    min: 4,
    max: 60,
    warnLow: 9,
    warnHigh: 25,
    unit: "breaths/min",
    label: "Respiratory Rate",
  },
  pulseRate: {
    min: 20,
    max: 250,
    warnLow: 50,
    warnHigh: 130,
    unit: "bpm",
    label: "Pulse Rate",
  },
  temperature: {
    min: 30,
    max: 45,
    warnLow: 35,
    warnHigh: 39,
    unit: "°C",
    label: "Temperature",
  },
  spo2: {
    min: 50,
    max: 100,
    warnLow: 92,
    warnHigh: 101, // no high warning for SpO2
    unit: "%",
    label: "SpO₂",
  },
  systolicBP: {
    min: 50,
    max: 300,
    warnLow: 90,
    warnHigh: 180,
    unit: "mmHg",
    label: "Systolic BP",
  },
};

/**
 * Validate a single vital sign value.
 *
 * @param {string} field - Key from VITAL_RANGES (e.g. 'temperature')
 * @param {string|number} value - Raw input value
 * @returns {{ valid: boolean, error?: string, warning?: string }}
 */
export function validateVital(field, value) {
  if (value === "" || value === null || value === undefined) {
    return { valid: true }; // empty is allowed (optional)
  }

  const num = Number(value);
  const range = VITAL_RANGES[field];

  if (!range) return { valid: true };

  if (isNaN(num)) {
    return { valid: false, error: `${range.label}: Please enter a number` };
  }

  // Absolute limits — impossible values
  if (num < range.min || num > range.max) {
    return {
      valid: false,
      error: `${range.label}: ${num} ${range.unit} is outside the possible range (${range.min}–${range.max})`,
    };
  }

  // Clinical warning thresholds
  if (num < range.warnLow) {
    return {
      valid: true,
      warning: `${range.label}: ${num} ${range.unit} is critically low — please confirm the reading`,
    };
  }

  if (num > range.warnHigh && range.warnHigh <= range.max) {
    return {
      valid: true,
      warning: `${range.label}: ${num} ${range.unit} is critically high — please confirm the reading`,
    };
  }

  return { valid: true };
}

/**
 * Validate all vitals at once.
 *
 * @param {object} vitals - { respiratoryRate, pulseRate, temperature, spo2, systolicBP }
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateAllVitals(vitals) {
  const errors = [];
  const warnings = [];

  Object.entries(vitals).forEach(([field, value]) => {
    const result = validateVital(field, value);
    if (!result.valid && result.error) errors.push(result.error);
    if (result.warning) warnings.push(result.warning);
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

export { VITAL_RANGES };
