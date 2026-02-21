// ============================================================
// Visit Entry Page — Record vitals + Calculate NEWS2
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPatientById } from '../../services/patientService';
import { createVisit, requestPHCReview } from '../../services/visitService';
import { calculateNEWS2, getRiskAdvisory, RED_FLAGS } from '../../utils/news2';
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

export default function VisitEntry() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, userName } = useAuth();

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

    useEffect(() => {
        loadPatient();
    }, [id]);

    const loadPatient = async () => {
        try {
            const p = await getPatientById(id);
            setPatient(p);
        } catch (err) {
            console.error('Error loading patient:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVitalChange = (field, value) => {
        setVitals({ ...vitals, [field]: value });
    };

    const handleRedFlagToggle = (flag) => {
        setRedFlags((prev) =>
            prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
        );
    };

    const handleCalculateNEWS2 = () => {
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
        } catch (err) {
            console.error('Error saving visit:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleRequestReview = async (isEmergency = false) => {
        if (!savedVisitId) return;
        try {
            await requestPHCReview(savedVisitId, isEmergency);
            setReviewRequested(true);
        } catch (err) {
            console.error('Error requesting review:', err);
        }
    };

    if (loading) {
        return (
            <div className="loading-spinner">
                <div>
                    <div className="spinner"></div>
                    <div className="loading-text">Loading patient...</div>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="card">
                <div className="empty-state">
                    <div className="empty-icon"><AlertTriangle size={48} strokeWidth={1} /></div>
                    <p>Patient not found</p>
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
                        <div className="text-muted">{patient.age} yrs • {patient.gender} • {patient.village}</div>
                    </div>
                    <span className="badge badge-indigo" style={{ marginLeft: 'auto' }}>{patient.patientId}</span>
                </div>
            </div>

            {/* Visit Form */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title">
                        <Stethoscope size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />
                        Chief Complaint <span className="text-marathi text-muted" style={{ fontSize: '0.8rem' }}>(मुख्य तक्रार)</span>
                    </h2>
                </div>

                <div className="form-group">
                    <textarea
                        className="form-input"
                        value={chiefComplaint}
                        onChange={(e) => setChiefComplaint(e.target.value)}
                        placeholder="Describe the patient's main complaint..."
                        rows={3}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">
                        Duration of Symptoms (days) <span className="label-marathi">लक्षणांचा कालावधी</span>
                    </label>
                    <input
                        type="number"
                        className="form-input"
                        value={symptomDuration}
                        onChange={(e) => setSymptomDuration(e.target.value)}
                        placeholder="Number of days"
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
                        Vitals <span className="text-marathi text-muted" style={{ fontSize: '0.8rem' }}>(शारीरिक चिन्हे)</span>
                    </h2>
                </div>

                <div className="form-row-3">
                    <div className="form-group">
                        <label className="form-label">Respiratory Rate <span className="label-marathi">श्वसन दर</span></label>
                        <input
                            type="number"
                            className="form-input"
                            value={vitals.respiratoryRate}
                            onChange={(e) => handleVitalChange('respiratoryRate', e.target.value)}
                            placeholder="breaths/min"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Pulse Rate <span className="label-marathi">नाडी दर</span></label>
                        <input
                            type="number"
                            className="form-input"
                            value={vitals.pulseRate}
                            onChange={(e) => handleVitalChange('pulseRate', e.target.value)}
                            placeholder="bpm"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Temperature <span className="label-marathi">तापमान</span></label>
                        <input
                            type="number"
                            step="0.1"
                            className="form-input"
                            value={vitals.temperature}
                            onChange={(e) => handleVitalChange('temperature', e.target.value)}
                            placeholder="°C"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">
                            SpO2 <span className="label-marathi">ऑक्सिजन</span>
                            <span className="text-muted" style={{ marginLeft: '0.5rem' }}>(Optional)</span>
                        </label>
                        <input
                            type="number"
                            className="form-input"
                            value={vitals.spo2}
                            onChange={(e) => handleVitalChange('spo2', e.target.value)}
                            placeholder="%"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            Systolic BP <span className="label-marathi">रक्तदाब</span>
                            <span className="text-muted" style={{ marginLeft: '0.5rem' }}>(Optional)</span>
                        </label>
                        <input
                            type="number"
                            className="form-input"
                            value={vitals.systolicBP}
                            onChange={(e) => handleVitalChange('systolicBP', e.target.value)}
                            placeholder="mmHg"
                        />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">
                        Consciousness Level <span className="label-marathi">चेतना पातळी</span>
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
                                {level}
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Red Flags */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <h2 className="card-title" style={{ color: 'var(--alert-red)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Flag size={18} /> Red Flag Checklist <span className="text-marathi text-muted" style={{ fontSize: '0.8rem' }}>(धोक्याची चिन्हे)</span>
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
                    <Calculator size={20} /> Calculate NEWS2
                </button>
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
                                {advisory?.level || news2Result.riskLevel} Risk
                            </span>
                        </div>

                        {/* Partial scoring warning */}
                        {news2Result.isPartial && (
                            <div className="warning-banner" style={{ marginBottom: '1rem' }}>
                                <span className="warning-icon"><AlertTriangle size={18} /></span>
                                Partial scoring — missing: {news2Result.missingParams.join(', ')}
                            </div>
                        )}

                        {/* Red flags warning */}
                        {news2Result.hasRedFlags && (
                            <div className="warning-banner" style={{ marginBottom: '1rem', background: 'var(--alert-red-bg)', borderColor: 'var(--alert-red-light)', color: 'var(--alert-red)' }}>
                                <span className="warning-icon"><ShieldAlert size={18} /></span>
                                Red flags detected — risk auto-elevated to HIGH
                            </div>
                        )}

                        {/* Parameter Breakdown */}
                        <div className="news2-breakdown">
                            {news2Result.breakdown.map((param, idx) => (
                                <div key={idx} className="news2-param">
                                    <span className="news2-param-name">
                                        {param.name} <span className="text-marathi" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({param.marathiName})</span>
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
                            Calculated using NEWS2 Framework
                        </div>
                    </div>

                    {/* Risk Advisory */}
                    {advisory && (
                        <div className="advisory-box" style={{ marginBottom: '1.5rem' }}>
                            <div className="advisory-label">
                                Risk Advisory — {advisory.level} <span className="text-marathi">({advisory.levelMarathi})</span>
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
                                Guideline-based advisory (Non-diagnostic)
                            </div>
                        </div>
                    )}

                    {/* Save & Review Actions */}
                    {!savedVisitId ? (
                        <button
                            className="btn btn-success btn-lg btn-block"
                            onClick={handleSaveVisit}
                            disabled={saving}
                            style={{ marginBottom: '1rem' }}
                        >
                            <Save size={18} /> {saving ? 'Saving Visit...' : 'Save Visit Record'}
                        </button>
                    ) : (
                        <div className="card" style={{ marginBottom: '1.5rem' }}>
                            <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                                <div style={{ marginBottom: '0.5rem' }}><CheckCircle2 size={36} color="var(--green)" /></div>
                                <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Visit Saved Successfully</div>

                                {!reviewRequested ? (
                                    <div>
                                        <p className="text-muted" style={{ marginBottom: '1rem' }}>
                                            Would you like to request a PHC doctor review?
                                        </p>
                                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => handleRequestReview(false)}
                                            >
                                                <Send size={16} /> Request PHC Review
                                            </button>
                                            <button
                                                className="btn btn-danger"
                                                onClick={() => handleRequestReview(true)}
                                            >
                                                <ShieldAlert size={16} /> Mark as Emergency
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <span className="status-badge pending" style={{ fontSize: '0.85rem', padding: '6px 14px' }}>
                                            PHC Review Requested
                                        </span>
                                        <p className="text-muted" style={{ marginTop: '0.75rem' }}>
                                            The PHC doctor will review this case shortly.
                                        </p>
                                    </div>
                                )}

                                <button
                                    className="btn btn-ghost"
                                    onClick={() => navigate(`/patient/${id}`)}
                                    style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                >
                                    <ArrowLeft size={14} /> Back to Patient Profile
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
