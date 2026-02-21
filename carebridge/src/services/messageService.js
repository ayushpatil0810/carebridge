// ============================================================
// Message Service — Logging, Templates, WhatsApp
// ============================================================

import { db } from '../firebase';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    Timestamp,
} from 'firebase/firestore';

const MSG_COLLECTION = 'messageLogs';

// ────────────────────────────────────────────────────────
// 1. Message Templates
// ────────────────────────────────────────────────────────

export const TRIGGER_TEMPLATES = {
    green: {
        trigger: 'Visit completed — Low Risk (Green)',
        label: 'Send Monitoring Advice?',
        message: 'Namaste. Please continue hydration and rest. If symptoms worsen, contact ASHA immediately.',
        messageMarathi: 'नमस्कार. कृपया पाणी पित राहा आणि विश्रांती घ्या. लक्षणे वाढल्यास आशा कार्यकर्त्याशी त्वरित संपर्क साधा.',
        type: 'monitoring_advice',
    },
    yellow: {
        trigger: 'Case closed — Moderate Risk (Yellow)',
        label: 'Send Recheck Reminder?',
        message: 'Please recheck temperature and breathing after 4 hours. Inform ASHA if no improvement.',
        messageMarathi: 'कृपया 4 तासांनंतर तापमान आणि श्वासोच्छ्वास तपासा. सुधारणा न झाल्यास आशा कार्यकर्त्याला कळवा.',
        type: 'recheck_reminder',
    },
    red: {
        trigger: 'Referral Approved — High Risk (Red)',
        label: 'Send Referral Message?',
        message: 'Medical Officer has advised immediate referral to PHC. Please visit as soon as possible.',
        messageMarathi: 'वैद्यकीय अधिकाऱ्यांनी PHC ला तात्काळ रेफरल दिले आहे. कृपया लवकरात लवकर भेट द्या.',
        type: 'referral_notice',
    },
};

export const HEALTH_TEMPLATES = [
    {
        id: 'dengue',
        category: 'Prevention',
        title: 'Dengue Prevention',
        titleMarathi: 'डेंग्यू प्रतिबंध',
        message: 'Prevent dengue: Remove stagnant water around your home. Use mosquito nets while sleeping. If you have high fever with body pain, contact ASHA immediately.',
        messageMarathi: 'डेंग्यू प्रतिबंध: घराभोवती साचलेले पाणी काढून टाका. झोपताना मच्छरदाणी वापरा. तीव्र ताप आणि अंगदुखी असल्यास आशा कार्यकर्त्याशी त्वरित संपर्क साधा.',
        icon: '🦟',
    },
    {
        id: 'heatstroke',
        category: 'Prevention',
        title: 'Heatstroke Awareness',
        titleMarathi: 'उष्माघात जागरूकता',
        message: 'Avoid going out in peak sun hours (12-3 PM). Drink plenty of water. Wear loose cotton clothes. If you feel dizzy or have headache, rest in shade and hydrate.',
        messageMarathi: 'दुपारी 12-3 दरम्यान उन्हात जाणे टाळा. भरपूर पाणी प्या. सैल सुती कपडे घाला. चक्कर आल्यास किंवा डोकेदुखी असल्यास सावलीत विश्रांती घ्या.',
        icon: '☀️',
    },
    {
        id: 'vaccination',
        category: 'Reminder',
        title: 'Vaccination Reminder',
        titleMarathi: 'लसीकरण स्मरण',
        message: 'Reminder: Your child\'s vaccination is due. Please visit the nearest health center with the vaccination card. Vaccines are free and essential for your child\'s health.',
        messageMarathi: 'स्मरण: तुमच्या मुलाचे लसीकरण बाकी आहे. कृपया लसीकरण कार्डसह जवळच्या आरोग्य केंद्राला भेट द्या. लसी मोफत आहेत.',
        icon: '💉',
    },
    {
        id: 'tb_followup',
        category: 'Follow-Up',
        title: 'TB Follow-Up Reminder',
        titleMarathi: 'टीबी पाठपुरावा',
        message: 'Continue taking your TB medicines regularly. Do not stop even if you feel better. Visit the health center for your monthly check-up. Contact ASHA for any side effects.',
        messageMarathi: 'टीबीची औषधे नियमित घेत रहा. बरे वाटले तरी थांबू नका. मासिक तपासणीसाठी आरोग्य केंद्राला भेट द्या.',
        icon: '💊',
    },
    {
        id: 'pregnancy',
        category: 'Reminder',
        title: 'Pregnancy Check-Up',
        titleMarathi: 'गर्भधारणा तपासणी',
        message: 'Reminder: Regular antenatal check-ups are important for a healthy pregnancy. Please visit PHC for your scheduled check-up. Take iron and folic acid tablets daily.',
        messageMarathi: 'स्मरण: निरोगी गर्भधारणेसाठी नियमित तपासणी महत्त्वाची आहे. कृपया नियोजित तपासणीसाठी PHC ला भेट द्या. लोह आणि फॉलिक ऍसिड गोळ्या दररोज घ्या.',
        icon: '🤰',
    },
    {
        id: 'followup_general',
        category: 'Follow-Up',
        title: 'General Follow-Up',
        titleMarathi: 'सामान्य पाठपुरावा',
        message: 'Reminder: Your follow-up visit is due. Please visit the health center or contact your ASHA worker for a home visit.',
        messageMarathi: 'स्मरण: तुमची पाठपुरावा भेट बाकी आहे. कृपया आरोग्य केंद्राला भेट द्या किंवा गृहभेटीसाठी आशा कार्यकर्त्याशी संपर्क साधा.',
        icon: '📋',
    },
];

// ────────────────────────────────────────────────────────
// 2. Message Logging (Firestore)
// ────────────────────────────────────────────────────────

/**
 * Log a sent message
 */
export async function logMessage({
    patientId,
    patientName,
    messageType,
    messageText,
    sentBy,
    sentByName,
    visitId = null,
    channel = 'whatsapp',
}) {
    const doc = await addDoc(collection(db, MSG_COLLECTION), {
        patientId,
        patientName: patientName || '',
        messageType,
        messageText,
        sentBy,
        sentByName: sentByName || '',
        visitId,
        channel,
        sentAt: Timestamp.now(),
    });
    return doc.id;
}

/**
 * Get all message logs (ordered by most recent)
 */
export async function getMessageLogs() {
    const q = query(collection(db, MSG_COLLECTION), orderBy('sentAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get message logs for a specific ASHA worker
 */
export async function getMessageLogsByUser(userId) {
    const q = query(
        collection(db, MSG_COLLECTION),
        where('sentBy', '==', userId),
        orderBy('sentAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get message logs linked to a specific visit
 */
export async function getMessageLogsByVisit(visitId) {
    const q = query(
        collection(db, MSG_COLLECTION),
        where('visitId', '==', visitId),
        orderBy('sentAt', 'desc')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ────────────────────────────────────────────────────────
// 3. WhatsApp Deep-Link
// ────────────────────────────────────────────────────────

/**
 * Generate a WhatsApp deep-link
 * @param {string} phone - 10-digit Indian phone number
 * @param {string} message - Pre-filled message
 * @returns {string} WhatsApp URL
 */
export function getWhatsAppLink(phone, message) {
    // Clean phone — remove spaces, dashes, leading 0 or +91
    let cleaned = (phone || '').replace(/[\s\-()]/g, '');
    if (cleaned.startsWith('+91')) cleaned = cleaned.slice(3);
    if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.slice(2);
    if (cleaned.startsWith('0')) cleaned = cleaned.slice(1);

    const encoded = encodeURIComponent(message);
    return `https://wa.me/91${cleaned}?text=${encoded}`;
}
