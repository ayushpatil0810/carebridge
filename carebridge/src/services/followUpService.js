// ============================================================
// Follow-Up Service — Scheduling + Reminders
// ============================================================

import { db } from '../firebase';
import {
    collection,
    addDoc,
    getDocs,
    updateDoc,
    doc,
    query,
    where,
    orderBy,
    Timestamp,
} from 'firebase/firestore';

const COLLECTION = 'followUps';

/**
 * Schedule a follow-up for a patient
 */
export async function scheduleFollowUp({
    patientId,
    patientName,
    patientVillage,
    visitId,
    followUpDate,    // 'YYYY-MM-DD'
    followUpTime,    // 'HH:MM'
    reason,
    scheduledBy,
    scheduledByName,
}) {
    const docRef = await addDoc(collection(db, COLLECTION), {
        patientId,
        patientName: patientName || '',
        patientVillage: patientVillage || '',
        visitId: visitId || null,
        followUpDate,
        followUpTime: followUpTime || '09:00',
        reason: reason || 'General check-up',
        scheduledBy,
        scheduledByName: scheduledByName || '',
        status: 'pending',       // pending | completed | missed
        reminderSent: false,
        createdAt: Timestamp.now(),
    });
    return docRef.id;
}

/**
 * Get all follow-ups for a user (ASHA)
 */
export async function getFollowUpsByUser(userId) {
    const q = query(
        collection(db, COLLECTION),
        where('scheduledBy', '==', userId),
        orderBy('followUpDate', 'asc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get follow-ups due on a specific date
 */
export async function getFollowUpsDueOn(userId, dateStr) {
    const q = query(
        collection(db, COLLECTION),
        where('scheduledBy', '==', userId),
        where('followUpDate', '==', dateStr),
        where('status', '==', 'pending')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Mark follow-up as completed
 */
export async function completeFollowUp(followUpId) {
    await updateDoc(doc(db, COLLECTION, followUpId), {
        status: 'completed',
        completedAt: Timestamp.now(),
    });
}

/**
 * Mark follow-up reminder as sent
 */
export async function markReminderSent(followUpId) {
    await updateDoc(doc(db, COLLECTION, followUpId), {
        reminderSent: true,
        reminderSentAt: Timestamp.now(),
    });
}

/**
 * Today's date as YYYY-MM-DD string
 */
export function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
