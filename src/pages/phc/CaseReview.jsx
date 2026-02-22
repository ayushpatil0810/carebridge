// ============================================================
// Case Review — Detailed Patient View + Decision Engine + Audit
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { TRIGGER_TEMPLATES } from '../../services/messageService';
import MessageSuggestModal from '../../components/MessageSuggestModal';
import {
    getVisitById,
    submitDoctorReview,
    timeSince,
    formatDuration,
} from '../../services/visitService';
import { getRiskAdvisory } from '../../utils/news2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
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
    Thermometer,
    Wind,
    Heart,
    Stethoscope,
    User,
    MapPin,
    Home,
    Clock,
    MessageCircleQuestion,
    Timer,
    FileText,
    AlertCircle,
    MessageSquare,
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// Map advisory icons
const advisoryIcons = {
    '🔴': <ShieldAlert size={14} color="var(--alert-red)" />,
    '🟡': <AlertCircle size={14} color="var(--yellow)" />,
    '🟢': <CheckCircle2 size={14} color="var(--green)" />,
    '📞': <Stethoscope size={14} color="var(--accent-indigo)" />,
    '🚨': <ShieldAlert size={14} color="var(--alert-red)" />,
    '🏥': <Building2 size={14} color="var(--accent-saffron)" />,
    '📋': <ClipboardCheck size={14} color="var(--text-secondary)" />,
    '👁️': <Eye size={14} color="var(--accent-indigo)" />,
    '📊': <Activity size={14} color="var(--accent-saffron)" />,
    '✅': <CheckCircle2 size={14} color="var(--green)" />,
    '⚠️': <AlertCircle size={14} color="var(--yellow)" />,
};

export default function CaseReview() {
    const { visitId } = useParams();
    const { userName } = useAuth();
    const navigate = useNavigate();

    const [visit, setVisit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showMsgModal, setShowMsgModal] = useState(false);

    // Decision state
    const [selectedAction, setSelectedAction] = useState('');
    const [doctorNote, setDoctorNote] = useState('');
    const [monitoringPeriod, setMonitoringPeriod] = useState('24h');
    const [recheckInstruction, setRecheckInstruction] = useState('');
    const [clarificationMessage, setClarificationMessage] = useState('');
    const [referralReason, setReferralReason] = useState('');
    const [clarificationType, setClarificationType] = useState('');

    const REFERRAL_REASONS = [
        'High NEWS2 — needs specialist evaluation',
        'Red flag symptoms — urgent referral',
        'Deteriorating condition despite monitoring',
        'Diagnostic tests required (not available at PHC)',
        'Surgical intervention likely needed',
        'Pregnancy / obstetric complication',
        'Pediatric emergency',
    ];

    const CLARIFICATION_TYPES = [
        { key: 'missing_vitals', label: 'Missing Vitals', desc: 'One or more vital signs not recorded' },
        { key: 'incomplete_symptoms', label: 'Incomplete Symptom Description', desc: 'Need detailed symptom history' },
        { key: 'incorrect_entry', label: 'Possible Incorrect Entry', desc: 'Values seem unusual, please verify' },
        { key: 'need_observation', label: 'Need Observation Period', desc: 'Monitor and report back after specified time' },
    ];

    useEffect(() => {
        loadVisit();
    }, [visitId]);

    const loadVisit = async () => {
        try {
            const data = await getVisitById(visitId);
            if (!data) {
                setError('Visit not found');
            } else {
                setVisit(data);
            }
        } catch (err) {
            setError('Error loading visit data');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitDecision = async () => {
        if (!selectedAction) return;
        setSubmitting(true);
        setError('');
        try {
            const reviewData = {
                action: selectedAction,
                doctorNote,
                reviewedBy: userName,
            };
            if (selectedAction === 'Referral Approved') {
                reviewData.referralReason = referralReason;
            }
            if (selectedAction === 'Under Monitoring') {
                reviewData.monitoringPeriod = monitoringPeriod;
                reviewData.recheckInstruction = recheckInstruction;
            }
            if (selectedAction === 'Awaiting ASHA Response') {
                reviewData.clarificationMessage = clarificationMessage;
                reviewData.clarificationType = clarificationType;
            }
            await submitDoctorReview(visitId, reviewData);
            setSuccess('Decision submitted successfully!');
            // For referral approvals, don't auto-redirect — allow sending message first
            if (selectedAction !== 'Referral Approved') {
                setTimeout(() => navigate('/phc'), 1500);
            }
        } catch (err) {
            setError('Failed to submit decision: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getRiskClass = (level) => {
        if (level === 'Red') return 'risk-red';
        if (level === 'Yellow') return 'risk-yellow';
        return 'risk-green';
    };

    const getScoreClass = (level) => {
        if (level === 'Red') return 'score-red';
        if (level === 'Yellow') return 'score-yellow';
        return 'score-green';
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

    if (error && !visit) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <AlertCircle size={40} color="var(--alert-red)" />
                <p style={{ marginTop: '1rem' }}>{error}</p>
                <button className="btn btn-secondary" onClick={() => navigate('/phc')}>
                    <ArrowLeft size={16} /> Back to Queue
                </button>
            </div>
        );
    }

    const advisory = visit?.riskLevel ? getRiskAdvisory(visit.riskLevel) : [];
    const isAlreadyReviewed = visit?.status !== 'Pending PHC Review';

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <button className="btn btn-ghost" onClick={() => navigate('/phc')}>
                    <ArrowLeft size={16} /> Back to Queue
                </button>
                {visit?.emergencyFlag && (
                    <span className="emergency-tag" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                        <ShieldAlert size={14} /> EMERGENCY
                    </span>
                )}
                {/* Response Time Indicator */}
                {visit?.status === 'Pending PHC Review' && visit?.reviewRequestedAt && (() => {
                    const now = new Date();
                    const reqTime = visit.reviewRequestedAt.toDate ? visit.reviewRequestedAt.toDate() : new Date(visit.reviewRequestedAt);
                    const diffMs = now.getTime() - reqTime.getTime();
                    const diffMin = Math.round(diffMs / 60000);
                    const color = diffMin < 15 ? 'var(--green)' : diffMin < 60 ? 'var(--yellow)' : 'var(--alert-red)';
                    const bg = diffMin < 15 ? 'var(--green-light)' : diffMin < 60 ? 'rgba(245,158,11,0.1)' : 'var(--alert-red-light)';
                    return (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600, color, background: bg, padding: '4px 10px', borderRadius: '20px' }}>
                            <Timer size={13} /> Waiting: {diffMin < 60 ? `${diffMin}m` : `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`}
                        </span>
                    );
                })()}
            </div>

            {/* Success/Error */}
            {success && (
                <div style={{ background: 'var(--green-light)', color: 'var(--green)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} /> {success}
                </div>
            )}
            {error && (
                <div style={{ background: 'var(--alert-red-light)', color: 'var(--alert-red)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div className="case-review-grid">
                {/* Left Panel — Patient & Clinical Info */}
                <div className="case-review-main">
                    {/* NEWS2 Score Card */}
                    <div className={`risk-result ${getRiskClass(visit?.riskLevel)}`} style={{ marginTop: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, opacity: 0.8, marginBottom: '4px' }}>
                                    NEWS2 Score
                                </div>
                                <div className={`risk-score ${getScoreClass(visit?.riskLevel)}`}>
                                    {visit?.news2Score ?? '—'}
                                </div>
                            </div>
                            <div>
                                <span className={`badge badge-${visit?.riskLevel === 'Red' ? 'red' : visit?.riskLevel === 'Yellow' ? 'yellow' : 'green'}`} style={{ fontSize: '0.85rem', padding: '6px 16px' }}>
                                    {visit?.riskLevel || 'N/A'} Risk
                                </span>
                            </div>
                        </div>

                        {/* NEWS2 Breakdown + Chart */}
                        {visit?.news2Breakdown?.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                {/* Horizontal Bar Chart */}
                                <div style={{ height: `${Math.max(visit.news2Breakdown.length * 38, 140)}px`, marginBottom: '1rem' }}>
                                    <Bar
                                        data={{
                                            labels: visit.news2Breakdown.map(p => p.name),
                                            datasets: [{
                                                label: 'Score',
                                                data: visit.news2Breakdown.map(p => p.score),
                                                backgroundColor: visit.news2Breakdown.map(p =>
                                                    p.score >= 3 ? '#DC2626' :
                                                        p.score >= 2 ? '#F59E0B' :
                                                            p.score >= 1 ? '#FF8800' :
                                                                '#22C55E'
                                                ),
                                                borderRadius: 4,
                                                barThickness: 20,
                                            }],
                                        }}
                                        options={{
                                            indexAxis: 'y',
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            scales: {
                                                x: { min: 0, max: 3, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.06)' } },
                                                y: { grid: { display: false }, ticks: { font: { size: 11, weight: 600 } } },
                                            },
                                            plugins: {
                                                legend: { display: false },
                                                tooltip: { backgroundColor: 'rgba(30,30,30,0.92)', cornerRadius: 8, padding: 8, callbacks: { label: (ctx) => `Score: ${ctx.raw} / 3` } },
                                            },
                                        }}
                                    />
                                </div>
                                {/* Text Breakdown */}
                                <div className="news2-breakdown">
                                    {visit.news2Breakdown.map((param, i) => (
                                        <div className="news2-param" key={i}>
                                            <span className="news2-param-name">{param.name}</span>
                                            <div className="news2-param-detail">
                                                <span className="news2-param-value">{param.value ?? '—'}</span>
                                                <span className={`news2-param-score score-${param.score}`}>{param.score}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Patient Details (Feature #2) */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <User size={18} /> Patient Details
                        </h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <span className="detail-label">Name</span>
                                <span className="detail-value">{visit?.patientName || '—'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Age</span>
                                <span className="detail-value">{visit?.patientAge || '—'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Gender</span>
                                <span className="detail-value">{visit?.patientGender || '—'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Village</span>
                                <span className="detail-value"><MapPin size={12} /> {visit?.patientVillage || '—'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">House No.</span>
                                <span className="detail-value"><Home size={12} /> {visit?.patientHouseNumber || '—'}</span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">ASHA Worker</span>
                                <span className="detail-value">{visit?.createdByName || visit?.createdBy || '—'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Clinical Data (Feature #2) */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <Stethoscope size={18} /> Clinical Data
                        </h3>

                        <div style={{ marginBottom: '1rem' }}>
                            <div className="detail-label">Chief Complaint</div>
                            <div style={{ fontSize: '1rem', fontWeight: 600 }}>{visit?.chiefComplaint || '—'}</div>
                            <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                                Duration: {visit?.symptomDuration || '—'}
                            </div>
                        </div>

                        <div className="detail-label" style={{ marginBottom: '0.5rem' }}>Vitals</div>
                        <div className="vitals-grid">
                            <div className="vital-chip">
                                <Wind size={14} /> RR: {visit?.vitals?.respiratoryRate || '—'}
                            </div>
                            <div className="vital-chip">
                                <Heart size={14} /> Pulse: {visit?.vitals?.pulseRate || '—'}
                            </div>
                            <div className="vital-chip">
                                <Thermometer size={14} /> Temp: {visit?.vitals?.temperature || '—'}°C
                            </div>
                            <div className="vital-chip">
                                <Activity size={14} /> SpO2: {visit?.vitals?.spo2 || '—'}%
                            </div>
                            <div className="vital-chip">
                                <Activity size={14} /> SBP: {visit?.vitals?.systolicBP || '—'}
                            </div>
                            <div className="vital-chip">
                                <Eye size={14} /> AVPU: {visit?.consciousness || '—'}
                            </div>
                        </div>

                        {/* Red Flags */}
                        {visit?.redFlags?.length > 0 && (
                            <div style={{ marginTop: '1rem' }}>
                                <div className="detail-label" style={{ marginBottom: '0.5rem' }}>
                                    <Flag size={12} color="var(--alert-red)" /> Red Flags
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {visit.redFlags.map((flag, i) => (
                                        <span key={i} className="badge badge-red">{flag}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* SBAR Summary (Feature #2) */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <FileText size={18} /> SBAR Summary
                        </h3>
                        <div className="sbar-section">
                            <div className="sbar-section-title">SITUATION</div>
                            <div className="sbar-section-content">
                                {visit?.patientName}, {visit?.patientAge}, presents with {visit?.chiefComplaint || 'unspecified complaint'}.
                                {visit?.emergencyFlag && ' This is an EMERGENCY case.'}
                            </div>
                        </div>
                        <div className="sbar-section">
                            <div className="sbar-section-title">BACKGROUND</div>
                            <div className="sbar-section-content">
                                Patient from {visit?.patientVillage || 'unknown village'}.
                                Duration: {visit?.symptomDuration || 'not recorded'}.
                            </div>
                        </div>
                        <div className="sbar-section">
                            <div className="sbar-section-title">ASSESSMENT</div>
                            <div className="sbar-section-content">
                                NEWS2 Score: {visit?.news2Score ?? 'N/A'} ({visit?.riskLevel || 'N/A'} Risk).
                                Consciousness: {visit?.consciousness || 'Alert'}.
                                {visit?.redFlags?.length > 0 && ` Red flags: ${visit.redFlags.join(', ')}.`}
                            </div>
                        </div>
                        <div className="sbar-section">
                            <div className="sbar-section-title">RECOMMENDATION</div>
                            <div className="sbar-section-content">
                                {advisory.length > 0 ? (
                                    advisory.map((item, i) => (
                                        <div key={i} className="advisory-item">
                                            <span className="advisory-icon">
                                                {advisoryIcons[item.icon] || <CheckCircle2 size={14} />}
                                            </span>
                                            {item.text}
                                        </div>
                                    ))
                                ) : (
                                    'No specific advisory available.'
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Clarification History (if exists) */}
                    {visit?.clarificationMessage && (
                        <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--yellow)' }}>
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', color: '#9A7B12' }}>
                                <MessageCircleQuestion size={18} /> Clarification History
                            </h3>
                            <div style={{ marginBottom: '0.75rem' }}>
                                <div className="detail-label">Doctor's Question</div>
                                <div style={{ background: 'var(--yellow-bg)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem', marginTop: '4px' }}>
                                    {visit.clarificationMessage}
                                </div>
                            </div>
                            {visit.clarificationResponse && (
                                <div>
                                    <div className="detail-label">ASHA's Response</div>
                                    <div style={{ background: 'var(--green-bg)', padding: '0.5rem 0.75rem', borderRadius: '6px', fontSize: '0.9rem', marginTop: '4px' }}>
                                        {visit.clarificationResponse}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Panel — Decision Engine + Audit */}
                <div className="case-review-sidebar">
                    {/* Decision Engine (Feature #3) */}
                    {!isAlreadyReviewed ? (
                        <div className="card decision-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <ClipboardCheck size={18} /> Clinical Decision
                            </h3>

                            {/* One-tap buttons */}
                            <div className="decision-buttons">
                                <button
                                    className={`decision-btn approve ${selectedAction === 'Referral Approved' ? 'selected' : ''}`}
                                    onClick={() => setSelectedAction('Referral Approved')}
                                >
                                    <CheckCircle2 size={18} />
                                    <div>
                                        <div className="decision-btn-title">Approve Referral</div>
                                        <div className="decision-btn-desc">Confirm for higher facility</div>
                                    </div>
                                </button>

                                <button
                                    className={`decision-btn monitor ${selectedAction === 'Under Monitoring' ? 'selected' : ''}`}
                                    onClick={() => setSelectedAction('Under Monitoring')}
                                >
                                    <Eye size={18} />
                                    <div>
                                        <div className="decision-btn-title">Monitor Locally</div>
                                        <div className="decision-btn-desc">Set monitoring period</div>
                                    </div>
                                </button>

                                <button
                                    className={`decision-btn clarify ${selectedAction === 'Awaiting ASHA Response' ? 'selected' : ''}`}
                                    onClick={() => setSelectedAction('Awaiting ASHA Response')}
                                >
                                    <MessageCircleQuestion size={18} />
                                    <div>
                                        <div className="decision-btn-title">Request Clarification</div>
                                        <div className="decision-btn-desc">Ask ASHA for details</div>
                                    </div>
                                </button>
                            </div>

                            {/* Referral Reason (when Approve selected) */}
                            {selectedAction === 'Referral Approved' && (
                                <div className="decision-detail" style={{ marginTop: '1rem' }}>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label"><FileText size={13} /> Referral Reason</label>
                                        <select
                                            className="form-input"
                                            value={referralReason}
                                            onChange={e => setReferralReason(e.target.value)}
                                        >
                                            <option value="">Select reason...</option>
                                            {REFERRAL_REASONS.map((r, i) => (
                                                <option key={i} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* Monitoring Options */}
                            {selectedAction === 'Under Monitoring' && (
                                <div className="decision-detail" style={{ marginTop: '1rem' }}>
                                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                        <label className="form-label"><Timer size={13} /> Monitoring Period</label>
                                        <select
                                            className="form-input"
                                            value={monitoringPeriod}
                                            onChange={e => setMonitoringPeriod(e.target.value)}
                                        >
                                            <option value="4h">4 hours</option>
                                            <option value="12h">12 hours</option>
                                            <option value="24h">24 hours</option>
                                            <option value="48h">48 hours</option>
                                        </select>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label">Recheck Instructions</label>
                                        <textarea
                                            className="form-input"
                                            rows="2"
                                            placeholder="e.g., Recheck vitals every 4 hours, watch for deterioration..."
                                            value={recheckInstruction}
                                            onChange={e => setRecheckInstruction(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Clarification Options — Structured */}
                            {selectedAction === 'Awaiting ASHA Response' && (
                                <div className="decision-detail" style={{ marginTop: '1rem' }}>
                                    <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                                        <label className="form-label"><AlertCircle size={13} /> Clarification Type</label>
                                        <div className="clarification-type-grid">
                                            {CLARIFICATION_TYPES.map(ct => (
                                                <button
                                                    key={ct.key}
                                                    className={`clarification-type-btn ${clarificationType === ct.key ? 'selected' : ''}`}
                                                    onClick={() => setClarificationType(ct.key)}
                                                    type="button"
                                                >
                                                    <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>{ct.label}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{ct.desc}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label"><MessageCircleQuestion size={13} /> Your Question for ASHA</label>
                                        <textarea
                                            className="form-input"
                                            rows="3"
                                            placeholder="What additional details do you need from the ASHA worker?"
                                            value={clarificationMessage}
                                            onChange={e => setClarificationMessage(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Doctor note (all actions) */}
                            {selectedAction && (
                                <div className="form-group" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                                    <label className="form-label"><FileText size={13} /> Clinical Note (optional)</label>
                                    <textarea
                                        className="form-input"
                                        rows="2"
                                        placeholder="Add clinical note..."
                                        value={doctorNote}
                                        onChange={e => setDoctorNote(e.target.value)}
                                    />
                                </div>
                            )}

                            {selectedAction && (
                                <button
                                    className="btn btn-primary btn-block"
                                    onClick={handleSubmitDecision}
                                    disabled={submitting || (selectedAction === 'Referral Approved' && !referralReason) || (selectedAction === 'Awaiting ASHA Response' && (!clarificationMessage.trim() || !clarificationType))}
                                >
                                    {submitting ? (
                                        <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Submitting...</>
                                    ) : (
                                        <><Send size={16} /> Submit Decision</>
                                    )}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="card" style={{ borderLeft: '3px solid var(--green)' }}>
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green)' }}>
                                <CheckCircle2 size={18} /> Decision Recorded
                            </h3>
                            <div className="detail-grid" style={{ marginTop: '0.75rem' }}>
                                <div className="detail-item">
                                    <span className="detail-label">Status</span>
                                    <span className="detail-value">{visit?.status}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">Reviewed By</span>
                                    <span className="detail-value">{visit?.reviewedBy || '—'}</span>
                                </div>
                                {visit?.doctorNote && (
                                    <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                                        <span className="detail-label">Note</span>
                                        <span className="detail-value">{visit.doctorNote}</span>
                                    </div>
                                )}
                                {visit?.monitoringPeriod && (
                                    <>
                                        <div className="detail-item">
                                            <span className="detail-label">Monitoring Period</span>
                                            <span className="detail-value">{visit.monitoringPeriod}</span>
                                        </div>
                                        {visit.recheckInstruction && (
                                            <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                                                <span className="detail-label">Recheck Instructions</span>
                                                <span className="detail-value">{visit.recheckInstruction}</span>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Escalation Context */}
                    {visit?.escalationContext?.length > 0 && (
                        <div className="card" style={{ marginTop: '1rem', borderLeft: '3px solid var(--accent-indigo)' }}>
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                <AlertCircle size={16} /> ASHA Escalation Reasons
                            </h3>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {visit.escalationContext.map((ctx, i) => (
                                    <span key={i} className="badge badge-indigo" style={{ fontSize: '0.72rem' }}>
                                        {ctx === 'high_news2' ? 'High NEWS2' : ctx === 'red_flag' ? 'Red Flag Concern' : ctx === 'clinical_doubt' ? 'Clinical Doubt' : ctx === 'repeat_visit' ? 'Repeat Visit' : ctx}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Escalation Info */}
                    <div className="card" style={{ marginTop: '1rem' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                            <Clock size={18} /> Timeline
                        </h3>
                        <div className="detail-grid">
                            <div className="detail-item">
                                <span className="detail-label">Visit Created</span>
                                <span className="detail-value" style={{ fontSize: '0.8rem' }}>
                                    {visit?.createdAt?.toDate ? visit.createdAt.toDate().toLocaleString('en-IN') : '—'}
                                </span>
                            </div>
                            <div className="detail-item">
                                <span className="detail-label">Escalated</span>
                                <span className="detail-value" style={{ fontSize: '0.8rem' }}>
                                    {visit?.reviewRequestedAt?.toDate ? visit.reviewRequestedAt.toDate().toLocaleString('en-IN') : '—'}
                                </span>
                            </div>
                            {visit?.reviewedAt && (
                                <div className="detail-item">
                                    <span className="detail-label">Reviewed</span>
                                    <span className="detail-value" style={{ fontSize: '0.8rem' }}>
                                        {visit.reviewedAt.toDate ? visit.reviewedAt.toDate().toLocaleString('en-IN') : '—'}
                                    </span>
                                </div>
                            )}
                            {visit?.responseTimeMs && (
                                <div className="detail-item">
                                    <span className="detail-label">Response Time</span>
                                    <span className="detail-value" style={{ fontWeight: 600, color: visit.responseTimeMs < 900000 ? 'var(--green)' : visit.responseTimeMs < 3600000 ? 'var(--yellow)' : 'var(--alert-red)' }}>
                                        {formatDuration(visit.responseTimeMs)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Audit Trail (Feature #7) */}
                    {visit?.auditTrail?.length > 0 && (
                        <div className="card" style={{ marginTop: '1rem' }}>
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                                <FileText size={18} /> Audit Trail
                            </h3>
                            <div className="audit-trail">
                                {visit.auditTrail.map((entry, i) => (
                                    <div key={i} className="audit-entry">
                                        <div className="audit-dot"></div>
                                        <div className="audit-content">
                                            <div className="audit-action">{entry.action}</div>
                                            <div className="audit-meta">
                                                {entry.by} • {new Date(entry.timestamp).toLocaleString('en-IN')}
                                                {entry.responseTimeMs && ` • Response: ${formatDuration(entry.responseTimeMs)}`}
                                            </div>
                                            {entry.news2Score != null && (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                    NEWS2: {entry.news2Score} ({entry.riskLevel} Risk)
                                                    {entry.redFlags?.length > 0 && ` • Red Flags: ${entry.redFlags.join(', ')}`}
                                                </div>
                                            )}
                                            {entry.referralReason && (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--accent-indigo)', marginTop: '2px' }}>
                                                    Reason: {entry.referralReason}
                                                </div>
                                            )}
                                            {entry.clarificationType && (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--yellow)', marginTop: '2px' }}>
                                                    Type: {entry.clarificationType}
                                                </div>
                                            )}
                                            {entry.note && <div className="audit-note">{entry.note}</div>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Referral Message Trigger */}
                    {success && selectedAction === 'Referral Approved' && (
                        <div className="card" style={{ marginTop: '1rem', borderLeft: '4px solid var(--alert-red)', textAlign: 'center' }}>
                            <CheckCircle2 size={32} color="var(--green)" />
                            <p style={{ fontWeight: 600, margin: '0.5rem 0' }}>{success}</p>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
                                <button className="btn btn-success btn-sm" onClick={() => setShowMsgModal(true)}>
                                    <MessageSquare size={14} /> Send Referral Message to Patient
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/phc')}>
                                    Skip & Return
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Message Suggest Modal */}
            <MessageSuggestModal
                isOpen={showMsgModal}
                onClose={() => { setShowMsgModal(false); navigate('/phc'); }}
                template={TRIGGER_TEMPLATES.red}
                patient={{
                    patientId: visit?.patientId || '',
                    name: visit?.patientName || '',
                    phone: visit?.patientPhone || '',
                    contactNumber: visit?.patientContactNumber || '',
                    village: visit?.patientVillage || '',
                }}
                visitId={visitId}
            />
        </div>
    );
}
