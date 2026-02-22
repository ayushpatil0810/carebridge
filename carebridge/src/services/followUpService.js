// ============================================================
// Follow-Up Service — Scheduling + Reminders
// ============================================================

import { db } from "../firebase";
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
} from "firebase/firestore";

const COLLECTION = "followUps";

/**
 * Schedule a follow-up for a patient
 */
export async function scheduleFollowUp({
  patientId,
  patientName,
  patientVillage,
  patientContact,
  visitId,
  followUpDate, // 'YYYY-MM-DD'
  followUpTime, // 'HH:MM'
  reason,
  scheduledBy,
  scheduledByName,
}) {
  const docRef = await addDoc(collection(db, COLLECTION), {
    patientId,
    patientName: patientName || "",
    patientVillage: patientVillage || "",
    patientContact: patientContact || "",
    visitId: visitId || null,
    followUpDate,
    followUpTime: followUpTime || "09:00",
    reason: reason || "General check-up",
    scheduledBy,
    scheduledByName: scheduledByName || "",
    status: "pending", // pending | completed | missed
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
    where("scheduledBy", "==", userId),
    orderBy("followUpDate", "asc"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get follow-ups due on a specific date
 */
export async function getFollowUpsDueOn(userId, dateStr) {
  const q = query(
    collection(db, COLLECTION),
    where("scheduledBy", "==", userId),
    where("followUpDate", "==", dateStr),
    where("status", "==", "pending"),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Mark follow-up as completed
 */
export async function completeFollowUp(followUpId) {
  await updateDoc(doc(db, COLLECTION, followUpId), {
    status: "completed",
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
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Auto-mark overdue pending follow-ups as 'missed'
 * Call this on page load so the status stays accurate.
 */
export async function markMissedFollowUps(userId) {
  const today = todayStr();
  const q = query(
    collection(db, COLLECTION),
    where("scheduledBy", "==", userId),
    where("status", "==", "pending"),
  );
  const snap = await getDocs(q);
  const overdue = snap.docs.filter((d) => d.data().followUpDate < today);
  const updates = overdue.map((d) =>
    updateDoc(doc(db, COLLECTION, d.id), {
      status: "missed",
      missedAt: Timestamp.now(),
    }),
  );
  await Promise.all(updates);
  return overdue.length;
}

/**
 * Mark a missed follow-up back to pending (reschedule)
 */
export async function rescheduleFollowUp(followUpId, newDate, newTime) {
  await updateDoc(doc(db, COLLECTION, followUpId), {
    status: "pending",
    followUpDate: newDate,
    followUpTime: newTime || "09:00",
    reminderSent: false,
    rescheduledAt: Timestamp.now(),
  });
}
