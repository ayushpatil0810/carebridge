// ============================================================
// NEWS2 Deterministic Scoring Engine
// National Early Warning Score 2 — parameter-based clinical scoring
// ============================================================

/**
 * Score Respiratory Rate
 * @param {number|null} rr - breaths per minute
 * @returns {{ score: number, detail: string } | null}
 */
function scoreRespiratoryRate(rr) {
    if (rr == null || rr === '') return null;
    rr = Number(rr);
    if (isNaN(rr)) return null;

    let score;
    if (rr <= 8) score = 3;
    else if (rr <= 11) score = 1;
    else if (rr <= 20) score = 0;
    else if (rr <= 24) score = 2;
    else score = 3;

    return { score, detail: `${rr} breaths/min` };
}

/**
 * Score SpO2 (Oxygen Saturation)
 * @param {number|null} spo2 - percentage
 * @returns {{ score: number, detail: string } | null}
 */
function scoreSpO2(spo2) {
    if (spo2 == null || spo2 === '') return null;
    spo2 = Number(spo2);
    if (isNaN(spo2)) return null;

    let score;
    if (spo2 <= 91) score = 3;
    else if (spo2 <= 93) score = 2;
    else if (spo2 <= 95) score = 1;
    else score = 0;

    return { score, detail: `${spo2}%` };
}

/**
 * Score Temperature
 * @param {number|null} temp - degrees Celsius
 * @returns {{ score: number, detail: string } | null}
 */
function scoreTemperature(temp) {
    if (temp == null || temp === '') return null;
    temp = Number(temp);
    if (isNaN(temp)) return null;

    let score;
    if (temp <= 35.0) score = 3;
    else if (temp <= 36.0) score = 1;
    else if (temp <= 38.0) score = 0;
    else if (temp <= 39.0) score = 1;
    else score = 2;

    return { score, detail: `${temp}°C` };
}

/**
 * Score Systolic Blood Pressure
 * @param {number|null} sbp - mmHg
 * @returns {{ score: number, detail: string } | null}
 */
function scoreSystolicBP(sbp) {
    if (sbp == null || sbp === '') return null;
    sbp = Number(sbp);
    if (isNaN(sbp)) return null;

    let score;
    if (sbp <= 90) score = 3;
    else if (sbp <= 100) score = 2;
    else if (sbp <= 110) score = 1;
    else if (sbp <= 219) score = 0;
    else score = 3;

    return { score, detail: `${sbp} mmHg` };
}

/**
 * Score Pulse Rate
 * @param {number|null} pulse - beats per minute
 * @returns {{ score: number, detail: string } | null}
 */
function scorePulseRate(pulse) {
    if (pulse == null || pulse === '') return null;
    pulse = Number(pulse);
    if (isNaN(pulse)) return null;

    let score;
    if (pulse <= 40) score = 3;
    else if (pulse <= 50) score = 1;
    else if (pulse <= 90) score = 0;
    else if (pulse <= 110) score = 1;
    else if (pulse <= 130) score = 2;
    else score = 3;

    return { score, detail: `${pulse} bpm` };
}

/**
 * Score Consciousness Level
 * @param {string|null} level - 'Alert', 'Voice', 'Pain', 'Unresponsive'
 * @returns {{ score: number, detail: string } | null}
 */
function scoreConsciousness(level) {
    if (!level) return null;

    const score = level === 'Alert' ? 0 : 3;
    return { score, detail: level };
}

/**
 * Calculate full NEWS2 score
 * @param {Object} vitals - { respiratoryRate, spo2, temperature, systolicBP, pulseRate }
 * @param {string} consciousness - 'Alert' | 'Voice' | 'Pain' | 'Unresponsive'
 * @param {string[]} redFlags - array of red flag strings
 * @returns {Object} - { totalScore, riskLevel, breakdown, missingParams, hasRedFlags, isPartial }
 */
export function calculateNEWS2(vitals, consciousness, redFlags = []) {
    const parameters = [
        { name: 'Respiratory Rate', key: 'respiratoryRate', fn: scoreRespiratoryRate, marathiName: 'श्वसन दर' },
        { name: 'SpO2', key: 'spo2', fn: scoreSpO2, marathiName: 'ऑक्सिजन' },
        { name: 'Temperature', key: 'temperature', fn: scoreTemperature, marathiName: 'तापमान' },
        { name: 'Systolic BP', key: 'systolicBP', fn: scoreSystolicBP, marathiName: 'रक्तदाब' },
        { name: 'Pulse Rate', key: 'pulseRate', fn: scorePulseRate, marathiName: 'नाडी दर' },
    ];

    const breakdown = [];
    const missingParams = [];
    let totalScore = 0;
    let hasAnySingle3 = false;

    // Score each vital parameter
    for (const param of parameters) {
        const result = param.fn(vitals[param.key]);
        if (result) {
            breakdown.push({
                name: param.name,
                marathiName: param.marathiName,
                value: result.detail,
                score: result.score,
            });
            totalScore += result.score;
            if (result.score === 3) hasAnySingle3 = true;
        } else {
            missingParams.push(param.name);
        }
    }

    // Score consciousness
    const consciousnessResult = scoreConsciousness(consciousness);
    if (consciousnessResult) {
        breakdown.push({
            name: 'Consciousness',
            marathiName: 'चेतना',
            value: consciousnessResult.detail,
            score: consciousnessResult.score,
        });
        totalScore += consciousnessResult.score;
        if (consciousnessResult.score === 3) hasAnySingle3 = true;
    } else {
        missingParams.push('Consciousness');
    }

    // Determine risk level
    const hasRedFlags = redFlags && redFlags.length > 0;
    let riskLevel;

    if (hasRedFlags) {
        riskLevel = 'Red';
    } else if (totalScore >= 7) {
        riskLevel = 'Red';
    } else if (totalScore >= 5 || hasAnySingle3) {
        riskLevel = 'Yellow';
    } else {
        riskLevel = 'Green';
    }

    const isPartial = missingParams.length > 0;

    return {
        totalScore,
        riskLevel,
        breakdown,
        missingParams,
        hasRedFlags,
        isPartial,
    };
}

/**
 * Get risk advisory based on risk level
 * @param {string} riskLevel - 'Green' | 'Yellow' | 'Red'
 * @returns {Object} - { level, items, color }
 */
export function getRiskAdvisory(riskLevel) {
    switch (riskLevel) {
        case 'Green':
            return {
                level: 'Low Risk',
                levelMarathi: 'कमी धोका',
                color: 'green',
                items: [
                    { icon: '💧', text: 'Ensure adequate hydration' },
                    { icon: '👁️', text: 'Monitor symptoms every 4–6 hours' },
                    { icon: '🏠', text: 'Continue home care' },
                    { icon: '📋', text: 'Follow up within 48 hours if symptoms persist' },
                ],
            };
        case 'Yellow':
            return {
                level: 'Moderate Risk',
                levelMarathi: 'मध्यम धोका',
                color: 'yellow',
                items: [
                    { icon: '🔄', text: 'Recheck vitals within 1 hour' },
                    { icon: '👁️', text: 'Close observation required' },
                    { icon: '📞', text: 'Inform PHC for guidance' },
                    { icon: '📋', text: 'Document changes in condition' },
                ],
            };
        case 'Red':
            return {
                level: 'High Risk',
                levelMarathi: 'उच्च धोका',
                color: 'red',
                items: [
                    { icon: '🚨', text: 'Immediate referral to PHC/higher center' },
                    { icon: '💨', text: 'Provide oxygen support if available' },
                    { icon: '🚑', text: 'Arrange emergency transport' },
                    { icon: '📞', text: 'Contact PHC doctor immediately' },
                ],
            };
        default:
            return { level: 'Unknown', color: 'green', items: [] };
    }
}

/**
 * List of red flags
 */
export const RED_FLAGS = [
    'Severe breathlessness',
    'Chest pain',
    'Persistent vomiting',
    'Seizure',
    'Unconsciousness',
];
