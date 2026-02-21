// ============================================================
// Case Review — PHC Doctor SBAR-format review page
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getVisitById, submitDoctorReview } from '../../services/visitService';
import { getRiskAdvisory } from '../../utils/news2';
import {
    ArrowLeft,
    ShieldAlert,
    CheckCircle2,
    ClipboardCheck,
    Eye,
    Building2,
    Send,
    Flag,
    Activity,
    Droplets,
    Wind,
    Phone,
    Siren,
} from 'lucide-react';

const ADVISORY_ICONS = {
    '💧': Droplets,
    '👁️': Eye,
    '🏠': Activity,
    '📋': Activity,
    '🔄': Activity,
    '📞': Phone,
    '🚨': Siren,
    '💨': Wind,
    '🚑': Siren,
};

export default function CaseReview() {
    const { visitId } = useParams();
    const navigate = useNavigate();
    const { user, userName } = useAuth();

    const [visit, setVisit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Doctor review form
    const [doctorNote, setDoctorNote] = useState('');
    const [action, setAction] = useState('Reviewed');

    useEffect(() => {
        loadVisit();
    }, [visitId]);

    const loadVisit = async () => {
        try {
            const v = await getVisitById(visitId);
            setVisit(v);
        } catch (err) {
            console.error('Error loading visit:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReview = async () => {
        setSubmitting(true);
        try {
            await submitDoctorReview(visitId, {
                doctorNote,
                action,
                reviewedBy: userName || user?.email || '',
            });
            setSubmitted(true);
        } catch (err) {
            console.error('Error submitting review:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const getRiskClass = (level) => {
        if (level === 'Red') return 'red';
        if (level === 'Yellow') return 'yellow';
        return 'green';
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '—';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (loading) {
        return (
            <div className="loading-spinner">
                <div>
                    <div className="spinner"></div>
                    <div className="loading-text">Loading case...</div>
                </div>
            </div>
        );
    }

    if (!visit) {
        return (
            <div className="card">
                <div className="empty-state">
                    <div className="empty-icon"><ShieldAlert size={48} strokeWidth={1} /></div>
                    <p>Visit record not found</p>
                    <button className="btn btn-secondary" onClick={() => navigate('/phc')} style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowLeft size={16} /> Back to Reviews
                    </button>
                </div>
            </div>
        );
    }

    const advisory = getRiskAdvisory(visit.riskLevel);

    return (
        <div style={{ maxWidth: '800px' }}>
            {/* Back button */}
            <button className="btn btn-ghost" onClick={() => navigate('/phc')} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ArrowLeft size={16} /> Back to Reviews
            </button>

            {/* Patient + Emergency Banner */}
            {visit.emergencyFlag && (
                <div className="warning-banner" style={{
                    background: 'var(--alert-red-bg)',
                    borderColor: 'var(--alert-red-light)',
                    color: 'var(--alert-red)',
                    marginBottom: '1rem',
                    fontWeight: 600,
                }}>
                    <span className="warning-icon"><ShieldAlert size={20} /></span>
                    EMERGENCY CASE — Priority review required
                </div>
            )}

            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>{visit.patientName}</div>
                        <div className="text-muted">{visit.patientAge} yrs • {visit.patientVillage} • {formatTime(visit.createdAt)}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {visit.news2Score != null && (
                            <span className={`badge badge-${getRiskClass(visit.riskLevel)}`} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                                NEWS2: {visit.news2Score}
                            </span>
                        )}
                        <span className={`badge badge-${getRiskClass(visit.riskLevel)}`} style={{ fontSize: '0.9rem', padding: '6px 12px' }}>
                            {visit.riskLevel} Risk
                        </span>
                    </div>
                </div>
            </div>

            {/* SBAR Summary */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">
                        SBAR Summary <span className="text-marathi text-muted" style={{ fontSize: '0.8rem' }}>(संरचित सारांश)</span>
                    </h2>
                </div>

                {/* Situation */}
                <div className="sbar-section">
                    <div className="sbar-section-title">S — Situation</div>
                    <div className="sbar-section-content">
                        <strong>Chief Complaint:</strong> {visit.chiefComplaint || 'Not recorded'}
                        <br />
                        <strong>Duration:</strong> {visit.symptomDuration ? `${visit.symptomDuration} days` : 'Not specified'}
                        {visit.emergencyFlag && (
                            <div style={{ color: 'var(--alert-red)', fontWeight: 600, marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ShieldAlert size={14} /> Marked as emergency by ASHA worker
                            </div>
                        )}
                    </div>
                </div>

                {/* Background */}
                <div className="sbar-section">
                    <div className="sbar-section-title">B — Background (Vitals)</div>
                    <div className="sbar-section-content">
                        {visit.vitals ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                {visit.vitals.respiratoryRate && <div>Respiratory Rate: <strong>{visit.vitals.respiratoryRate}/min</strong></div>}
                                {visit.vitals.pulseRate && <div>Pulse Rate: <strong>{visit.vitals.pulseRate} bpm</strong></div>}
                                {visit.vitals.temperature && <div>Temperature: <strong>{visit.vitals.temperature}°C</strong></div>}
                                {visit.vitals.spo2 && <div>SpO2: <strong>{visit.vitals.spo2}%</strong></div>}
                                {visit.vitals.systolicBP && <div>Systolic BP: <strong>{visit.vitals.systolicBP} mmHg</strong></div>}
                            </div>
                        ) : (
                            <span className="text-muted">No vitals recorded</span>
                        )}
                        <div style={{ marginTop: '0.5rem' }}>
                            Consciousness: <strong>{visit.consciousness || 'Not recorded'}</strong>
                        </div>
                    </div>
                </div>

                {/* Assessment */}
                <div className="sbar-section">
                    <div className="sbar-section-title">A — Assessment</div>
                    <div className="sbar-section-content">
                        <div style={{ marginBottom: '0.75rem' }}>
                            <strong>NEWS2 Score:</strong>{' '}
                            <span className={`risk-score score-${getRiskClass(visit.riskLevel)}`} style={{ fontSize: '1.5rem' }}>
                                {visit.news2Score ?? '—'}
                            </span>
                            {' '}
                            <span className={`badge badge-${getRiskClass(visit.riskLevel)}`}>
                                {visit.riskLevel} Risk
                            </span>
                        </div>

                        {/* Parameter breakdown */}
                        {visit.news2Breakdown && visit.news2Breakdown.length > 0 && (
                            <div className="news2-breakdown">
                                {visit.news2Breakdown.map((param, idx) => (
                                    <div key={idx} className="news2-param">
                                        <span className="news2-param-name">{param.name}</span>
                                        <div className="news2-param-detail">
                                            <span className="news2-param-value">{param.value}</span>
                                            <span className={`news2-param-score score-${param.score}`}>
                                                {param.score} pts
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Red Flags */}
                        {visit.redFlags && visit.redFlags.length > 0 && (
                            <div style={{ marginTop: '0.75rem' }}>
                                <strong style={{ color: 'var(--alert-red)' }}>Red Flags:</strong>
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                                    {visit.redFlags.map((flag, idx) => (
                                        <span key={idx} className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Flag size={10} /> {flag}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recommendation */}
                <div className="sbar-section">
                    <div className="sbar-section-title">R — Recommendation (System Advisory)</div>
                    <div className="sbar-section-content">
                        {advisory.items.map((item, idx) => {
                            const IconComp = ADVISORY_ICONS[item.icon] || Activity;
                            return (
                                <div key={idx} className="advisory-item">
                                    <span className="advisory-icon"><IconComp size={16} /></span>
                                    <span>{item.text}</span>
                                </div>
                            );
                        })}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                            Guideline-based advisory (Non-diagnostic)
                        </div>
                    </div>
                </div>
            </div>

            {/* Doctor Review Form */}
            {!submitted && visit.status === 'Pending PHC Review' ? (
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">
                            Doctor Review <span className="text-marathi text-muted" style={{ fontSize: '0.8rem' }}>(डॉक्टर पुनरावलोकन)</span>
                        </h2>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Action</label>
                        <div className="radio-group">
                            {[
                                { value: 'Reviewed', label: 'Mark Reviewed', icon: <ClipboardCheck size={14} /> },
                                { value: 'Referral Approved', label: 'Approve Referral', icon: <Building2 size={14} /> },
                                { value: 'Observation', label: 'Suggest Observation', icon: <Eye size={14} /> },
                            ].map((opt) => (
                                <label key={opt.value} className={`radio-option ${action === opt.value ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="action"
                                        value={opt.value}
                                        checked={action === opt.value}
                                        onChange={(e) => setAction(e.target.value)}
                                    />
                                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>{opt.icon} {opt.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Doctor's Note <span className="label-marathi">डॉक्टरांची टीप</span>
                        </label>
                        <textarea
                            className="form-input"
                            value={doctorNote}
                            onChange={(e) => setDoctorNote(e.target.value)}
                            placeholder="Add your clinical notes, recommendations, or instructions for the ASHA worker..."
                            rows={4}
                        />
                    </div>

                    <button
                        className="btn btn-primary btn-lg"
                        onClick={handleSubmitReview}
                        disabled={submitting}
                    >
                        <Send size={18} /> {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>
            ) : submitted ? (
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div style={{ marginBottom: '0.75rem' }}><CheckCircle2 size={40} color="var(--green)" /></div>
                    <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Review Submitted</div>
                    <p className="text-muted" style={{ marginBottom: '1rem' }}>
                        The ASHA worker will be able to see your notes and the updated status.
                    </p>
                    <button className="btn btn-primary" onClick={() => navigate('/phc')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowLeft size={16} /> Back to Reviews
                    </button>
                </div>
            ) : (
                <div className="card" style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="status-badge reviewed">Already Reviewed</span>
                        {visit.doctorNote && (
                            <span className="text-muted">Note: {visit.doctorNote}</span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
