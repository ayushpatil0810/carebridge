// ============================================================
// Message Suggest Modal — Trigger-based + WhatsApp deep-link
// ============================================================

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logMessage, getWhatsAppLink } from '../services/messageService';
import {
    Send,
    MessageSquare,
    X,
    CheckCircle2,
    ExternalLink,
} from 'lucide-react';

/**
 * Props:
 *   isOpen       — boolean
 *   onClose      — () => void
 *   template     — { label, message, messageMarathi, type }
 *   patient      — { patientId, name, phone, village }
 *   visitId      — string (linked visit)
 */
export default function MessageSuggestModal({ isOpen, onClose, template, patient, visitId }) {
    const { user, userName } = useAuth();
    const [messageText, setMessageText] = useState(template?.message || '');
    const [useMarathi, setUseMarathi] = useState(false);
    const [logging, setLogging] = useState(false);
    const [sent, setSent] = useState(false);

    if (!isOpen || !template) return null;

    const currentMessage = useMarathi
        ? (template.messageMarathi || template.message)
        : messageText;

    const handleSendWhatsApp = async () => {
        setLogging(true);
        try {
            // Log the message
            await logMessage({
                patientId: patient?.patientId || '',
                patientName: patient?.name || '',
                messageType: template.type,
                messageText: currentMessage,
                sentBy: user?.uid || '',
                sentByName: userName || '',
                visitId: visitId || null,
                channel: 'whatsapp',
            });

            // Open WhatsApp deep-link
            const phone = patient?.phone || patient?.contactNumber || '';
            if (phone) {
                window.open(getWhatsAppLink(phone, currentMessage), '_blank');
            }

            setSent(true);
        } catch (err) {
            console.error('Error logging message:', err);
        } finally {
            setLogging(false);
        }
    };

    const handleCopyText = () => {
        navigator.clipboard.writeText(currentMessage);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content msg-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <MessageSquare size={18} /> {template.label}
                    </h3>
                    <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
                </div>

                {sent ? (
                    <div className="msg-modal-success">
                        <CheckCircle2 size={48} color="var(--green)" strokeWidth={1.5} />
                        <h4>Message Logged Successfully</h4>
                        <p className="text-muted">WhatsApp has been opened with the pre-filled message. Press send in WhatsApp to deliver.</p>
                        <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '1rem' }}>Done</button>
                    </div>
                ) : (
                    <>
                        <div className="msg-modal-body">
                            <div className="msg-modal-patient-info">
                                <span style={{ fontWeight: 600 }}>{patient?.name || 'Patient'}</span>
                                {patient?.village && <span className="text-muted"> — {patient.village}</span>}
                                {(patient?.phone || patient?.contactNumber) && (
                                    <span className="text-muted" style={{ marginLeft: 'auto', fontSize: '0.8rem' }}>
                                        📱 {patient.phone || patient.contactNumber}
                                    </span>
                                )}
                            </div>

                            {/* Language Toggle */}
                            {template.messageMarathi && (
                                <div className="msg-lang-toggle">
                                    <button
                                        className={`btn btn-sm ${!useMarathi ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => { setUseMarathi(false); setMessageText(template.message); }}
                                    >English</button>
                                    <button
                                        className={`btn btn-sm ${useMarathi ? 'btn-primary' : 'btn-secondary'}`}
                                        onClick={() => setUseMarathi(true)}
                                    >मराठी</button>
                                </div>
                            )}

                            {/* Message preview/edit */}
                            <textarea
                                className="form-input msg-textarea"
                                value={currentMessage}
                                onChange={e => { if (!useMarathi) setMessageText(e.target.value); }}
                                readOnly={useMarathi}
                                rows={4}
                            />
                        </div>

                        <div className="msg-modal-actions">
                            <button className="btn btn-secondary btn-sm" onClick={handleCopyText}>
                                📋 Copy Text
                            </button>
                            <button
                                className="btn btn-success btn-sm"
                                onClick={handleSendWhatsApp}
                                disabled={logging || !(patient?.phone || patient?.contactNumber)}
                            >
                                <Send size={14} />
                                {logging ? 'Logging…' : 'Send via WhatsApp'}
                                <ExternalLink size={12} />
                            </button>
                        </div>

                        {!(patient?.phone || patient?.contactNumber) && (
                            <p className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center', marginTop: '0.5rem' }}>
                                ⚠️ No phone number on file — message will be logged but WhatsApp won't open.
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
