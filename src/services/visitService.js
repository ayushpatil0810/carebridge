// ============================================================
// Visit Service — Firestore CRUD for visits collection
// Enhanced with monitoring, clarification, audit, stats
// ============================================================

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "visits";

/**
 * Create a new visit record
 */
export async function createVisit(data) {
  const visit = {
    patientId: data.patientId,
    patientDocId: data.patientDocId,
    patientName: data.patientName || "",
    patientAge: data.patientAge || "",
    patientGender: data.patientGender || "",
    patientVillage: data.patientVillage || "",
    patientHouseNumber: data.patientHouseNumber || "",
    chiefComplaint: data.chiefComplaint,
    symptomDuration: data.symptomDuration || "",
    vitals: {
      respiratoryRate: data.vitals.respiratoryRate || null,
      pulseRate: data.vitals.pulseRate || null,
      temperature: data.vitals.temperature || null,
      spo2: data.vitals.spo2 || null,
      systolicBP: data.vitals.systolicBP || null,
    },
    consciousness: data.consciousness || "Alert",
    redFlags: data.redFlags || [],
    news2Score: data.news2Score ?? null,
    news2Breakdown: data.news2Breakdown || [],
    riskLevel: data.riskLevel || "",
    advisory: data.advisory || "",
    status: "Completed",
    doctorNote: "",
    emergencyFlag: false,
    createdAt: serverTimestamp(),
    createdBy: data.createdBy || "",
    createdByName: data.createdByName || "",
    reviewedAt: null,
    reviewedBy: "",
    reviewRequestedAt: null,
    // Monitoring fields
    monitoringPeriod: null,
    monitoringStartedAt: null,
    recheckInstruction: "",
    // Clarification fields
    clarificationMessage: "",
    clarificationResponse: "",
    clarificationRequestedAt: null,
    clarificationRespondedAt: null,
    // Audit
    responseTimeMs: null,
    auditTrail: [],
    // SBAR (Sarvam AI)
    sbarEnglish: "",
    sbarTranslated: null,
    rawNotes: data.chiefComplaint || "",
    aiGenerated: false,
  };

  const docRef = await addDoc(collection(db, COLLECTION), visit);
  return { id: docRef.id, ...visit };
}

/**
 * Update visit with SBAR summary (called after AI generation)
 */
export async function updateVisitSBAR(visitId, sbarData) {
  const docRef = doc(db, COLLECTION, visitId);
  await updateDoc(docRef, {
    sbarEnglish: sbarData.sbarEnglish || "",
    sbarTranslated: sbarData.sbarTranslated || null,
    aiGenerated: sbarData.aiGenerated || false,
    rawNotes: sbarData.rawNotes || "",
  });
}

/**
 * Get visits for a specific patient
 */
export async function getVisitsByPatient(patientDocId) {
  const q = query(
    collection(db, COLLECTION),
    where("patientDocId", "==", patientDocId),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get recent visits for a patient within the last N hours (default 48)
 */
export async function getRecentVisitsByPatient(patientDocId, hoursAgo = 48) {
  const cutoff = Timestamp.fromDate(
    new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
  );
  const q = query(
    collection(db, COLLECTION),
    where("patientDocId", "==", patientDocId),
    where("createdAt", ">=", cutoff),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get a visit by document ID
 */
export async function getVisitById(docId) {
  const docRef = doc(db, COLLECTION, docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Request PHC review for a visit
 */
export async function requestPHCReview(
  visitId,
  isEmergency = false,
  escalationContext = [],
) {
  const docRef = doc(db, COLLECTION, visitId);
  await updateDoc(docRef, {
    status: "Pending PHC Review",
    emergencyFlag: isEmergency,
    escalationContext:
      escalationContext.length > 0
        ? escalationContext
        : ["Clinical assessment"],
    reviewRequestedAt: serverTimestamp(),
  });
}

/**
 * Submit PHC doctor review — supports 3 actions
 * Action: 'Referral Approved' | 'Under Monitoring' | 'Awaiting ASHA Response' | 'Reviewed'
 */
export async function submitDoctorReview(visitId, reviewData) {
  const docRef = doc(db, COLLECTION, visitId);
  const now = new Date();

  // Calculate response time
  const visitSnap = await getDoc(docRef);
  const visitData = visitSnap.data();
  let responseTimeMs = null;
  if (visitData?.reviewRequestedAt) {
    const requestTime = visitData.reviewRequestedAt.toDate
      ? visitData.reviewRequestedAt.toDate()
      : new Date(visitData.reviewRequestedAt);
    responseTimeMs = now.getTime() - requestTime.getTime();
  }

  // Build audit entry with full justification logging
  const auditEntry = {
    action: reviewData.action || "Reviewed",
    by: reviewData.reviewedBy || "",
    note: reviewData.doctorNote || "",
    timestamp: now.toISOString(),
    responseTimeMs,
    news2Score: visitData?.news2Score ?? null,
    riskLevel: visitData?.riskLevel || "",
    redFlags: visitData?.redFlags || [],
    escalationContext: visitData?.escalationContext || [],
  };

  // Add decision-specific fields to audit
  if (reviewData.referralReason)
    auditEntry.referralReason = reviewData.referralReason;
  if (reviewData.clarificationType)
    auditEntry.clarificationType = reviewData.clarificationType;

  const existingTrail = visitData?.auditTrail || [];

  const updateData = {
    status: reviewData.action || "Reviewed",
    doctorNote: reviewData.doctorNote || "",
    reviewedBy: reviewData.reviewedBy || "",
    reviewedAt: serverTimestamp(),
    responseTimeMs,
    auditTrail: [...existingTrail, auditEntry],
  };

  // Referral-specific fields
  if (reviewData.action === "Referral Approved") {
    updateData.referralReason = reviewData.referralReason || "";
  }

  // Monitoring-specific fields
  if (reviewData.action === "Under Monitoring") {
    updateData.monitoringPeriod = reviewData.monitoringPeriod || "24h";
    updateData.monitoringStartedAt = serverTimestamp();
    updateData.recheckInstruction = reviewData.recheckInstruction || "";
  }

  // Clarification-specific fields
  if (reviewData.action === "Awaiting ASHA Response") {
    updateData.clarificationMessage = reviewData.clarificationMessage || "";
    updateData.clarificationType = reviewData.clarificationType || "";
    updateData.clarificationRequestedAt = serverTimestamp();
  }

  await updateDoc(docRef, updateData);
}

/**
 * ASHA responds to a clarification request — case re-enters PHC queue
 */
export async function respondToClarification(visitId, response) {
  const docRef = doc(db, COLLECTION, visitId);
  const visitSnap = await getDoc(docRef);
  const visitData = visitSnap.data();
  const existingTrail = visitData?.auditTrail || [];

  const auditEntry = {
    action: "Clarification Responded",
    by: response.respondedBy || "",
    note: response.responseText || "",
    timestamp: new Date().toISOString(),
  };

  await updateDoc(docRef, {
    status: "Pending PHC Review",
    clarificationResponse: response.responseText || "",
    clarificationRespondedAt: serverTimestamp(),
    auditTrail: [...existingTrail, auditEntry],
  });
}

/**
 * Get all pending PHC reviews
 */
export async function getPendingReviews() {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "Pending PHC Review"),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get monitoring cases
 */
export async function getMonitoringCases() {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "Under Monitoring"),
    orderBy("monitoringStartedAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get cases awaiting ASHA response (admin/PHC — no user filter)
 */
export async function getClarificationCases() {
  const q = query(
    collection(db, COLLECTION),
    where("status", "==", "Awaiting ASHA Response"),
    orderBy("clarificationRequestedAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get clarification cases for a specific ASHA worker
 */
export async function getClarificationCasesByUser(userId) {
  const q = query(
    collection(db, COLLECTION),
    where("createdBy", "==", userId),
    where("status", "==", "Awaiting ASHA Response"),
    orderBy("clarificationRequestedAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get all visits (admin/PHC — no user filter)
 */
export async function getAllVisits() {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get visits created by a specific ASHA worker
 */
export async function getVisitsByUser(userId) {
  const q = query(
    collection(db, COLLECTION),
    where("createdBy", "==", userId),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get today's visits
 */
export async function getTodayVisits() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, COLLECTION),
    where("createdAt", ">=", today),
    orderBy("createdAt", "desc"),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---- Utility Functions ----

/**
 * Sort visits by clinical priority (intelligent queue):
 * 1. Emergency flagged
 * 2. High NEWS2 score (≥7)
 * 3. Repeat escalation (patient escalated multiple times)
 * 4. Risk level (Red → Yellow → Green)
 * 5. Oldest pending first
 */
export function sortByPriority(visits) {
  // Pre-compute repeat escalation counts
  const patientEscalationCount = {};
  visits.forEach((v) => {
    const pid = v.patientId || v.patientDocId;
    if (pid)
      patientEscalationCount[pid] = (patientEscalationCount[pid] || 0) + 1;
  });

  const riskOrder = { Red: 0, Yellow: 1, Green: 2, "": 3 };
  return [...visits].sort((a, b) => {
    // 1. Emergency first
    if (a.emergencyFlag && !b.emergencyFlag) return -1;
    if (!a.emergencyFlag && b.emergencyFlag) return 1;
    // 2. High NEWS2 (≥7) gets priority
    const aHighNEWS2 = (a.news2Score || 0) >= 7 ? 1 : 0;
    const bHighNEWS2 = (b.news2Score || 0) >= 7 ? 1 : 0;
    if (aHighNEWS2 !== bHighNEWS2) return bHighNEWS2 - aHighNEWS2;
    // 3. Repeat escalation cases
    const aPid = a.patientId || a.patientDocId;
    const bPid = b.patientId || b.patientDocId;
    const aRepeat = (patientEscalationCount[aPid] || 0) > 1 ? 1 : 0;
    const bRepeat = (patientEscalationCount[bPid] || 0) > 1 ? 1 : 0;
    if (aRepeat !== bRepeat) return bRepeat - aRepeat;
    // 4. Risk level
    const riskDiff =
      (riskOrder[a.riskLevel] ?? 3) - (riskOrder[b.riskLevel] ?? 3);
    if (riskDiff !== 0) return riskDiff;
    // 5. Oldest first (longest waiting)
    const aTime =
      a.reviewRequestedAt?.toDate?.() || a.createdAt?.toDate?.() || new Date(0);
    const bTime =
      b.reviewRequestedAt?.toDate?.() || b.createdAt?.toDate?.() || new Date(0);
    return aTime - bTime;
  });
}

/**
 * Calculate ASHA performance stats from all visits
 */
export function calculateASHAStats(visits) {
  const stats = {};

  visits.forEach((v) => {
    const ashaName = v.createdByName || v.createdBy || "Unknown";
    if (!stats[ashaName]) {
      stats[ashaName] = {
        name: ashaName,
        totalCases: 0,
        approvedReferrals: 0,
        reviewedCases: 0,
        totalResponseTimeMs: 0,
        responseTimeCount: 0,
      };
    }
    stats[ashaName].totalCases++;
    if (v.status === "Referral Approved") stats[ashaName].approvedReferrals++;
    if (
      v.reviewedAt ||
      v.status === "Reviewed" ||
      v.status === "Referral Approved"
    ) {
      stats[ashaName].reviewedCases++;
    }
    if (v.responseTimeMs) {
      stats[ashaName].totalResponseTimeMs += v.responseTimeMs;
      stats[ashaName].responseTimeCount++;
    }
  });

  return Object.values(stats).map((s) => ({
    ...s,
    avgResponseTimeMs:
      s.responseTimeCount > 0
        ? Math.round(s.totalResponseTimeMs / s.responseTimeCount)
        : null,
    approvalRate:
      s.reviewedCases > 0
        ? Math.round((s.approvedReferrals / s.reviewedCases) * 100)
        : 0,
  }));
}

/**
 * Get unique villages from visits
 */
export function getUniqueVillages(visits) {
  return [
    ...new Set(visits.map((v) => v.patientVillage).filter(Boolean)),
  ].sort();
}

/**
 * Get unique ASHA worker names from visits
 */
export function getUniqueASHANames(visits) {
  return [
    ...new Set(
      visits.map((v) => v.createdByName || v.createdBy).filter(Boolean),
    ),
  ].sort();
}

/**
 * Format milliseconds to human-readable duration
 */
export function formatDuration(ms) {
  if (!ms) return "—";
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

/**
 * Time since a timestamp (for queue display)
 */
export function timeSince(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const ms = Date.now() - date.getTime();
  return formatDuration(ms);
}
