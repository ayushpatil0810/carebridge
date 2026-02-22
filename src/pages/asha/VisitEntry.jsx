// ============================================================
// Visit Entry Page — Record vitals + Calculate NEWS2
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPatientById } from '../../services/patientService';
import { createVisit, requestPHCReview, getRecentVisitsByPatient } from '../../services/visitService';
import { calculateNEWS2, getRiskAdvisory, RED_FLAGS } from '../../utils/news2';
import { validateVital, validateAllVitals } from '../../utils/vitalsValidation';
import { TRIGGER_TEMPLATES } from '../../services/messageService';
import { scheduleFollowUp } from '../../services/followUpService';
import MessageSuggestModal from '../../components/MessageSuggestModal';
import { getAIClinicalAdvisory, isAIAdvisoryAvailable } from '../../services/aiAdvisoryService';
import {
    Calculator,
    Save,
    Send,
    AlertTriangle,
    ShieldAlert,
    CheckCircle2,
    ArrowLeft,
    Flag,
    Droplets,
    Eye,
    Thermometer,
    Activity,
    Wind,
    Phone,
    Stethoscope,
    Siren,
    MessageSquare,
    CalendarPlus,
    Info,
    TriangleAlert,
    ClipboardList,
    RotateCcw,
    HelpCircle,
    Zap,
    BrainCircuit,
    Sparkles,
    Loader2,
    ShieldQuestion,
    Lightbulb,
    ArrowRight,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';

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

export default function VisitEntry() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, userName } = useAuth();
    const { t } = useTranslation();
    const { toast } = useToast();

    const [patient, setPatient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form state
    const [chiefComplaint, setChiefComplaint] = useState('');
    const [symptomDuration, setSymptomDuration] = useState('');
    const [vitals, setVitals] = useState({
        respiratoryRate: '',
        pulseRate: '',
        temperature: '',
        spo2: '',
        systolicBP: '',
    });
    const [consciousness, setConsciousness] = useState('Alert');
    const [redFlags, setRedFlags] = useState([]);

    // NEWS2 result state
    const [news2Result, setNews2Result] = useState(null);
    const [advisory, setAdvisory] = useState(null);
    const [savedVisitId, setSavedVisitId] = useState(null);
    const [reviewRequested, setReviewRequested] = useState(false);

    // Messaging
    const [showMsgModal, setShowMsgModal] = useState(false);

    // Follow-up scheduling
    const [followUpDate, setFollowUpDate] = useState('');
    const [followUpTime, setFollowUpTime] = useState('09:00');
    const [followUpReason, setFollowUpReason] = useState('');
    const [followUpScheduled, setFollowUpScheduled] = useState(false);
    const [schedulingFollowUp, setSchedulingFollowUp] = useState(false);

    // Repeat visit alert
    const [recentVisits, setRecentVisits] = useState([]);

    // Vitals validation
    const [vitalWarnings, setVitalWarnings] = useState({});
    const [vitalErrors, setVitalErrors] = useState({});

    // AI Advisory
    const [aiAdvisory, setAiAdvisory] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState('');
    const [aiExpanded, setAiExpanded] = useState(true);

    // Escalation context
    const ESCALATION_REASONS = [
        { key: 'high_news2', label: t('visitEntry.highNEWS2Score'), icon: Zap },
        { key: 'red_flag', label: t('visitEntry.redFlagConcern'), icon: Flag },
        { key: 'clinical_doubt', label: t('visitEntry.clinicalDoubt'), icon: HelpCircle },
        { key: 'repeat_visit', label: t('visitEntry.repeatVisit'), icon: RotateCcw },
    ];
    const [escalationReasons, setEscalationReasons] = useState([]);
    const [showEscalation, setShowEscalation] = useState(false);

    useEffect(() => {
        loadPatient();
        loadRecentVisits();
    }, [id]);

    const loadPatient = async () => {
        try {
            const p = await getPatientById(id);
            // Ownership guard — ASHA can only create visits for their own patients
            if (p && user && p.createdBy !== user.uid) {
                setPatient(null);
                setLoading(false);
                return;
            }
            setPatient(p);
        } catch (err) {
            console.error('Error loading patient:', err);
        } finally {
            setLoading(false);
        }
    };

    const loadRecentVisits = async () => {
        try {
            const visits = await getRecentVisitsByPatient(id, 48);
            setRecentVisits(visits);
        } catch (err) {
            console.error('Error loading recent visits:', err);
        }
    };

    const handleVitalChange = (field, value) => {
        setVitals({ ...vitals, [field]: value });
        // Real-time validation
        const result = validateVital(field, value);
        setVitalErrors(prev => {
            const next = { ...prev };
            if (!result.valid && result.error) next[field] = result.error;
            else delete next[field];
            return next;
        });
        setVitalWarnings(prev => {
            const next = { ...prev };
            if (result.warning) next[field] = result.warning;
            else delete next[field];
            return next;
        });
    };

    const handleRedFlagToggle = (flag) => {
        setRedFlags((prev) =>
            prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
        );
    };

    const handleCalculateNEWS2 = () => {
        // Block calculation if there are validation errors
        const validation = validateAllVitals(vitals);
        if (!validation.valid) {
            const errObj = {};
            validation.errors.forEach(e => {
                const field = Object.keys(vitals).find(k => e.includes(k) || e.toLowerCase().includes(k.toLowerCase()));
                if (field) errObj[field] = e;
            });
            setVitalErrors(prev => ({ ...prev, ...errObj }));
            return;
        }
        const result = calculateNEWS2(vitals, consciousness, redFlags);
        setNews2Result(result);
        setAdvisory(getRiskAdvisory(result.riskLevel));
    };

    const handleSaveVisit = async () => {
        if (!news2Result) return;
        setSaving(true);
        try {
            const visit = await createVisit({
                patientId: patient.patientId,
                patientDocId: id,
                patientName: patient.name,
                patientAge: patient.age,
                patientGender: patient.gender || '',
                patientVillage: patient.village,
                patientHouseNumber: patient.houseNumber || '',
                chiefComplaint,
                symptomDuration,
                vitals,
                consciousness,
                redFlags,
                news2Score: news2Result.totalScore,
                news2Breakdown: news2Result.breakdown,
                riskLevel: news2Result.riskLevel,
                advisory: advisory?.level || '',
                createdBy: user?.uid || '',
                createdByName: userName || '',
            });
            setSavedVisitId(visit.id);
            toast.success(t('visitEntry.visitSaved', 'Visit saved successfully.'));
        } catch (err) {
            console.error('Error saving visit:', err);
            toast.error(t('visitEntry.visitSaveError', 'Failed to save visit. Please try again.'));
        } finally {
            setSaving(false);
        }
    };

    const handleRequestReview = async (isEmergency = false) => {
        if (!savedVisitId) return;
        try {
            await requestPHCReview(savedVisitId, isEmergency, escalationReasons);
            setReviewRequested(true);
            setShowEscalation(false);
            toast.success(isEmergency
                ? t('visitEntry.emergencyEscalated', 'Emergency escalation sent to PHC.')
                : t('visitEntry.reviewRequested', 'PHC review request sent.'));
        } catch (err) {
            console.error('Error requesting review:', err);
            toast.error(t('visitEntry.reviewError', 'Failed to send review request.'));
        }
    };

    const toggleEscalationReason = (key) => {
        setEscalationReasons(prev =>
            prev.includes(key) ? prev.filter(r => r !== key) : [...prev, key]
        );
    };

    const handleScheduleFollowUp = async () => {
        if (!followUpDate || !savedVisitId) return;
        setSchedulingFollowUp(true);
        try {
            await scheduleFollowUp({
                patientId: patient.patientId,
                patientName: patient.name,
                patientVillage: patient.village,
                patientContact: patient.contact || '',
                visitId: savedVisitId,
                followUpDate,
                followUpTime,
                reason: followUpReason || 'Follow-up check',
                scheduledBy: user?.uid || '',
                scheduledByName: userName || '',
            });
            setFollowUpScheduled(true);
            toast.success(t('visitEntry.followUpScheduled', 'Follow-up scheduled successfully.'));
        } catch (err) {
            console.error('Error scheduling follow-up:', err);
            toast.error(t('visitEntry.followUpError', 'Failed to schedule follow-up.'));
        } finally {
            setSchedulingFollowUp(false);
        }
    };

    // AI Advisory handler
    const handleGetAIAdvisory = async () => {
        if (!patient || !news2Result) return;
        setAiLoading(true);
        setAiError('');
        setAiAdvisory(null);
        try {
            const result = await getAIClinicalAdvisory({
                patient,
                vitals,
                chiefComplaint,
                symptomDuration,
                consciousness,
                redFlags,
                news2Score: news2Result.totalScore,
                riskLevel: news2Result.riskLevel,
            });
            setAiAdvisory(result);
        } catch (err) {
            if (err.message === 'GEMINI_API_KEY_MISSING') {
                setAiError(t('aiAdvisory.apiKeyMissing', 'Gemini API key not configured. Add VITE_GEMINI_API_KEY to your .env file.'));
            } else if (err.message === 'GEMINI_RATE_LIMITED') {
                setAiError(t('aiAdvisory.rateLimited', 'API rate limit reached. Please wait a minute and try again.'));
            } else {
                setAiError(t('aiAdvisory.requestFailed', 'AI advisory request failed. Please try again.'));
            }
            console.error('AI Advisory error:', err);
        } finally {
            setAiLoading(false);
        }
    };

    // Determine trigger template based on risk level
    const getTriggerTemplate = () => {
        if (!news2Result) return null;
        if (news2Result.riskLevel === 'Green') return TRIGGER_TEMPLATES.green;
        if (news2Result.riskLevel === 'Yellow') return TRIGGER_TEMPLATES.yellow;
        return null; // Red triggers from PHC side
    };

    if (loading) {
        return (
            <div className="loading-spinner">
                <div>
                    <div className="spinner"></div>
                    <div className="loading-text">{t('visitEntry.loadingPatient')}</div>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="card">
                <div className="empty-state">
                    <div className="empty-icon"><AlertTriangle size={48} strokeWidth={1} /></div>
                    <p>{t('visitEntry.patientNotFound')}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '800px' }}>
            {/* Patient Info Banner */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div className="patient-avatar">
                        {patient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600 }}>{patient.name}</div>
                        <div className="text-muted">{patient.age} {t('patientProfile.yrs')} • {patient.gender} • {patient.village}</div>
                    </div>
                    <span className="badge badge-indigo" style={{ marginLeft: 'auto' }}>{patient.patientId}</span>
                </div>
            </div>

            {/* Visit Form */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">
                        <Stethoscope size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                        {t('visit.chiefComplaint')}
                    </h2>
                </div>

                <div className="form-group">
                    <textarea
                        className="form-input"
                        value={chiefComplaint}
                        onChange={(e) => setChiefComplaint(e.target.value)}
                        placeholder={t('visitEntry.complaintPlaceholder')}
                        rows={3}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">
                        {t('visit.symptomDuration')}
                    </label>
                    <input
                        type="number"
                        className="form-input"
                        value={symptomDuration}
                        onChange={(e) => setSymptomDuration(e.target.value)}
                        placeholder={t('visitEntry.daysPlaceholder')}
                        min="0"
                        style={{ maxWidth: '200px' }}
                    />
                </div>
            </div>

            {/* Vitals */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">
                        <Activity size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                        {t('visit.vitals')}
                    </h2>
                </div>

                <div className="form-row-3">
                    <div className="form-group">
                        <label className="form-label">
                            {t('visit.respiratoryRate')}
                            <span className="vital-range-hint">12–20 /min</span>
                        </label>
                        <input
                            type="number"
                            className="form-input"
                            value={vitals.respiratoryRate}
                            onChange={(e) => handleVitalChange('respiratoryRate', e.target.value)}
                            placeholder="breaths/min"
                            style={vitalErrors.respiratoryRate ? { borderColor: 'var(--red)' } : vitalWarnings.respiratoryRate ? { borderColor: 'var(--yellow)' } : {}}
                        />
                        {vitalErrors.respiratoryRate && <div className="form-error">{vitalErrors.respiratoryRate}</div>}
                        {vitalWarnings.respiratoryRate && <div className="form-hint" style={{ color: 'var(--yellow-dark)' }}>⚠ {vitalWarnings.respiratoryRate}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            {t('visit.pulseRate')}
                            <span className="vital-range-hint">51–90 bpm</span>
                        </label>
                        <input
                            type="number"
                            className="form-input"
                            value={vitals.pulseRate}
                            onChange={(e) => handleVitalChange('pulseRate', e.target.value)}
                            placeholder="bpm"
                            style={vitalErrors.pulseRate ? { borderColor: 'var(--red)' } : vitalWarnings.pulseRate ? { borderColor: 'var(--yellow)' } : {}}
                        />
                        {vitalErrors.pulseRate && <div className="form-error">{vitalErrors.pulseRate}</div>}
                        {vitalWarnings.pulseRate && <div className="form-hint" style={{ color: 'var(--yellow-dark)' }}>⚠ {vitalWarnings.pulseRate}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            {t('visit.temperature')}
                            <span className="vital-range-hint">36.1–37.2 °C</span>
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            className="form-input"
                            value={vitals.temperature}
                            onChange={(e) => handleVitalChange('temperature', e.target.value)}
                            placeholder="°C"
                            style={vitalErrors.temperature ? { borderColor: 'var(--red)' } : vitalWarnings.temperature ? { borderColor: 'var(--yellow)' } : {}}
                        />
                        {vitalErrors.temperature && <div className="form-error">{vitalErrors.temperature}</div>}
                        {vitalWarnings.temperature && <div className="form-hint" style={{ color: 'var(--yellow-dark)' }}>⚠ {vitalWarnings.temperature}</div>}
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">
                            {t('visit.spo2')}
                            <span className="vital-range-hint">≥ 96%</span>
                            <span className="text-muted" style={{ marginLeft: '0.5rem' }}>{t('visitEntry.optional')}</span>
                        </label>
                        <input
                            type="number"
                            className="form-input"
                            value={vitals.spo2}
                            onChange={(e) => handleVitalChange('spo2', e.target.value)}
                            placeholder="%"
                            style={vitalErrors.spo2 ? { borderColor: 'var(--red)' } : vitalWarnings.spo2 ? { borderColor: 'var(--yellow)' } : {}}
                        />
                        {vitalErrors.spo2 && <div className="form-error">{vitalErrors.spo2}</div>}
                        {vitalWarnings.spo2 && <div className="form-hint" style={{ color: 'var(--yellow-dark)' }}>⚠ {vitalWarnings.spo2}</div>}
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            {t('visit.systolicBP')}
                            <span className="vital-range-hint">90–140 mmHg</span>
                            <span className="text-muted" style={{ marginLeft: '0.5rem' }}>{t('visitEntry.optional')}</span>
                        </label>
                        <input
                            type="number"
                            className="form-input"
                            value={vitals.systolicBP}
                            onChange={(e) => handleVitalChange('systolicBP', e.target.value)}
                            placeholder="mmHg"
                            style={vitalErrors.systolicBP ? { borderColor: 'var(--red)' } : vitalWarnings.systolicBP ? { borderColor: 'var(--yellow)' } : {}}
                        />
                        {vitalErrors.systolicBP && <div className="form-error">{vitalErrors.systolicBP}</div>}
                        {vitalWarnings.systolicBP && <div className="form-hint" style={{ color: 'var(--yellow-dark)' }}>⚠ {vitalWarnings.systolicBP}</div>}
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        {t('visit.consciousnessLevel')}
                    </label>
                    <div className="radio-group">
                        {['Alert', 'Voice', 'Pain', 'Unresponsive'].map((level) => (
                            <label key={level} className={`radio-option ${consciousness === level ? 'selected' : ''}`}>
                                <input
                                    type="radio"
                                    name="consciousness"
                                    value={level}
                                    checked={consciousness === level}
                                    onChange={(e) => setConsciousness(e.target.value)}
                                />
                                {t(`visitEntry.${level.toLowerCase()}`)}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Red Flags */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title" style={{ color: 'var(--alert-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Flag size={18} /> {t('visit.redFlagChecklist')}
                    </h2>
                </div>

                <div className="checkbox-group">
                    {RED_FLAGS.map((flag) => (
                        <label key={flag} className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={redFlags.includes(flag)}
                                onChange={() => handleRedFlagToggle(flag)}
                            />
                            {flag}
                        </label>
                    ))}
                </div>
            </div>

            {/* Calculate Button */}
            {!news2Result && (
                <button
                    className="btn btn-primary btn-lg btn-block"
                    onClick={handleCalculateNEWS2}
                    style={{ marginBottom: '1.5rem' }}
                >
                    <Calculator size={20} /> {t('visit.calculateNEWS2')}
                </button>
            )}

            {/* Repeat Visit Alert */}
            {recentVisits.length > 0 && (
                <div className="repeat-visit-alert" style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                        <TriangleAlert size={20} />
                        <strong>{t('visitEntry.recentVisitDetected')}</strong>
                    </div>
                    <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem' }}>
                        {t('visitEntry.recentVisitWarning', { count: recentVisits.length })}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {recentVisits.slice(0, 3).map((v, i) => (
                            <div key={i} className="repeat-visit-item">
                                <span className={`badge badge-${(v.riskLevel || 'green').toLowerCase()}`} style={{ fontSize: '0.65rem' }}>
                                    {v.riskLevel || 'Green'}
                                </span>
                                <span style={{ fontSize: '0.78rem' }}>
                                    Score {v.news2Score ?? '—'} • {v.chiefComplaint ? v.chiefComplaint.substring(0, 40) : t('visitEntry.noComplaint')}
                                </span>
                                <span className="text-muted" style={{ fontSize: '0.7rem', marginLeft: 'auto' }}>
                                    {v.createdAt?.toDate ? v.createdAt.toDate().toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* NEWS2 Results */}
            {news2Result && (
                <>
                    <div className={`risk-result risk-${news2Result.riskLevel.toLowerCase()}`} style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                            <div>
                                <div className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                                    NEWS2 Score
                                </div>
                                <div className={`risk-score score-${news2Result.riskLevel.toLowerCase()}`}>
                                    {news2Result.totalScore}
                                </div>
                            </div>
                            <span className={`badge badge-${news2Result.riskLevel.toLowerCase()}`} style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                                {advisory?.level || news2Result.riskLevel} {t('visitEntry.risk')}
                            </span>
                        </div>

                        {/* Partial scoring warning */}
                        {news2Result.isPartial && (
                            <div className="warning-banner" style={{ marginBottom: '1rem' }}>
                                <span className="warning-icon"><AlertTriangle size={18} /></span>
                                {t('visitEntry.partialScoring')} {news2Result.missingParams.join(', ')}
                            </div>
                        )}

                        {/* Red flags warning */}
                        {news2Result.hasRedFlags && (
                            <div className="warning-banner" style={{ marginBottom: '1rem', background: 'var(--alert-red-bg)', borderColor: 'var(--alert-red-light)', color: 'var(--alert-red)' }}>
                                <span className="warning-icon"><ShieldAlert size={18} /></span>
                                {t('visitEntry.redFlagsDetected')}
                            </div>
                        )}

                        {/* Parameter Breakdown */}
                        <div className="news2-breakdown">
                            {news2Result.breakdown.map((param, idx) => (
                                <div key={idx} className="news2-param">
                                    <span className="news2-param-name">
                                        {param.name}
                                    </span>
                                    <div className="news2-param-detail">
                                        <span className="news2-param-value">{param.value}</span>
                                        <span className={`news2-param-score score-${param.score}`}>
                                            {param.score} pts
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.75rem', fontStyle: 'italic' }}>
                            {t('visitEntry.calculatedUsing')}
                        </div>
                    </div>

                    {/* ✅ Risk Explanation Panel — "Why This Risk?" */}
                    {(news2Result.riskLevel === 'Yellow' || news2Result.riskLevel === 'Red') && (
                        <div className="risk-explanation-panel" style={{ marginBottom: '1.5rem' }}>
                            <div className="risk-explanation-header">
                                <Info size={18} />
                                <span>{t('visitEntry.whyRisk', { level: news2Result.riskLevel === 'Red' ? t('visit.highRisk') : t('visit.moderateRisk') })}</span>
                                <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                    ({news2Result.riskLevel === 'Red' ? t('visit.highRisk') : t('visit.moderateRisk')})
                                </span>
                            </div>

                            <div className="risk-contributors">
                                {news2Result.breakdown.filter(p => p.score > 0).map((param, idx) => (
                                    <div key={idx} className="risk-contributor-row">
                                        <div className="contributor-param">
                                            <span className="contributor-dot" style={{ background: param.score >= 3 ? 'var(--alert-red)' : param.score >= 2 ? 'var(--yellow)' : 'var(--accent-saffron)' }}></span>
                                            {param.name}
                                        </div>
                                        <div className="contributor-detail">
                                            <span className="contributor-value">{param.value}</span>
                                            <span className="contributor-arrow">→</span>
                                            <span className={`contributor-score score-${param.score >= 3 ? 'high' : param.score >= 2 ? 'med' : 'low'}`}>+{param.score}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Red flags as contributors */}
                                {news2Result.hasRedFlags && redFlags.map((flag, idx) => (
                                    <div key={`rf-${idx}`} className="risk-contributor-row red-flag-row">
                                        <div className="contributor-param">
                                            <Flag size={12} color="var(--alert-red)" />
                                            {t('visitEntry.redFlagLabel')} {flag}
                                        </div>
                                        <div className="contributor-detail">
                                            <span className="contributor-score score-high">{t('visitEntry.autoElevate')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="risk-explanation-summary">
                                {t('visitEntry.total')} <strong>{news2Result.totalScore} {t('visitEntry.points')}</strong>
                                {news2Result.hasRedFlags && ` ${t('visitEntry.redFlagAutoElevation')}`}
                                &nbsp;→ <span className={`badge badge-${news2Result.riskLevel.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>{news2Result.riskLevel} Risk</span>
                            </div>
                        </div>
                    )}

                    {/* Risk Advisory */}
                    {advisory && (
                        <div className="advisory-box" style={{ marginBottom: '1.5rem' }}>
                            <div className="advisory-label">
                                {t('visitEntry.riskAdvisoryLabel')} {advisory.level}
                            </div>
                            {advisory.items.map((item, idx) => {
                                const IconComp = ADVISORY_ICONS[item.icon] || Activity;
                                return (
                                    <div key={idx} className="advisory-item">
                                        <span className="advisory-icon"><IconComp size={16} /></span>
                                        <span>{item.text}</span>
                                    </div>
                                );
                            })}
                            <div className="advisory-disclaimer">
                                {t('visitEntry.guidelineDisclaimer')}
                            </div>
                        </div>
                    )}

                    {/* ═══ AI Clinical Advisory Card ═══ */}
                    <div className="card" style={{ marginBottom: '1.5rem', border: '1px solid var(--accent-indigo)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                        <div
                            style={{
                                background: 'linear-gradient(135deg, var(--accent-indigo), #6366f1)',
                                color: '#fff',
                                padding: '0.85rem 1.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                            }}
                            onClick={() => setAiExpanded(e => !e)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <BrainCircuit size={20} />
                                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t('aiAdvisory.title', 'AI Clinical Advisory')}</span>
                                <span style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '99px' }}>Gemini</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>{aiExpanded ? '▲' : '▼'}</span>
                        </div>

                        {aiExpanded && (
                            <div style={{ padding: '1.25rem' }}>
                                {/* Not yet requested */}
                                {!aiAdvisory && !aiLoading && !aiError && (
                                    <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                                        <Sparkles size={32} color="var(--accent-indigo)" style={{ marginBottom: '0.5rem' }} />
                                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                            {t('aiAdvisory.description', 'Get AI-powered differential diagnosis suggestions and risk factors based on the patient\'s vitals and complaint.')}
                                        </p>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleGetAIAdvisory}
                                            disabled={!isAIAdvisoryAvailable()}
                                            style={{ background: 'var(--accent-indigo)' }}
                                        >
                                            <BrainCircuit size={16} /> {t('aiAdvisory.getAdvisory', 'Get AI Advisory')}
                                        </button>
                                        {!isAIAdvisoryAvailable() && (
                                            <p className="form-hint" style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                                                {t('aiAdvisory.apiKeyMissing', 'Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env file.')}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Loading */}
                                {aiLoading && (
                                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                        <Loader2 size={32} color="var(--accent-indigo)" className="spin" style={{ animation: 'spin 1s linear infinite', marginBottom: '0.75rem' }} />
                                        <p style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{t('aiAdvisory.analyzing', 'Analyzing clinical data...')}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t('aiAdvisory.aiProcessing', 'AI is reviewing vitals, symptoms, and risk factors')}</p>
                                    </div>
                                )}

                                {/* Error */}
                                {aiError && (
                                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                                        <AlertTriangle size={28} color="var(--alert-red)" style={{ marginBottom: '0.5rem' }} />
                                        <p style={{ color: 'var(--alert-red)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{aiError}</p>
                                        <button className="btn btn-secondary btn-sm" onClick={handleGetAIAdvisory}>
                                            <RotateCcw size={14} /> {t('aiAdvisory.retry', 'Retry')}
                                        </button>
                                    </div>
                                )}

                                {/* Results */}
                                {aiAdvisory && (
                                    <div>
                                        {/* Overall Assessment */}
                                        <div style={{
                                            background: 'var(--bg-secondary)',
                                            borderRadius: 'var(--radius)',
                                            padding: '0.75rem 1rem',
                                            marginBottom: '1rem',
                                            borderLeft: '4px solid var(--accent-indigo)',
                                            fontSize: '0.88rem',
                                            lineHeight: 1.5,
                                        }}>
                                            <strong style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                                <Sparkles size={14} color="var(--accent-indigo)" />
                                                {t('aiAdvisory.assessment', 'Clinical Assessment')}
                                            </strong>
                                            {aiAdvisory.overallAssessment}
                                        </div>

                                        {/* Possible Conditions */}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                                                <Stethoscope size={15} color="var(--accent-indigo)" />
                                                {t('aiAdvisory.possibleConditions', 'Possible Conditions')}
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                {(aiAdvisory.possibleConditions || []).map((c, i) => (
                                                    <div key={i} style={{
                                                        display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                                                        padding: '0.5rem 0.75rem',
                                                        background: 'var(--bg-secondary)',
                                                        borderRadius: 'var(--radius)',
                                                    }}>
                                                        <span className={`badge ${c.likelihood === 'High' ? 'badge-red' : c.likelihood === 'Medium' ? 'badge-yellow' : 'badge-green'}`}
                                                            style={{ fontSize: '0.6rem', flexShrink: 0, marginTop: '2px' }}>
                                                            {c.likelihood}
                                                        </span>
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{c.condition}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{c.explanation}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Missed Risk Factors */}
                                        <div style={{ marginBottom: '1rem' }}>
                                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                                                <ShieldQuestion size={15} color="var(--yellow-dark, #b45309)" />
                                                {t('aiAdvisory.missedRisks', 'Risk Factors to Consider')}
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                {(aiAdvisory.missedRiskFactors || []).map((r, i) => (
                                                    <div key={i} style={{
                                                        display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                                                        padding: '0.5rem 0.75rem',
                                                        background: 'rgba(245, 158, 11, 0.06)',
                                                        border: '1px solid rgba(245, 158, 11, 0.15)',
                                                        borderRadius: 'var(--radius)',
                                                    }}>
                                                        <Lightbulb size={14} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
                                                        <div>
                                                            <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{r.factor}</div>
                                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.reasoning}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Recommended Actions */}
                                        <div style={{ marginBottom: '0.75rem' }}>
                                            <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                                                <ArrowRight size={15} color="var(--green)" />
                                                {t('aiAdvisory.recommendedActions', 'Recommended Actions')}
                                            </h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                                {(aiAdvisory.recommendedActions || []).map((a, i) => (
                                                    <div key={i} style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.6rem',
                                                        padding: '0.5rem 0.75rem',
                                                        background: 'var(--bg-secondary)',
                                                        borderRadius: 'var(--radius)',
                                                    }}>
                                                        <span className={`badge ${a.urgency === 'Immediate' ? 'badge-red' : a.urgency === 'Soon' ? 'badge-yellow' : 'badge-green'}`}
                                                            style={{ fontSize: '0.6rem', flexShrink: 0 }}>
                                                            {a.urgency}
                                                        </span>
                                                        <span style={{ fontSize: '0.82rem' }}>{a.action}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Disclaimer + Retry */}
                                        <div style={{
                                            borderTop: '1px solid var(--border-color)',
                                            paddingTop: '0.75rem',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}>
                                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic', flex: 1 }}>
                                                {t('aiAdvisory.disclaimer', 'AI suggestions are not a diagnosis. Always use clinical judgement and consult a doctor for confirmation.')}
                                            </p>
                                            <button className="btn btn-ghost btn-sm" onClick={handleGetAIAdvisory} style={{ flexShrink: 0, marginLeft: '0.5rem' }}>
                                                <RotateCcw size={12} /> {t('aiAdvisory.regenerate', 'Regenerate')}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Save & Review Actions */}
                    {!savedVisitId ? (
                        <button
                            className="btn btn-success btn-lg btn-block"
                            onClick={handleSaveVisit}
                            disabled={saving}
                            style={{ marginBottom: '1rem' }}
                        >
                            <Save size={18} /> {saving ? t('visit.saving') : t('visit.saveVisit')}
                        </button>
                    ) : (
                        <>
                            <div className="card" style={{ marginBottom: '1.5rem' }}>
                                <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                                    <div style={{ marginBottom: '0.5rem' }}><CheckCircle2 size={36} color="var(--green)" /></div>
                                    <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{t('visitEntry.visitSavedSuccess')}</div>

                                    {!reviewRequested ? (
                                        <div>
                                            {!showEscalation ? (
                                                <>
                                                    <p className="text-muted" style={{ marginBottom: '1rem' }}>
                                                        {t('visitEntry.phcReviewQuestion')}
                                                    </p>
                                                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={() => setShowEscalation(true)}
                                                        >
                                                            <Send size={16} /> {t('visitEntry.requestPHCReview')}
                                                        </button>
                                                        <button
                                                            className="btn btn-danger"
                                                            onClick={() => { setEscalationReasons(['emergency']); handleRequestReview(true); }}
                                                        >
                                                            <ShieldAlert size={16} /> {t('visitEntry.markEmergency')}
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                /* ✅ Escalation Context Selection */
                                                <div className="escalation-context">
                                                    <div className="escalation-title">
                                                        <ClipboardList size={16} />
                                                        <span>{t('visitEntry.reasonForEscalation')}</span>
                                                        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>{t('visit.selectReferralReason')}</span>
                                                    </div>
                                                    <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0 0 0.75rem' }}>
                                                        {t('visitEntry.selectOneOrMore')}
                                                    </p>
                                                    <div className="escalation-reasons-grid">
                                                        {ESCALATION_REASONS.map(r => {
                                                            const Icon = r.icon;
                                                            const selected = escalationReasons.includes(r.key);
                                                            return (
                                                                <button
                                                                    key={r.key}
                                                                    className={`escalation-reason-btn ${selected ? 'selected' : ''}`}
                                                                    onClick={() => toggleEscalationReason(r.key)}
                                                                >
                                                                    <Icon size={16} />
                                                                    <span>{r.label}</span>
                                                                    {selected && <CheckCircle2 size={14} className="check-icon" />}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={() => handleRequestReview(false)}
                                                            disabled={escalationReasons.length === 0}
                                                        >
                                                            <Send size={14} /> {t('visitEntry.submitToPHC')}
                                                        </button>
                                                        <button className="btn btn-ghost" onClick={() => setShowEscalation(false)}>
                                                            {t('common.cancel')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <span className="status-badge pending" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                                                {t('visitEntry.phcReviewRequested')}
                                            </span>
                                            {escalationReasons.length > 0 && (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                    {escalationReasons.map(r => (
                                                        <span key={r} className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                                                            {ESCALATION_REASONS.find(er => er.key === r)?.label || r}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-muted" style={{ marginTop: '0.75rem' }}>
                                                {t('visitEntry.phcWillReview')}
                                            </p>
                                        </div>
                                    )}

                                    {/* Trigger-Based Message Suggestion */}
                                    {getTriggerTemplate() && (
                                        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                                            <button
                                                className="btn btn-success btn-sm"
                                                onClick={() => setShowMsgModal(true)}
                                            >
                                                <MessageSquare size={14} /> {getTriggerTemplate().label}
                                            </button>
                                        </div>
                                    )}

                                    <button
                                        className="btn btn-ghost"
                                        onClick={() => navigate(`/patient/${id}`)}
                                        style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <ArrowLeft size={14} /> {t('visitEntry.backToProfile')}
                                    </button>
                                </div>
                            </div>

                            {/* Follow-Up Scheduler */}
                            {savedVisitId && (
                                <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--accent-indigo)' }}>
                                    <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                                        <CalendarPlus size={16} /> {t('visitEntry.scheduleFollowUp')}
                                    </h4>
                                    {followUpScheduled ? (
                                        <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                                            <CheckCircle2 size={28} color="var(--green)" />
                                            <p style={{ fontWeight: 600, marginTop: '0.5rem' }}>{t('visitEntry.followUpScheduledFor', { date: followUpDate, time: followUpTime })}</p>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                                <input
                                                    type="date"
                                                    className="form-input"
                                                    value={followUpDate}
                                                    onChange={e => setFollowUpDate(e.target.value)}
                                                    style={{ flex: '1 1 140px' }}
                                                />
                                                <input
                                                    type="time"
                                                    className="form-input"
                                                    value={followUpTime}
                                                    onChange={e => setFollowUpTime(e.target.value)}
                                                    style={{ flex: '0 0 110px' }}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder={t('visitEntry.reasonPlaceholder')}
                                                value={followUpReason}
                                                onChange={e => setFollowUpReason(e.target.value)}
                                                style={{ marginBottom: '0.5rem' }}
                                            />
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={handleScheduleFollowUp}
                                                disabled={!followUpDate || schedulingFollowUp}
                                            >
                                                <CalendarPlus size={14} /> {schedulingFollowUp ? t('visitEntry.scheduling') : t('visitEntry.scheduleFollowUpBtn')}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* Message Suggest Modal */}
            <MessageSuggestModal
                isOpen={showMsgModal}
                onClose={() => setShowMsgModal(false)}
                template={getTriggerTemplate()}
                patient={patient}
                visitId={savedVisitId}
            />
        </div>
    );
}
