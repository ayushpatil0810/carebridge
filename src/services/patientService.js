// ============================================================
// Patient Service — Firestore CRUD for patients collection
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
} from "firebase/firestore";
import { db } from "../firebase";

const COLLECTION = "patients";

/**
 * Generate a simple family ID from house number + village
 */
function generateFamilyId(houseNumber, village) {
  const houseClean = String(houseNumber)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  const villageClean = String(village).trim().toLowerCase().replace(/\s+/g, "");
  return `FAM-${villageClean}-${houseClean}`;
}

/**
 * Generate a short patient ID
 */
function generatePatientId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "PAT-";
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
    abhaId: data.abhaId || "",
    abhaLinked: Boolean(data.abhaId && data.abhaId.trim()),
    contact: data.contact || "",
    createdAt: serverTimestamp(),
    createdBy: data.createdBy || "",
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
 * Search patients by various fields.
 * If userId is provided, results are scoped to that ASHA worker's patients.
 */
export async function searchPatients(
  searchTerm,
  searchField = "name",
  userId = null,
) {
  const filters = [];
  if (userId) filters.push(where("createdBy", "==", userId));

  let q;
  let useFallback = false;

  try {
    if (searchField === "name") {
      q = query(
        collection(db, COLLECTION),
        ...filters,
        orderBy("createdAt", "desc"),
      );
    } else if (searchField === "patientId") {
      q = query(
        collection(db, COLLECTION),
        ...filters,
        where("patientId", "==", searchTerm),
      );
    } else if (searchField === "houseNumber") {
      q = query(
        collection(db, COLLECTION),
        ...filters,
        where("houseNumber", "==", searchTerm),
      );
    } else if (searchField === "familyId") {
      q = query(
        collection(db, COLLECTION),
        ...filters,
        where("familyId", "==", searchTerm.toLowerCase()),
      );
    } else {
      q = query(
        collection(db, COLLECTION),
        ...filters,
        orderBy("createdAt", "desc"),
      );
    }

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Client-side name filtering
    if (searchField === "name" && searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter((p) => p.name.toLowerCase().includes(term));
    }

    return results;
  } catch (err) {
    // Fallback for missing composite index
    console.warn(
      "searchPatients: index likely missing, falling back.",
      err.message,
    );
    q = query(collection(db, COLLECTION), ...filters);
    const snapshot = await getDocs(q);
    let results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (searchField === "name" && searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter((p) => p.name.toLowerCase().includes(term));
    } else if (searchField === "patientId") {
      results = results.filter((p) => p.patientId === searchTerm);
    } else if (searchField === "houseNumber") {
      results = results.filter((p) => p.houseNumber === searchTerm);
    } else if (searchField === "familyId") {
      results = results.filter((p) => p.familyId === searchTerm?.toLowerCase());
    }

    return results.sort((a, b) => {
      const ta = a.createdAt?.toDate
        ? a.createdAt.toDate()
        : new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate
        ? b.createdAt.toDate()
        : new Date(b.createdAt || 0);
      return tb - ta;
    });
  }
}

/**
 * Update an existing patient's demographic data
 */
export async function updatePatient(docId, data) {
  const docRef = doc(db, COLLECTION, docId);
  const updates = {};

  const editable = [
    "name",
    "age",
    "gender",
    "houseNumber",
    "village",
    "contact",
    "abhaId",
  ];
  for (const field of editable) {
    if (data[field] !== undefined) {
      updates[field] = field === "age" ? Number(data[field]) : data[field];
    }
  }

  // Recompute derived fields
  if (updates.houseNumber || updates.village) {
    const snap = await getDoc(docRef);
    const existing = snap.data();
    updates.familyId = generateFamilyId(
      updates.houseNumber || existing.houseNumber,
      updates.village || existing.village,
    );
  }
  if (updates.abhaId !== undefined) {
    updates.abhaLinked = Boolean(
      updates.abhaId && String(updates.abhaId).trim(),
    );
  }

  updates.updatedAt = serverTimestamp();
  await updateDoc(docRef, updates);
  return { id: docId, ...updates };
}

/**
 * Get all patients (admin / PHC — no user filter)
 */
export async function getAllPatients() {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get patients registered by a specific ASHA worker
 */
export async function getPatientsByUser(userId) {
  try {
    const q = query(
      collection(db, COLLECTION),
      where("createdBy", "==", userId),
      orderBy("createdAt", "desc"),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn(
      "getPatientsByUser: index likely missing, falling back.",
      err.message,
    );
    const q = query(
      collection(db, COLLECTION),
      where("createdBy", "==", userId),
    );
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    return results.sort((a, b) => {
      const ta = a.createdAt?.toDate
        ? a.createdAt.toDate()
        : new Date(a.createdAt || 0);
      const tb = b.createdAt?.toDate
        ? b.createdAt.toDate()
        : new Date(b.createdAt || 0);
      return tb - ta;
    });
  }
}
