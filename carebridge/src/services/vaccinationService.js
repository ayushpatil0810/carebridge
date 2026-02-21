// ============================================================
// Vaccination Service — Firestore CRUD for Immunization Tracking
// Sub-collection: patients/{patientId}/vaccinations
// ============================================================

import {
    collection,
    doc,
    addDoc,
    getDocs,
    updateDoc,
    Timestamp,
    writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

const PATIENTS = 'patients';
const VACCINATIONS = 'vaccinations';

// ═══════════════════════════════════════════════════
// VACCINE MASTER LISTS — India National Immunization Schedule
// ═══════════════════════════════════════════════════

/**
 * Child vaccine schedule (age-based, in weeks from birth)
 */
export const CHILD_VACCINES = [
    { key: 'bcg', name: 'BCG', dose: 1, weeksDue: 0, category: 'child', label_mr: 'बीसीजी' },
    { key: 'opv0', name: 'OPV', dose: 0, weeksDue: 0, category: 'child', label_mr: 'ओपीव्ही-0' },
    { key: 'hepb1', name: 'Hepatitis B', dose: 1, weeksDue: 0, category: 'child', label_mr: 'हिपॅटायटिस बी-1' },
    { key: 'opv1', name: 'OPV', dose: 1, weeksDue: 6, category: 'child', label_mr: 'ओपीव्ही-1' },
    { key: 'penta1', name: 'Pentavalent', dose: 1, weeksDue: 6, category: 'child', label_mr: 'पेन्टाव्हॅलेंट-1' },
    { key: 'hepb2', name: 'Hepatitis B', dose: 2, weeksDue: 6, category: 'child', label_mr: 'हिपॅटायटिस बी-2' },
    { key: 'opv2', name: 'OPV', dose: 2, weeksDue: 10, category: 'child', label_mr: 'ओपीव्ही-2' },
    { key: 'penta2', name: 'Pentavalent', dose: 2, weeksDue: 10, category: 'child', label_mr: 'पेन्टाव्हॅलेंट-2' },
    { key: 'opv3', name: 'OPV', dose: 3, weeksDue: 14, category: 'child', label_mr: 'ओपीव्ही-3' },
    { key: 'penta3', name: 'Pentavalent', dose: 3, weeksDue: 14, category: 'child', label_mr: 'पेन्टाव्हॅलेंट-3' },
    { key: 'hepb3', name: 'Hepatitis B', dose: 3, weeksDue: 14, category: 'child', label_mr: 'हिपॅटायटिस बी-3' },
    { key: 'mr1', name: 'Measles / MR', dose: 1, weeksDue: 39, category: 'child', label_mr: 'गोवर / एमआर-1' },   // 9 months
    { key: 'mr2', name: 'Measles / MR', dose: 2, weeksDue: 70, category: 'child', label_mr: 'गोवर / एमआर-2' },  // 16-24 months
    { key: 'dpt_booster1', name: 'DPT Booster', dose: 1, weeksDue: 70, category: 'child', label_mr: 'डीपीटी बूस्टर-1' }, // 16-24 months
    { key: 'dpt_booster2', name: 'DPT Booster', dose: 2, weeksDue: 260, category: 'child', label_mr: 'डीपीटी बूस्टर-2' }, // 5 years
];

/**
 * Maternal (pregnancy) vaccine schedule (weeks from registration/LMP)
 */
export const MATERNAL_VACCINES = [
    { key: 'tt1', name: 'TT1 (Tetanus Toxoid)', dose: 1, weeksDue: 0, category: 'maternal', label_mr: 'टीटी-1' },
    { key: 'tt2', name: 'TT2 (Tetanus Toxoid)', dose: 2, weeksDue: 4, category: 'maternal', label_mr: 'टीटी-2' },
    { key: 'tt_boost', name: 'TT Booster', dose: 3, weeksDue: 36, category: 'maternal', label_mr: 'टीटी बूस्टर' },
];

/** Combined master list */
export const ALL_VACCINES = [...CHILD_VACCINES, ...MATERNAL_VACCINES];

// ═══════════════════════════════════════════════════
// STATUS HELPERS
// ═══════════════════════════════════════════════════

/**
 * Determine vaccine status from scheduled date and given date
 */
export function getVaccineStatus(scheduledDate, givenDate) {
    if (givenDate) return 'completed';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sched = new Date(scheduledDate);
    sched.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((sched - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 7) return 'due';
    return 'upcoming';
}

/**
 * Get number of days overdue (negative if not yet due)
 */
export function getDaysOverdue(scheduledDate) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const sched = new Date(scheduledDate);
    sched.setHours(0, 0, 0, 0);
    return Math.floor((now - sched) / (1000 * 60 * 60 * 24));
}

// ═══════════════════════════════════════════════════
// CRUD OPERATIONS
// ═══════════════════════════════════════════════════

/**
 * Get all vaccinations for a patient
 */
export async function getVaccinations(patientId) {
    const colRef = collection(db, PATIENTS, patientId, VACCINATIONS);
    const snap = await getDocs(colRef);
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
            const sa = new Date(a.scheduledDate || 0).getTime();
            const sb = new Date(b.scheduledDate || 0).getTime();
            return sa - sb;
        });
}

/**
 * Mark a vaccine as given
 */
export async function markVaccineGiven(patientId, vaccineDocId, data) {
    const docRef = doc(db, PATIENTS, patientId, VACCINATIONS, vaccineDocId);
    await updateDoc(docRef, {
        status: 'completed',
        givenDate: data.givenDate || new Date().toISOString(),
        notes: data.notes || '',
        updatedBy: data.updatedBy || '',
        updatedAt: Timestamp.now(),
    });
}

/**
 * Auto-schedule child vaccines based on date of birth
 */
export async function autoScheduleChildVaccines(patientId, dateOfBirth, createdBy) {
    const dob = new Date(dateOfBirth);
    const batch = writeBatch(db);
    const colRef = collection(db, PATIENTS, patientId, VACCINATIONS);

    // Check existing vaccines first
    const existing = await getVaccinations(patientId);
    const existingKeys = new Set(existing.map(v => v.vaccineKey));

    let scheduled = 0;
    CHILD_VACCINES.forEach(vax => {
        if (existingKeys.has(vax.key)) return; // Skip already scheduled

        const scheduledDate = new Date(dob);
        scheduledDate.setDate(scheduledDate.getDate() + (vax.weeksDue * 7));

        const newDocRef = doc(colRef);
        batch.set(newDocRef, {
            vaccineKey: vax.key,
            vaccineName: vax.name,
            doseNumber: vax.dose,
            category: 'child',
            scheduledDate: scheduledDate.toISOString(),
            givenDate: null,
            status: getVaccineStatus(scheduledDate, null),
            notes: '',
            createdBy: createdBy || '',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        scheduled++;
    });

    if (scheduled > 0) await batch.commit();
    return scheduled;
}

/**
 * Auto-schedule maternal vaccines based on registration date
 */
export async function autoScheduleMaternalVaccines(patientId, registrationDate, createdBy) {
    const regDate = new Date(registrationDate);
    const batch = writeBatch(db);
    const colRef = collection(db, PATIENTS, patientId, VACCINATIONS);

    // Check existing vaccines first
    const existing = await getVaccinations(patientId);
    const existingKeys = new Set(existing.map(v => v.vaccineKey));

    let scheduled = 0;
    MATERNAL_VACCINES.forEach(vax => {
        if (existingKeys.has(vax.key)) return;

        const scheduledDate = new Date(regDate);
        scheduledDate.setDate(scheduledDate.getDate() + (vax.weeksDue * 7));

        const newDocRef = doc(colRef);
        batch.set(newDocRef, {
            vaccineKey: vax.key,
            vaccineName: vax.name,
            doseNumber: vax.dose,
            category: 'maternal',
            scheduledDate: scheduledDate.toISOString(),
            givenDate: null,
            status: getVaccineStatus(scheduledDate, null),
            notes: '',
            createdBy: createdBy || '',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
        });
        scheduled++;
    });

    if (scheduled > 0) await batch.commit();
    return scheduled;
}

/**
 * Get ALL due/overdue vaccinations across ALL patients (for dashboard widget)
 * Returns enriched records with patient info
 */
export async function getAllDueVaccinations() {
    const patientsSnap = await getDocs(collection(db, PATIENTS));
    const results = [];

    await Promise.all(patientsSnap.docs.map(async (patDoc) => {
        const patData = patDoc.data();
        const vaxSnap = await getDocs(collection(db, PATIENTS, patDoc.id, VACCINATIONS));
        vaxSnap.docs.forEach(vaxDoc => {
            const vax = vaxDoc.data();
            if (vax.givenDate) return; // Already completed

            const status = getVaccineStatus(vax.scheduledDate, null);
            if (status === 'due' || status === 'overdue') {
                results.push({
                    id: vaxDoc.id,
                    ...vax,
                    patientDocId: patDoc.id,
                    patientName: patData.name || '',
                    patientAge: patData.age || '',
                    patientVillage: patData.village || '',
                    patientContact: patData.contact || '',
                    computedStatus: status,
                    daysOverdue: getDaysOverdue(vax.scheduledDate),
                });
            }
        });
    }));

    // Sort: overdue first (most overdue at top), then due
    return results.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Build WhatsApp reminder URL (pre-filled, does not auto-send)
 */
export function buildVaccineReminderURL(patientName, vaccineName, scheduledDate, phone) {
    const dateStr = new Date(scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const message = encodeURIComponent(
        `Namaste! Reminder for ${patientName}:\n\n` +
        `💉 Vaccine: ${vaccineName}\n` +
        `📅 Due Date: ${dateStr}\n\n` +
        `Please visit your nearest PHC/Sub-centre.\n` +
        `— CareBridge ASHA Worker`
    );
    const cleanPhone = (phone || '').replace(/\D/g, '');
    return `https://wa.me/${cleanPhone ? '91' + cleanPhone : ''}?text=${message}`;
}
