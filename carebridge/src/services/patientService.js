// ============================================================
// Patient Service — Firestore CRUD for patients collection
// ============================================================

import {
    collection,
    doc,
    addDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'patients';

/**
 * Generate a simple family ID from house number + village
 */
function generateFamilyId(houseNumber, village) {
    const houseClean = String(houseNumber).trim().toLowerCase().replace(/\s+/g, '');
    const villageClean = String(village).trim().toLowerCase().replace(/\s+/g, '');
    return `FAM-${villageClean}-${houseClean}`;
}

/**
 * Generate a short patient ID
 */
function generatePatientId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = 'PAT-';
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

/**
 * Register a new patient
 */
export async function registerPatient(data) {
    const patientId = generatePatientId();
    const familyId = generateFamilyId(data.houseNumber, data.village);

    const patient = {
        patientId,
        name: data.name,
        age: Number(data.age),
        gender: data.gender,
        houseNumber: data.houseNumber,
        village: data.village,
        familyId,
        abhaId: data.abhaId || '',
        contact: data.contact || '',
        createdAt: serverTimestamp(),
        createdBy: data.createdBy || '',
    };

    const docRef = await addDoc(collection(db, COLLECTION), patient);
    return { id: docRef.id, ...patient };
}

/**
 * Get a patient by Firestore document ID
 */
export async function getPatientById(docId) {
    const docRef = doc(db, COLLECTION, docId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/**
 * Search patients by various fields
 */
export async function searchPatients(searchTerm, searchField = 'name') {
    let q;

    if (searchField === 'name') {
        // Firestore doesn't support native full-text search,
        // so we fetch all and filter client-side for name search
        q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    } else if (searchField === 'patientId') {
        q = query(collection(db, COLLECTION), where('patientId', '==', searchTerm));
    } else if (searchField === 'houseNumber') {
        q = query(collection(db, COLLECTION), where('houseNumber', '==', searchTerm));
    } else if (searchField === 'familyId') {
        q = query(collection(db, COLLECTION), where('familyId', '==', searchTerm.toLowerCase()));
    } else {
        q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    }

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side name filtering
    if (searchField === 'name' && searchTerm) {
        const term = searchTerm.toLowerCase();
        results = results.filter(p => p.name.toLowerCase().includes(term));
    }

    return results;
}

/**
 * Get all patients (for dashboard counts)
 */
export async function getAllPatients() {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
}
