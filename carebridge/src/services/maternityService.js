// ============================================================
// Maternity Service — Firestore CRUD for Pre & Post Natal Care
// Sub-collection: patients/{patientId}/maternityRecords
// ============================================================

import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    serverTimestamp,
    arrayUnion,
    Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const PATIENTS = 'patients';
const MATERNITY = 'maternityRecords';

// ── Helper: compute EDD from LMP (Naegele's rule: +280 days) ──
export function computeEDD(lmpDate) {
    const lmp = new Date(lmpDate);
    const edd = new Date(lmp);
    edd.setDate(edd.getDate() + 280);
    return edd;
}

// ── Helper: current gestational age in weeks+days ──
export function getGestationalAge(lmpDate) {
    const lmp = new Date(lmpDate);
    const now = new Date();
    const diffMs = now.getTime() - lmp.getTime();
    const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (totalDays < 0) return { weeks: 0, days: 0, totalDays: 0 };
    return {
        weeks: Math.floor(totalDays / 7),
        days: totalDays % 7,
        totalDays,
    };
}

// ── Helper: trimester from gestational weeks ──
export function getTrimester(weeks) {
    if (weeks < 13) return 1;
    if (weeks < 28) return 2;
    return 3;
}

// ── Helper: days until EDD ──
export function daysUntilEDD(eddDate) {
    const edd = new Date(eddDate);
    const now = new Date();
    return Math.ceil((edd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ================================================================
// CRUD Operations
// ================================================================

/**
 * Create a new maternity record (pregnancy registration)
 */
export async function createMaternityRecord(patientId, data) {
    const lmpDate = new Date(data.lmpDate);
    const eddDate = computeEDD(data.lmpDate);
    const now = Timestamp.now();

    const record = {
        patientId,
        status: 'antenatal',       // antenatal | postnatal | closed
        lmpDate: Timestamp.fromDate(lmpDate),
        eddDate: Timestamp.fromDate(eddDate),
        gravida: Number(data.gravida) || 1,
        para: Number(data.para) || 0,
        bloodGroup: data.bloodGroup || '',
        highRiskFactors: data.highRiskFactors || [],
        ancVisits: [],             // ANC checkup entries
        pncVisits: [],             // PNC checkup entries
        deliveryOutcome: null,     // filled when delivery recorded
        createdBy: data.createdBy || '',
        createdAt: now,
        updatedAt: now,
    };

    const colRef = collection(db, PATIENTS, patientId, MATERNITY);
    const docRef = await addDoc(colRef, record);
    return { id: docRef.id, ...record, eddDate, lmpDate };
}

/**
 * Get the active maternity record for a patient (latest antenatal/postnatal)
 * NOTE: Avoids compound where+orderBy to prevent needing a composite index.
 */
export async function getActiveMaternityRecord(patientId) {
    const colRef = collection(db, PATIENTS, patientId, MATERNITY);
    const snap = await getDocs(colRef);
    if (snap.empty) return null;

    // Filter for active records and sort by createdAt descending client-side
    const active = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(r => r.status === 'antenatal' || r.status === 'postnatal')
        .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() || 0;
            const tb = b.createdAt?.toMillis?.() || 0;
            return tb - ta;
        });

    return active.length > 0 ? active[0] : null;
}

/**
 * Get all maternity records for a patient
 */
export async function getMaternityRecords(patientId) {
    const colRef = collection(db, PATIENTS, patientId, MATERNITY);
    const snap = await getDocs(colRef);
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() || 0;
            const tb = b.createdAt?.toMillis?.() || 0;
            return tb - ta;
        });
}

/**
 * Get ALL maternity records across ALL patients (for PHC overview)
 * Returns records enriched with patient info (name, village, age, patientDocId)
 */
export async function getAllMaternityRecords() {
    const patientsSnap = await getDocs(collection(db, PATIENTS));
    const results = [];

    await Promise.all(patientsSnap.docs.map(async (patDoc) => {
        const patData = patDoc.data();
        const matSnap = await getDocs(collection(db, PATIENTS, patDoc.id, MATERNITY));
        matSnap.docs.forEach(matDoc => {
            results.push({
                id: matDoc.id,
                ...matDoc.data(),
                patientDocId: patDoc.id,
                patientName: patData.name || '',
                patientAge: patData.age || '',
                patientVillage: patData.village || '',
                patientContact: patData.contact || '',
                patientGender: patData.gender || '',
            });
        });
    }));

    return results.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() || 0;
        const tb = b.createdAt?.toMillis?.() || 0;
        return tb - ta;
    });
}

/**
 * Add an ANC (antenatal checkup) visit
 */
export async function addANCVisit(patientId, recordId, visitData) {
    const docRef = doc(db, PATIENTS, patientId, MATERNITY, recordId);
    const entry = {
        visitNumber: visitData.visitNumber || 1,  // ANC 1–4
        date: visitData.date || new Date().toISOString(),
        gestationalWeeks: visitData.gestationalWeeks || 0,
        weight: visitData.weight || '',            // kg
        bp: visitData.bp || '',                    // e.g. "120/80"
        hemoglobin: visitData.hemoglobin || '',     // g/dL
        urineTest: visitData.urineTest || '',       // normal/abnormal
        fundalHeight: visitData.fundalHeight || '', // cm
        fetalHeartRate: visitData.fetalHeartRate || '', // bpm
        ttDose: visitData.ttDose || false,          // TT injection given
        ifaTablets: visitData.ifaTablets || false,  // IFA given
        notes: visitData.notes || '',
        recordedBy: visitData.recordedBy || '',
        // Maternal vitals & risk assessment
        vitals: visitData.vitals || {},
        dangerSigns: visitData.dangerSigns || [],
        moderateRisks: visitData.moderateRisks || [],
        riskLevel: visitData.riskLevel || 'LOW',
        riskReasons: visitData.riskReasons || [],
        escalate: visitData.escalate || false,
    };

    await updateDoc(docRef, {
        ancVisits: arrayUnion(entry),
        updatedAt: serverTimestamp(),
    });

    return entry;
}

/**
 * Record delivery outcome → transitions record to 'postnatal' status
 */
export async function recordDelivery(patientId, recordId, deliveryData) {
    const docRef = doc(db, PATIENTS, patientId, MATERNITY, recordId);

    const outcome = {
        date: deliveryData.date || new Date().toISOString(),
        type: deliveryData.type || 'Normal',          // Normal, C-Section, Assisted
        place: deliveryData.place || 'Hospital',       // Hospital, PHC, Home
        babyWeight: deliveryData.babyWeight || '',      // kg
        babyGender: deliveryData.babyGender || '',
        apgarScore: deliveryData.apgarScore || '',      // 1 min score
        complications: deliveryData.complications || '',
        notes: deliveryData.notes || '',
        recordedBy: deliveryData.recordedBy || '',
    };

    await updateDoc(docRef, {
        status: 'postnatal',
        deliveryOutcome: outcome,
        updatedAt: serverTimestamp(),
    });

    return outcome;
}

/**
 * Add a PNC (postnatal care) visit
 */
export async function addPNCVisit(patientId, recordId, visitData) {
    const docRef = doc(db, PATIENTS, patientId, MATERNITY, recordId);
    const entry = {
        visitType: visitData.visitType || 'Day 1',   // Day 1, Day 3, Day 7, Week 6
        date: visitData.date || new Date().toISOString(),
        motherTemp: visitData.motherTemp || '',
        motherBP: visitData.motherBP || '',
        breastfeeding: visitData.breastfeeding || '',  // Exclusive, Mixed, None
        woundHealing: visitData.woundHealing || '',    // Good, Infected, N/A
        babyWeight: visitData.babyWeight || '',
        babyTemp: visitData.babyTemp || '',
        immunizations: visitData.immunizations || [],  // BCG, OPV-0, Hep-B
        notes: visitData.notes || '',
        recordedBy: visitData.recordedBy || '',
    };

    await updateDoc(docRef, {
        pncVisits: arrayUnion(entry),
        updatedAt: serverTimestamp(),
    });

    return entry;
}

/**
 * Close a maternity record (care completed)
 */
export async function closeMaternityRecord(patientId, recordId) {
    const docRef = doc(db, PATIENTS, patientId, MATERNITY, recordId);
    await updateDoc(docRef, {
        status: 'closed',
        updatedAt: serverTimestamp(),
    });
}

// ── High Risk Factors constant ──
export const HIGH_RISK_FACTORS = [
    { key: 'age_above_35', label: 'Age > 35 years' },
    { key: 'previous_csection', label: 'Previous C-Section' },
    { key: 'anemia', label: 'Anemia (Hb < 7)' },
    { key: 'hypertension', label: 'Hypertension' },
    { key: 'diabetes', label: 'Gestational Diabetes' },
    { key: 'twin_pregnancy', label: 'Twin/Multiple Pregnancy' },
    { key: 'rh_negative', label: 'Rh-Negative Blood' },
    { key: 'previous_loss', label: 'Previous Pregnancy Loss' },
];

// ── ANC Schedule constant ──
export const ANC_SCHEDULE = [
    { number: 1, label: 'ANC 1st Visit', timing: 'Before 12 weeks' },
    { number: 2, label: 'ANC 2nd Visit', timing: '14–26 weeks' },
    { number: 3, label: 'ANC 3rd Visit', timing: '28–34 weeks' },
    { number: 4, label: 'ANC 4th Visit', timing: '36 weeks onwards' },
];

// ── PNC Schedule constant ──
export const PNC_SCHEDULE = [
    { key: 'Day 1', label: 'Day 1 (Within 24hrs)' },
    { key: 'Day 3', label: 'Day 3' },
    { key: 'Day 7', label: 'Day 7' },
    { key: 'Week 6', label: 'Week 6' },
];

// ── Baby Immunization checklist ──
export const BABY_IMMUNIZATIONS = [
    { key: 'BCG', label: 'BCG', when: 'At birth' },
    { key: 'OPV-0', label: 'OPV-0 (Oral Polio)', when: 'At birth' },
    { key: 'Hep-B', label: 'Hepatitis B Birth Dose', when: 'Within 24hrs' },
];

// ================================================================
// MATERNAL VITAL SIGNS & DANGER SIGN ASSESSMENT
// ================================================================

// ── Maternal Danger Signs (if ANY checked → HIGH RISK) ──
export const MATERNAL_DANGER_SIGNS = [
    { key: 'severe_headache', label: 'Severe persistent headache', icon: '🤕' },
    { key: 'blurred_vision', label: 'Blurred vision / flashing lights', icon: '👁️' },
    { key: 'convulsions', label: 'Convulsions / fainting', icon: '⚡' },
    { key: 'severe_breathlessness', label: 'Severe breathlessness', icon: '😮‍💨' },
    { key: 'chest_pain', label: 'Chest pain or rapid irregular heartbeat', icon: '💓' },
    { key: 'vaginal_bleeding', label: 'Vaginal bleeding (more than spotting)', icon: '🩸' },
    { key: 'fluid_leaking', label: 'Fluid leaking from vagina', icon: '💧' },
    { key: 'reduced_fetal_movement', label: 'Reduced or absent fetal movement', icon: '👶' },
    { key: 'severe_abdominal_pain', label: 'Severe abdominal pain', icon: '🤰' },
    { key: 'leg_swelling_dvt', label: 'Severe leg swelling with pain (possible DVT)', icon: '🦵' },
    { key: 'fever_chills', label: 'Fever with chills', icon: '🤒' },
];

// ── Moderate Risk Indicators (escalate for review, not emergency) ──
export const MODERATE_RISK_INDICATORS = [
    { key: 'persistent_dizziness', label: 'Persistent dizziness' },
    { key: 'ongoing_vomiting', label: 'Ongoing vomiting (> 8 hrs)' },
    { key: 'previous_csection_history', label: 'Previous C-section' },
    { key: 'high_risk_pregnancy_history', label: 'History of high-risk pregnancy' },
    { key: 'gestational_diabetes_current', label: 'Gestational diabetes' },
    { key: 'mild_swelling', label: 'Mild swelling of hands/face' },
];

/**
 * Compute maternal risk level from vitals + danger signs
 * Returns { level: 'HIGH'|'MODERATE'|'LOW', reasons: string[], escalate: boolean }
 */
export function computeMaternalRisk(vitals = {}, dangerSigns = [], moderateRisks = []) {
    const reasons = [];
    let level = 'LOW';

    // ── Check vitals thresholds ──
    const sys = Number(vitals.bpSystolic);
    const dia = Number(vitals.bpDiastolic);
    if (sys >= 140 || dia >= 90) {
        reasons.push(`BP elevated: ${sys}/${dia} mmHg (≥140/90)`);
        level = 'HIGH';
    }

    const pulse = Number(vitals.pulse);
    if (pulse > 120) {
        reasons.push(`Pulse high: ${pulse} bpm (>120)`);
        level = 'HIGH';
    }

    const rr = Number(vitals.respiratoryRate);
    if (rr > 24) {
        reasons.push(`Respiratory rate high: ${rr}/min (>24)`);
        level = 'HIGH';
    }

    const temp = Number(vitals.temperature);
    if (temp >= 38) {
        reasons.push(`Temperature high: ${temp}°C (≥38°C)`);
        level = 'HIGH';
    }

    const spo2 = Number(vitals.spo2);
    if (spo2 > 0 && spo2 < 94) {
        reasons.push(`SpO₂ low: ${spo2}% (<94%)`);
        level = 'HIGH';
    }

    // ── Check danger signs ──
    if (dangerSigns.length > 0) {
        level = 'HIGH';
        dangerSigns.forEach(key => {
            const sign = MATERNAL_DANGER_SIGNS.find(s => s.key === key);
            if (sign) reasons.push(`Danger: ${sign.label}`);
        });
    }

    // ── Check moderate risk indicators ──
    if (level !== 'HIGH' && moderateRisks.length > 0) {
        level = 'MODERATE';
        moderateRisks.forEach(key => {
            const ind = MODERATE_RISK_INDICATORS.find(i => i.key === key);
            if (ind) reasons.push(`Moderate: ${ind.label}`);
        });
    }

    return {
        level,
        reasons,
        escalate: level === 'HIGH',
    };
}
