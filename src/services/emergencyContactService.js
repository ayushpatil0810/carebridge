// ============================================================
// Emergency Contact Service — Firestore logging for emergency
// communication events (WhatsApp / Phone Call)
// ============================================================

import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  collectionGroup,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Log an emergency communication event to Firestore.
 *
 * Writes to: visits/{visitId}/communicationLogs
 *
 * @param {string} visitId - The visit/encounter document ID
 * @param {Object} data
 * @param {string} data.initiatedBy - "ASHA" | "PHC"
 * @param {string} data.method - "whatsapp" | "call"
 * @param {number} data.riskScore - NEWS2 score
 * @param {string} data.riskLevel - "Red" | "Yellow" | "Green"
 * @param {string} data.escalationStatus - Current visit status
 * @param {string} [data.patientId] - Patient identifier
 * @param {string} [data.patientName] - Patient name
 * @param {string} [data.village] - Village name
 * @param {string} [data.contactedName] - Name of person contacted
 * @param {string} [data.contactedPhone] - Phone number contacted
 */
export async function logEmergencyContact(visitId, data) {
  const logsRef = collection(db, "visits", visitId, "communicationLogs");
  await addDoc(logsRef, {
    initiatedBy: data.initiatedBy,
    method: data.method,
    riskScore: data.riskScore ?? null,
    riskLevel: data.riskLevel || "",
    escalationStatus: data.escalationStatus || "",
    patientId: data.patientId || "",
    patientName: data.patientName || "",
    village: data.village || "",
    contactedName: data.contactedName || "",
    contactedPhone: data.contactedPhone || "",
    timestamp: serverTimestamp(),
  });
}

/**
 * Get all communication logs for a specific visit.
 */
export async function getCommunicationLogs(visitId) {
  const logsRef = collection(db, "visits", visitId, "communicationLogs");
  const q = query(logsRef, orderBy("timestamp", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get total emergency contact count across ALL visits.
 * Uses collectionGroup query on "communicationLogs".
 */
export async function getEmergencyContactCount() {
  try {
    const q = query(collectionGroup(db, "communicationLogs"));
    const snap = await getDocs(q);
    return snap.size;
  } catch (err) {
    console.error("Error fetching emergency contact count:", err);
    return 0;
  }
}

/**
 * Build a WhatsApp deep link with pre-filled emergency message.
 *
 * @param {string} phoneNumber - 10-digit Indian mobile number
 * @param {Object} params
 * @param {string} params.patientId
 * @param {number} params.news2Score
 * @param {string} params.riskLevel
 * @param {string} params.village
 * @param {string} [params.escalationId]
 * @returns {string} WhatsApp URL
 */
export function buildWhatsAppLink(phoneNumber, params) {
  const cleanNumber = phoneNumber.replace(/\D/g, "");
  // Prepend India country code if not present
  const fullNumber = cleanNumber.startsWith("91")
    ? cleanNumber
    : `91${cleanNumber}`;

  const message = [
    `🚨 Emergency Case — CareBridge`,
    `Patient ID: ${params.patientId || "N/A"}`,
    `NEWS2 Score: ${params.news2Score ?? "N/A"} (${params.riskLevel || "N/A"} Risk)`,
    `Village: ${params.village || "N/A"}`,
    params.escalationId ? `Escalation ID: ${params.escalationId}` : "",
    `Please respond urgently.`,
  ]
    .filter(Boolean)
    .join("\n");

  return `https://wa.me/${fullNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Build a phone call deep link.
 *
 * @param {string} phoneNumber - 10-digit Indian mobile number
 * @returns {string} tel: URL
 */
export function buildCallLink(phoneNumber) {
  const cleanNumber = phoneNumber.replace(/\D/g, "");
  return `tel:${cleanNumber}`;
}
