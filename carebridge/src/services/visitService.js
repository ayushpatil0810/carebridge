// ============================================================
// Visit Service — Firestore CRUD for visits collection
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
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'visits';

/**
 * Create a new visit record
 */
export async function createVisit(data) {
    const visit = {
        patientId: data.patientId,
        patientDocId: data.patientDocId,
        patientName: data.patientName || '',
        patientAge: data.patientAge || '',
        patientVillage: data.patientVillage || '',
        chiefComplaint: data.chiefComplaint,
        symptomDuration: data.symptomDuration || '',
        vitals: {
            respiratoryRate: data.vitals.respiratoryRate || null,
            pulseRate: data.vitals.pulseRate || null,
            temperature: data.vitals.temperature || null,
            spo2: data.vitals.spo2 || null,
            systolicBP: data.vitals.systolicBP || null,
        },
        consciousness: data.consciousness || 'Alert',
        redFlags: data.redFlags || [],
        news2Score: data.news2Score ?? null,
        news2Breakdown: data.news2Breakdown || [],
        riskLevel: data.riskLevel || '',
        advisory: data.advisory || '',
        status: 'Completed',
        doctorNote: '',
        emergencyFlag: false,
        createdAt: serverTimestamp(),
        createdBy: data.createdBy || '',
        reviewedAt: null,
        reviewedBy: '',
    };

    const docRef = await addDoc(collection(db, COLLECTION), visit);
    return { id: docRef.id, ...visit };
}

/**
 * Get visits for a specific patient
 */
export async function getVisitsByPatient(patientDocId) {
    const q = query(
        collection(db, COLLECTION),
        where('patientDocId', '==', patientDocId),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
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
export async function requestPHCReview(visitId, isEmergency = false) {
    const docRef = doc(db, COLLECTION, visitId);
    await updateDoc(docRef, {
        status: 'Pending PHC Review',
        emergencyFlag: isEmergency,
        reviewRequestedAt: serverTimestamp(),
    });
}

/**
 * Submit PHC doctor review
 */
export async function submitDoctorReview(visitId, reviewData) {
    const docRef = doc(db, COLLECTION, visitId);
    await updateDoc(docRef, {
        status: reviewData.action || 'Reviewed',
        doctorNote: reviewData.doctorNote || '',
        reviewedBy: reviewData.reviewedBy || '',
        reviewedAt: serverTimestamp(),
    });
}

/**
 * Get all pending PHC reviews
 */
export async function getPendingReviews() {
    const q = query(
        collection(db, COLLECTION),
        where('status', '==', 'Pending PHC Review'),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get all visits (for dashboard)
 */
export async function getAllVisits() {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get today's visits
 */
export async function getTodayVisits() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
        collection(db, COLLECTION),
        where('createdAt', '>=', today),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}
