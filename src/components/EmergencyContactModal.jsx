// ============================================================
// Emergency Contact Modal — WhatsApp + Call deep links
// For ASHA ↔ PHC urgent coordination (supplementary only)
// ============================================================

import { useState } from 'react';
import {
    Phone,
    MessageSquare,
    X,
    ShieldAlert,
    AlertTriangle,
    CheckCircle2,
    User,
    MapPin,
} from 'lucide-react';
import {
    logEmergencyContact,
    buildWhatsAppLink,
    buildCallLink,
} from '../services/emergencyContactService';
import { useToast } from '../contexts/ToastContext';

/**
 * EmergencyContactModal
 *
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {string} props.initiatedBy - "ASHA" | "PHC"
 * @param {Object} props.contact - { name, phone }
 * @param {string} props.contactRole - "PHC Doctor" | "ASHA Worker"
 * @param {Object} props.visitData - { visitId, patientId, patientName, news2Score, riskLevel, village, status }
 */
export default function EmergencyContactModal({
    isOpen,
    onClose,
    initiatedBy,
    contact,
    contactRole,
    visitData,
}) {
    const { toast } = useToast();
    const [logging, setLogging] = useState(false);

    if (!isOpen) return null;

    const handleContact = async (method) => {
        setLogging(true);
        try {
            // Log the communication event to Firestore
            await logEmergencyContact(visitData.visitId, {
                initiatedBy,
                method,
                riskScore: visitData.news2Score,
                riskLevel: visitData.riskLevel,
                escalationStatus: visitData.status || '',
                patientId: visitData.patientId || '',
                patientName: visitData.patientName || '',
                village: visitData.village || '',
                contactedName: contact.name || '',
                contactedPhone: contact.phone || '',
            });

            // Open the appropriate deep link
            if (method === 'whatsapp') {
                const url = buildWhatsAppLink(contact.phone, {
                    patientId: visitData.patientId,
                    news2Score: visitData.news2Score,
                    riskLevel: visitData.riskLevel,
                    village: visitData.village,
                    escalationId: visitData.visitId,
                });
                window.open(url, '_blank');
            } else {
                const url = buildCallLink(contact.phone);
                window.location.href = url;
            }

            toast.success(`Emergency ${method === 'whatsapp' ? 'WhatsApp' : 'call'} initiated — logged.`);
        } catch (err) {
            console.error('Error logging emergency contact:', err);
            // Still open the link even if logging fails
            if (method === 'whatsapp') {
                const url = buildWhatsAppLink(contact.phone, {
                    patientId: visitData.patientId,
                    news2Score: visitData.news2Score,
                    riskLevel: visitData.riskLevel,
                    village: visitData.village,
                    escalationId: visitData.visitId,
                });
                window.open(url, '_blank');
            } else {
                window.location.href = buildCallLink(contact.phone);
            }
            toast.error('Contact opened but logging failed.');
        } finally {
            setLogging(false);
        }
    };

    const riskColor =
        visitData.riskLevel === 'Red'
            ? 'var(--alert-red)'
            : visitData.riskLevel === 'Yellow'
                ? 'var(--yellow)'
                : 'var(--green)';

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content"
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: '420px', padding: '1.5rem' }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1rem' }}>
                        <ShieldAlert size={18} color="var(--alert-red)" />
                        Emergency Contact
                    </h3>
                    <button
                        onClick={onClose}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Risk Banner */}
                <div
                    style={{
                        background: visitData.riskLevel === 'Red' ? 'var(--alert-red-light)' : 'rgba(245,158,11,0.1)',
                        border: `1px solid ${riskColor}`,
                        borderRadius: '8px',
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <AlertTriangle size={16} color={riskColor} />
                    <div style={{ fontSize: '0.85rem' }}>
                        <strong>Patient:</strong> {visitData.patientName || visitData.patientId || 'N/A'}
                        <span style={{ margin: '0 6px' }}>•</span>
                        <strong>NEWS2:</strong> {visitData.news2Score ?? 'N/A'}
                        <span
                            className={`badge badge-${visitData.riskLevel === 'Red' ? 'red' : visitData.riskLevel === 'Yellow' ? 'yellow' : 'green'}`}
                            style={{ marginLeft: '6px', fontSize: '0.7rem', padding: '2px 8px' }}
                        >
                            {visitData.riskLevel} Risk
                        </span>
                    </div>
                </div>

                {/* Contact Card */}
                <div
                    className="card"
                    style={{
                        marginBottom: '1rem',
                        padding: '1rem',
                        borderLeft: '3px solid var(--accent-indigo)',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '0.5rem' }}>
                        <div
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: 'var(--accent-indigo)',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.9rem',
                            }}
                        >
                            {(contact.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                {contact.name || 'Unknown'}
                            </div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                {contactRole}
                            </div>
                        </div>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={13} /> {contact.phone || 'No phone number available'}
                    </div>
                    {visitData.village && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                            <MapPin size={12} /> {visitData.village}
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                    <button
                        className="btn btn-success"
                        onClick={() => handleContact('whatsapp')}
                        disabled={!contact.phone || logging}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <MessageSquare size={16} />
                        WhatsApp
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => handleContact('call')}
                        disabled={!contact.phone || logging}
                        style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                        <Phone size={16} />
                        Call
                    </button>
                </div>

                {/* Disclaimer */}
                <p
                    style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        textAlign: 'center',
                        lineHeight: 1.4,
                        margin: 0,
                        fontStyle: 'italic',
                    }}
                >
                    Structured escalation remains primary. Use emergency contact for urgent coordination only.
                </p>
            </div>
        </div>
    );
}
