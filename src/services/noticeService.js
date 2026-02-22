// ============================================================
// Notice Service — Firestore CRUD for admin notices to PHCs
// ============================================================

import {
    collection,
    doc,
    addDoc,
    getDocs,
    updateDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'notices';

/**
 * Create a new administrative notice
 */
export async function createNotice(data) {
    const notice = {
        targetPHC: data.targetPHC || '',
        type: data.type || 'notice', // 'notice' | 'flag' | 'comment'
        message: data.message || '',
        createdBy: data.createdBy || '',
        createdByName: data.createdByName || '',
        createdAt: serverTimestamp(),
        acknowledged: false,
        acknowledgedAt: null,
        acknowledgedBy: '',
        responseNote: '',
        followUpStatus: 'pending', // 'pending' | 'acknowledged' | 'resolved'
    };

    const docRef = await addDoc(collection(db, COLLECTION), notice);
    return { id: docRef.id, ...notice };
}

/**
 * Get all notices (admin view)
 */
export async function getAllNotices() {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Get notices for a specific PHC
 */
export async function getNoticesByPHC(phcName) {
    const q = query(
        collection(db, COLLECTION),
        where('targetPHC', '==', phcName),
        orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * Acknowledge a notice (PHC doctor action)
 */
export async function acknowledgeNotice(noticeId, acknowledgedBy, responseNote = '') {
    const docRef = doc(db, COLLECTION, noticeId);
    await updateDoc(docRef, {
        acknowledged: true,
        acknowledgedAt: serverTimestamp(),
        acknowledgedBy,
        responseNote,
        followUpStatus: responseNote ? 'resolved' : 'acknowledged',
    });
}

/**
 * Update follow-up status
 */
export async function updateFollowUpStatus(noticeId, status) {
    const docRef = doc(db, COLLECTION, noticeId);
    await updateDoc(docRef, {
        followUpStatus: status,
    });
}
