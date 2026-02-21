// ============================================================
// Maternity Tracker — Pre & Post Natal Care for ASHA Workers
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAllPatients } from '../../services/patientService';
import {
    createMaternityRecord,
    getActiveMaternityRecord,
    getMaternityRecords,
    addANCVisit,
    recordDelivery,
    addPNCVisit,
    closeMaternityRecord,
    computeEDD,
    getGestationalAge,
    getTrimester,
    daysUntilEDD,
    computeMaternalRisk,
    HIGH_RISK_FACTORS,
    ANC_SCHEDULE,
    PNC_SCHEDULE,
    BABY_IMMUNIZATIONS,
    MATERNAL_DANGER_SIGNS,
    MODERATE_RISK_INDICATORS,
} from '../../services/maternityService';
import {
    Baby,
    Heart,
    Calendar,
    AlertCircle,
    CheckCircle2,
    Clock,
    Plus,
    ArrowLeft,
    Activity,
    Shield,
    Stethoscope,
    Syringe,
    User,
    Search,
    X,
    ChevronRight,
    FileText,
} from 'lucide-react';

export default function MaternityTracker() {
    const { userName } = useAuth();

    // ── State ──
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('anc'); // anc | pnc
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [maternityRecord, setMaternityRecord] = useState(null);
    const [allRecords, setAllRecords] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [showANCForm, setShowANCForm] = useState(false);
    const [showDeliveryForm, setShowDeliveryForm] = useState(false);
    const [showPNCForm, setShowPNCForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // ── Registration Form ──
    const [regForm, setRegForm] = useState({
        lmpDate: '',
        gravida: '1',
        para: '0',
        bloodGroup: '',
        highRiskFactors: [],
    });

    // ── ANC Form ──
    const [ancForm, setANCForm] = useState({
        visitNumber: 1,
        weight: '',
        bp: '',
        hemoglobin: '',
        urineTest: 'Normal',
        fundalHeight: '',
        fetalHeartRate: '',
        ttDose: false,
        ifaTablets: false,
        notes: '',
        // Maternal Vitals
        bpSystolic: '',
        bpDiastolic: '',
        pulse: '',
        respiratoryRate: '',
        temperature: '',
        spo2: '',
        // Danger Signs & Moderate Risk
        dangerSigns: [],
        moderateRisks: [],
    });

    // ── Delivery Form ──
    const [deliveryForm, setDeliveryForm] = useState({
        date: new Date().toISOString().split('T')[0],
        type: 'Normal',
        place: 'Hospital',
        babyWeight: '',
        babyGender: '',
        apgarScore: '',
        complications: '',
        notes: '',
    });

    // ── PNC Form ──
    const [pncForm, setPNCForm] = useState({
        visitType: 'Day 1',
        motherTemp: '',
        motherBP: '',
        breastfeeding: 'Exclusive',
        woundHealing: 'Good',
        babyWeight: '',
        babyTemp: '',
        immunizations: [],
        notes: '',
    });

    // ── Load all female patients ──
    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            const all = await getAllPatients();
            setPatients(all.filter(p => p.gender?.toLowerCase() === 'female'));
        } catch (err) {
            console.error('Error loading patients:', err);
            setError('Failed to load patients: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Load maternity record for selected patient ──
    useEffect(() => {
        if (selectedPatient) {
            loadMaternityData(selectedPatient.id);
        }
    }, [selectedPatient]);

    const loadMaternityData = async (patientId) => {
        try {
            const [active, records] = await Promise.all([
                getActiveMaternityRecord(patientId),
                getMaternityRecords(patientId),
            ]);
            setMaternityRecord(active);
            setAllRecords(records);
            if (active?.status === 'postnatal') {
                setActiveTab('pnc');
            } else {
                setActiveTab('anc');
            }
        } catch (err) {
            console.error('Error loading maternity data:', err);
            setError('Failed to load maternity data: ' + err.message);
        }
    };

    // ── Filtered patients ──
    const filteredPatients = useMemo(() => {
        if (!searchTerm) return patients;
        const term = searchTerm.toLowerCase();
        return patients.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.village?.toLowerCase().includes(term) ||
            p.patientId?.toLowerCase().includes(term)
        );
    }, [patients, searchTerm]);

    // ── Helpers ──
    const clearMessages = () => { setSuccess(''); setError(''); };

    const getRecordHelpers = () => {
        if (!maternityRecord) return {};
        const lmpDate = maternityRecord.lmpDate?.toDate?.()
            ? maternityRecord.lmpDate.toDate()
            : new Date(maternityRecord.lmpDate);
        const eddDate = maternityRecord.eddDate?.toDate?.()
            ? maternityRecord.eddDate.toDate()
            : new Date(maternityRecord.eddDate);
        const ga = getGestationalAge(lmpDate);
        const trimester = getTrimester(ga.weeks);
        const daysLeft = daysUntilEDD(eddDate);
        return { lmpDate, eddDate, ga, trimester, daysLeft };
    };

    // ── Register Pregnancy ──
    const handleRegisterPregnancy = async (e) => {
        e.preventDefault();
        clearMessages();
        setSubmitting(true);
        try {
            const newRecord = await createMaternityRecord(selectedPatient.id, {
                ...regForm,
                createdBy: userName,
            });
            // Immediately set the returned record so UI updates right away
            setMaternityRecord(newRecord);
            setActiveTab('anc');
            setSuccess('Pregnancy registered successfully!');
            setShowRegisterForm(false);
            setRegForm({ lmpDate: '', gravida: '1', para: '0', bloodGroup: '', highRiskFactors: [] });
            // Also refresh from DB in background for full data consistency
            loadMaternityData(selectedPatient.id);
        } catch (err) {
            setError('Failed to register: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Compute live risk from ANC form ──
    const liveRisk = useMemo(() => {
        const vitals = {
            bpSystolic: ancForm.bpSystolic,
            bpDiastolic: ancForm.bpDiastolic,
            pulse: ancForm.pulse,
            respiratoryRate: ancForm.respiratoryRate,
            temperature: ancForm.temperature,
            spo2: ancForm.spo2,
        };
        return computeMaternalRisk(vitals, ancForm.dangerSigns, ancForm.moderateRisks);
    }, [ancForm.bpSystolic, ancForm.bpDiastolic, ancForm.pulse, ancForm.respiratoryRate, ancForm.temperature, ancForm.spo2, ancForm.dangerSigns, ancForm.moderateRisks]);

    // ── Toggle danger sign ──
    const toggleDangerSign = (key) => {
        setANCForm(prev => ({
            ...prev,
            dangerSigns: prev.dangerSigns.includes(key)
                ? prev.dangerSigns.filter(k => k !== key)
                : [...prev.dangerSigns, key],
        }));
    };

    // ── Toggle moderate risk ──
    const toggleModerateRisk = (key) => {
        setANCForm(prev => ({
            ...prev,
            moderateRisks: prev.moderateRisks.includes(key)
                ? prev.moderateRisks.filter(k => k !== key)
                : [...prev.moderateRisks, key],
        }));
    };

    // ── Add ANC Visit ──
    const handleAddANC = async (e) => {
        e.preventDefault();
        clearMessages();
        setSubmitting(true);
        try {
            const { ga } = getRecordHelpers();
            const vitals = {
                bpSystolic: ancForm.bpSystolic,
                bpDiastolic: ancForm.bpDiastolic,
                pulse: ancForm.pulse,
                respiratoryRate: ancForm.respiratoryRate,
                temperature: ancForm.temperature,
                spo2: ancForm.spo2,
            };
            const risk = computeMaternalRisk(vitals, ancForm.dangerSigns, ancForm.moderateRisks);
            await addANCVisit(selectedPatient.id, maternityRecord.id, {
                ...ancForm,
                bp: `${ancForm.bpSystolic || '—'}/${ancForm.bpDiastolic || '—'}`,
                vitals,
                dangerSigns: ancForm.dangerSigns,
                moderateRisks: ancForm.moderateRisks,
                riskLevel: risk.level,
                riskReasons: risk.reasons,
                escalate: risk.escalate,
                gestationalWeeks: ga.weeks,
                recordedBy: userName,
            });
            setSuccess(risk.escalate
                ? '⚠️ HIGH RISK — ANC visit saved. Immediate PHC escalation recommended!'
                : 'ANC visit recorded!');
            setShowANCForm(false);
            setANCForm({ visitNumber: 1, weight: '', bp: '', hemoglobin: '', urineTest: 'Normal', fundalHeight: '', fetalHeartRate: '', ttDose: false, ifaTablets: false, notes: '', bpSystolic: '', bpDiastolic: '', pulse: '', respiratoryRate: '', temperature: '', spo2: '', dangerSigns: [], moderateRisks: [] });
            await loadMaternityData(selectedPatient.id);
        } catch (err) {
            setError('Failed to add ANC visit: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Record Delivery ──
    const handleRecordDelivery = async (e) => {
        e.preventDefault();
        clearMessages();
        setSubmitting(true);
        try {
            await recordDelivery(selectedPatient.id, maternityRecord.id, {
                ...deliveryForm,
                recordedBy: userName,
            });
            setSuccess('Delivery outcome recorded! Switched to PNC tracking.');
            setShowDeliveryForm(false);
            setDeliveryForm({ date: new Date().toISOString().split('T')[0], type: 'Normal', place: 'Hospital', babyWeight: '', babyGender: '', apgarScore: '', complications: '', notes: '' });
            await loadMaternityData(selectedPatient.id);
        } catch (err) {
            setError('Failed to record delivery: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Add PNC Visit ──
    const handleAddPNC = async (e) => {
        e.preventDefault();
        clearMessages();
        setSubmitting(true);
        try {
            await addPNCVisit(selectedPatient.id, maternityRecord.id, {
                ...pncForm,
                recordedBy: userName,
            });
            setSuccess('PNC visit recorded!');
            setShowPNCForm(false);
            setPNCForm({ visitType: 'Day 1', motherTemp: '', motherBP: '', breastfeeding: 'Exclusive', woundHealing: 'Good', babyWeight: '', babyTemp: '', immunizations: [], notes: '' });
            await loadMaternityData(selectedPatient.id);
        } catch (err) {
            setError('Failed to add PNC visit: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Toggle risk factor ──
    const toggleRiskFactor = (key) => {
        setRegForm(prev => ({
            ...prev,
            highRiskFactors: prev.highRiskFactors.includes(key)
                ? prev.highRiskFactors.filter(k => k !== key)
                : [...prev.highRiskFactors, key],
        }));
    };

    // ── Toggle immunization ──
    const toggleImmunization = (key) => {
        setPNCForm(prev => ({
            ...prev,
            immunizations: prev.immunizations.includes(key)
                ? prev.immunizations.filter(k => k !== key)
                : [...prev.immunizations, key],
        }));
    };

    // ═══════════════════════ RENDER ═══════════════════════

    if (loading) {
        return (
            <div className="loading-spinner">
                <div>
                    <div className="spinner"></div>
                    <div className="loading-text">Loading maternity tracker...</div>
                </div>
            </div>
        );
    }

    // ── Patient not selected — show search/list ──
    if (!selectedPatient) {
        return (
            <div style={{ maxWidth: '800px' }}>
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Baby size={22} /> Maternity Care
                            <span className="text-marathi text-muted" style={{ fontSize: '0.8rem' }}>
                                (माता सेवा)
                            </span>
                        </h2>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                        Select a female patient to track pre-natal (ANC) and post-natal (PNC) care.
                    </p>

                    {/* Search */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="form-input"
                                placeholder="Search by name, village, or patient ID..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '2.25rem' }}
                            />
                            {searchTerm && (
                                <button className="btn btn-ghost" onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', padding: '4px' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {filteredPatients.length === 0 ? (
                        <div className="empty-state">
                            <p>No female patients found</p>
                        </div>
                    ) : (
                        <div className="maternity-patient-list stagger-children">
                            {filteredPatients.map(p => (
                                <button
                                    key={p.id}
                                    className="maternity-patient-card"
                                    onClick={() => setSelectedPatient(p)}
                                >
                                    <div className="patient-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                                        {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            {p.age} yrs • {p.village} • {p.patientId}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-muted" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Patient selected — show maternity details ──
    const helpers = getRecordHelpers();

    return (
        <div style={{ maxWidth: '900px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <button className="btn btn-ghost" onClick={() => { setSelectedPatient(null); setMaternityRecord(null); setAllRecords([]); clearMessages(); }}>
                    <ArrowLeft size={18} />
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Baby size={20} /> {selectedPatient.name}
                        <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}>
                            {selectedPatient.age} yrs • {selectedPatient.village}
                        </span>
                    </h2>
                </div>
            </div>

            {/* Messages */}
            {success && (
                <div className="warning-banner" style={{ background: 'var(--green-light)', borderColor: 'var(--green)', marginBottom: '1rem' }}>
                    <CheckCircle2 size={16} color="var(--green)" /> {success}
                </div>
            )}
            {error && (
                <div className="warning-banner" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* ── No Active Record — Register Pregnancy ── */}
            {!maternityRecord && !showRegisterForm && (
                <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="empty-state">
                        <div className="empty-icon"><Heart size={48} strokeWidth={1} /></div>
                        <p>No active maternity record</p>
                        <button className="btn btn-primary" onClick={() => setShowRegisterForm(true)} style={{ marginTop: '1rem' }}>
                            <Plus size={16} /> Register Pregnancy <span className="text-marathi" style={{ fontSize: '0.75rem', marginLeft: '4px' }}>(गर्भधारणा नोंदणी)</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ── Pregnancy Registration Form ── */}
            {showRegisterForm && (
                <div className="card">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <Heart size={18} /> Register Pregnancy
                        <span className="text-marathi text-muted" style={{ fontSize: '0.75rem' }}>(गर्भधारणा नोंदणी)</span>
                    </h3>
                    <form onSubmit={handleRegisterPregnancy}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">
                                    LMP Date <span className="label-marathi">शेवटची पाळी</span>
                                </label>
                                <input type="date" className="form-input" required value={regForm.lmpDate}
                                    onChange={e => setRegForm({ ...regForm, lmpDate: e.target.value })} />
                                {regForm.lmpDate && (
                                    <div className="form-hint" style={{ color: 'var(--accent-indigo)', fontWeight: 600, marginTop: '4px' }}>
                                        EDD: {computeEDD(regForm.lmpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </div>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Blood Group <span className="label-marathi">रक्तगट</span></label>
                                <select className="form-input" value={regForm.bloodGroup}
                                    onChange={e => setRegForm({ ...regForm, bloodGroup: e.target.value })}>
                                    <option value="">Select...</option>
                                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => (
                                        <option key={g} value={g}>{g}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Gravida <span className="label-marathi">गर्भधारणा क्र.</span></label>
                                <input type="number" className="form-input" min="1" max="15" value={regForm.gravida}
                                    onChange={e => setRegForm({ ...regForm, gravida: e.target.value })} />
                                <div className="form-hint">Total pregnancies including current</div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Para <span className="label-marathi">प्रसूती क्र.</span></label>
                                <input type="number" className="form-input" min="0" max="15" value={regForm.para}
                                    onChange={e => setRegForm({ ...regForm, para: e.target.value })} />
                                <div className="form-hint">Previous deliveries</div>
                            </div>
                        </div>

                        {/* High Risk Factors */}
                        <div className="form-group">
                            <label className="form-label">
                                <Shield size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                High-Risk Factors <span className="label-marathi">उच्च-जोखीम</span>
                            </label>
                            <div className="maternity-risk-grid">
                                {HIGH_RISK_FACTORS.map(f => (
                                    <button key={f.key} type="button"
                                        className={`maternity-risk-btn ${regForm.highRiskFactors.includes(f.key) ? 'selected' : ''}`}
                                        onClick={() => toggleRiskFactor(f.key)}>
                                        <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>{f.label}</div>
                                        <div className="text-marathi" style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{f.labelMr}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                            <button type="submit" className="btn btn-primary" disabled={submitting}>
                                {submitting ? 'Registering...' : 'Register Pregnancy'}
                            </button>
                            <button type="button" className="btn btn-secondary" onClick={() => setShowRegisterForm(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* ══════ ACTIVE MATERNITY RECORD ══════ */}
            {maternityRecord && (
                <>
                    {/* Status Banner */}
                    <div className={`maternity-status-banner ${maternityRecord.status}`}>
                        <div className="maternity-status-left">
                            <div className="maternity-status-icon">
                                {maternityRecord.status === 'antenatal' ? <Heart size={24} /> : <Baby size={24} />}
                            </div>
                            <div>
                                <div className="maternity-status-label">
                                    {maternityRecord.status === 'antenatal' ? 'Pre-Natal (ANC)' : 'Post-Natal (PNC)'}
                                    <span className="text-marathi" style={{ fontSize: '0.7rem', marginLeft: '6px' }}>
                                        {maternityRecord.status === 'antenatal' ? '(प्रसवपूर्व)' : '(प्रसवोत्तर)'}
                                    </span>
                                </div>
                                {maternityRecord.status === 'antenatal' && helpers.ga && (
                                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                                        {helpers.ga.weeks}w {helpers.ga.days}d • Trimester {helpers.trimester}
                                        {helpers.daysLeft > 0 && ` • ${helpers.daysLeft} days to EDD`}
                                    </div>
                                )}
                                {maternityRecord.status === 'postnatal' && maternityRecord.deliveryOutcome && (
                                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                                        Delivered: {new Date(maternityRecord.deliveryOutcome.date).toLocaleDateString('en-IN')}
                                        {maternityRecord.deliveryOutcome.babyGender && ` • Baby: ${maternityRecord.deliveryOutcome.babyGender}`}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="maternity-status-right">
                            {maternityRecord.status === 'antenatal' && helpers.eddDate && (
                                <div className="maternity-edd-pill">
                                    <Calendar size={13} />
                                    EDD: {helpers.eddDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* High Risk Badges */}
                    {maternityRecord.highRiskFactors?.length > 0 && (
                        <div className="maternity-risk-badges">
                            <Shield size={14} color="var(--alert-red)" />
                            {maternityRecord.highRiskFactors.map(k => {
                                const f = HIGH_RISK_FACTORS.find(h => h.key === k);
                                return (
                                    <span key={k} className="badge badge-red" style={{ fontSize: '0.72rem' }}>
                                        {f?.label || k}
                                    </span>
                                );
                            })}
                        </div>
                    )}

                    {/* Quick Info Row */}
                    <div className="maternity-info-row">
                        <div className="maternity-info-item">
                            <span className="text-muted">Blood Group</span>
                            <span style={{ fontWeight: 600 }}>{maternityRecord.bloodGroup || '—'}</span>
                        </div>
                        <div className="maternity-info-item">
                            <span className="text-muted">Gravida/Para</span>
                            <span style={{ fontWeight: 600 }}>G{maternityRecord.gravida} P{maternityRecord.para}</span>
                        </div>
                        <div className="maternity-info-item">
                            <span className="text-muted">ANC Visits</span>
                            <span style={{ fontWeight: 600 }}>{maternityRecord.ancVisits?.length || 0}/4</span>
                        </div>
                        {maternityRecord.status === 'postnatal' && (
                            <div className="maternity-info-item">
                                <span className="text-muted">PNC Visits</span>
                                <span style={{ fontWeight: 600 }}>{maternityRecord.pncVisits?.length || 0}/4</span>
                            </div>
                        )}
                    </div>

                    {/* Tab Switcher */}
                    <div className="maternity-tabs">
                        <button className={`maternity-tab ${activeTab === 'anc' ? 'active' : ''}`}
                            onClick={() => setActiveTab('anc')}>
                            <Heart size={15} /> ANC
                            <span className="maternity-tab-count">{maternityRecord.ancVisits?.length || 0}</span>
                        </button>
                        {maternityRecord.status === 'postnatal' && (
                            <button className={`maternity-tab ${activeTab === 'pnc' ? 'active' : ''}`}
                                onClick={() => setActiveTab('pnc')}>
                                <Baby size={15} /> PNC
                                <span className="maternity-tab-count">{maternityRecord.pncVisits?.length || 0}</span>
                            </button>
                        )}
                    </div>

                    {/* ════ ANC TAB ════ */}
                    {activeTab === 'anc' && (
                        <div className="stagger-children">
                            {/* ANC Timeline */}
                            <div className="card" style={{ marginBottom: '1rem' }}>
                                <h3 className="card-title" style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Activity size={16} /> ANC Progress Timeline
                                </h3>
                                <div className="anc-timeline">
                                    {ANC_SCHEDULE.map(s => {
                                        const done = maternityRecord.ancVisits?.find(v => v.visitNumber === s.number);
                                        return (
                                            <div key={s.number} className={`anc-timeline-step ${done ? 'completed' : ''}`}>
                                                <div className="anc-timeline-dot">
                                                    {done ? <CheckCircle2 size={16} /> : <div className="anc-dot-empty" />}
                                                </div>
                                                <div className="anc-timeline-content">
                                                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{s.label}</div>
                                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>{s.timing}</div>
                                                    {done && (
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--green)', marginTop: '2px' }}>
                                                            ✓ {new Date(done.date).toLocaleDateString('en-IN')}
                                                            {done.weight && ` • ${done.weight}kg`}
                                                            {done.bp && ` • BP: ${done.bp}`}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {maternityRecord.status === 'antenatal' && (
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                        <button className="btn btn-primary" onClick={() => {
                                            const nextVisit = (maternityRecord.ancVisits?.length || 0) + 1;
                                            setANCForm(f => ({ ...f, visitNumber: Math.min(nextVisit, 4) }));
                                            setShowANCForm(true);
                                        }}>
                                            <Plus size={14} /> Add ANC Visit
                                        </button>
                                        <button className="btn btn-secondary" onClick={() => setShowDeliveryForm(true)}
                                            style={{ borderColor: 'var(--accent-saffron)', color: 'var(--accent-saffron)' }}>
                                            <Baby size={14} /> Record Delivery
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* ANC Visit History */}
                            {maternityRecord.ancVisits?.length > 0 && (
                                <div className="card">
                                    <h3 className="card-title" style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FileText size={16} /> ANC Visit Details
                                    </h3>
                                    {[...maternityRecord.ancVisits].reverse().map((v, i) => (
                                        <div key={i} className="maternity-visit-card">
                                            <div className="maternity-visit-header">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span className="badge badge-green">ANC {v.visitNumber}</span>
                                                    {v.riskLevel && (
                                                        <span className={`badge ${v.riskLevel === 'HIGH' ? 'badge-red' : v.riskLevel === 'MODERATE' ? 'badge-yellow' : 'badge-green'}`}
                                                            style={{ fontSize: '0.65rem' }}>
                                                            {v.riskLevel === 'HIGH' ? '🚨' : v.riskLevel === 'MODERATE' ? '🟡' : '🟢'} {v.riskLevel}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                    {new Date(v.date).toLocaleDateString('en-IN')} • Week {v.gestationalWeeks}
                                                </span>
                                            </div>
                                            <div className="maternity-visit-grid">
                                                {v.weight && <div><span className="text-muted">Weight</span><span>{v.weight} kg</span></div>}
                                                {v.bp && <div><span className="text-muted">BP</span><span>{v.bp}</span></div>}
                                                {v.vitals?.pulse && <div><span className="text-muted">Pulse</span><span>{v.vitals.pulse} bpm</span></div>}
                                                {v.vitals?.respiratoryRate && <div><span className="text-muted">RR</span><span>{v.vitals.respiratoryRate}/min</span></div>}
                                                {v.vitals?.temperature && <div><span className="text-muted">Temp</span><span>{v.vitals.temperature}°C</span></div>}
                                                {v.vitals?.spo2 && <div><span className="text-muted">SpO₂</span><span>{v.vitals.spo2}%</span></div>}
                                                {v.hemoglobin && <div><span className="text-muted">Hb</span><span>{v.hemoglobin} g/dL</span></div>}
                                                {v.urineTest && <div><span className="text-muted">Urine</span><span>{v.urineTest}</span></div>}
                                                {v.fundalHeight && <div><span className="text-muted">Fundal Ht</span><span>{v.fundalHeight} cm</span></div>}
                                                {v.fetalHeartRate && <div><span className="text-muted">FHR</span><span>{v.fetalHeartRate} bpm</span></div>}
                                                {v.ttDose && <div><span className="text-muted">TT</span><span style={{ color: 'var(--green)' }}>✓ Given</span></div>}
                                                {v.ifaTablets && <div><span className="text-muted">IFA</span><span style={{ color: 'var(--green)' }}>✓ Given</span></div>}
                                            </div>
                                            {v.dangerSigns?.length > 0 && (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                    <AlertCircle size={12} color="var(--alert-red)" />
                                                    {v.dangerSigns.map((ds, idx) => {
                                                        const sign = MATERNAL_DANGER_SIGNS.find(s => s.key === ds);
                                                        return <span key={idx} className="badge badge-red" style={{ fontSize: '0.65rem' }}>{sign?.label || ds}</span>;
                                                    })}
                                                </div>
                                            )}
                                            {v.riskReasons?.length > 0 && (
                                                <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', paddingLeft: '0.5rem', borderLeft: `2px solid ${v.riskLevel === 'HIGH' ? 'var(--alert-red)' : 'var(--accent-saffron)'}` }}>
                                                    {v.riskReasons.map((r, idx) => <div key={idx}>• {r}</div>)}
                                                </div>
                                            )}
                                            {v.notes && <div className="maternity-visit-notes">{v.notes}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* ════ PNC TAB ════ */}
                    {activeTab === 'pnc' && maternityRecord.status === 'postnatal' && (
                        <div className="stagger-children">
                            {/* Delivery Summary */}
                            {maternityRecord.deliveryOutcome && (
                                <div className="card" style={{ marginBottom: '1rem', borderLeft: '3px solid var(--accent-saffron)' }}>
                                    <h3 className="card-title" style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Baby size={16} /> Delivery Summary
                                    </h3>
                                    <div className="maternity-visit-grid">
                                        <div><span className="text-muted">Date</span><span>{new Date(maternityRecord.deliveryOutcome.date).toLocaleDateString('en-IN')}</span></div>
                                        <div><span className="text-muted">Type</span><span>{maternityRecord.deliveryOutcome.type}</span></div>
                                        <div><span className="text-muted">Place</span><span>{maternityRecord.deliveryOutcome.place}</span></div>
                                        {maternityRecord.deliveryOutcome.babyWeight && <div><span className="text-muted">Baby Weight</span><span>{maternityRecord.deliveryOutcome.babyWeight} kg</span></div>}
                                        {maternityRecord.deliveryOutcome.babyGender && <div><span className="text-muted">Baby Gender</span><span>{maternityRecord.deliveryOutcome.babyGender}</span></div>}
                                        {maternityRecord.deliveryOutcome.apgarScore && <div><span className="text-muted">APGAR</span><span>{maternityRecord.deliveryOutcome.apgarScore}</span></div>}
                                    </div>
                                    {maternityRecord.deliveryOutcome.complications && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--alert-red)' }}>
                                            Complications: {maternityRecord.deliveryOutcome.complications}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* PNC Timeline */}
                            <div className="card" style={{ marginBottom: '1rem' }}>
                                <h3 className="card-title" style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Stethoscope size={16} /> PNC Schedule
                                </h3>
                                <div className="anc-timeline">
                                    {PNC_SCHEDULE.map(s => {
                                        const done = maternityRecord.pncVisits?.find(v => v.visitType === s.key);
                                        return (
                                            <div key={s.key} className={`anc-timeline-step ${done ? 'completed' : ''}`}>
                                                <div className="anc-timeline-dot">
                                                    {done ? <CheckCircle2 size={16} /> : <div className="anc-dot-empty" />}
                                                </div>
                                                <div className="anc-timeline-content">
                                                    <div style={{ fontWeight: 600, fontSize: '0.8rem' }}>{s.label}</div>
                                                    <div className="text-marathi text-muted" style={{ fontSize: '0.68rem' }}>{s.labelMr}</div>
                                                    {done && (
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--green)', marginTop: '2px' }}>
                                                            ✓ {new Date(done.date).toLocaleDateString('en-IN')}
                                                            {done.breastfeeding && ` • BF: ${done.breastfeeding}`}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <button className="btn btn-primary" onClick={() => setShowPNCForm(true)} style={{ marginTop: '1rem' }}>
                                    <Plus size={14} /> Add PNC Visit
                                </button>
                            </div>

                            {/* PNC Visit History */}
                            {maternityRecord.pncVisits?.length > 0 && (
                                <div className="card">
                                    <h3 className="card-title" style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <FileText size={16} /> PNC Visit Details
                                    </h3>
                                    {[...maternityRecord.pncVisits].reverse().map((v, i) => (
                                        <div key={i} className="maternity-visit-card">
                                            <div className="maternity-visit-header">
                                                <span className="badge badge-indigo">{v.visitType}</span>
                                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                    {new Date(v.date).toLocaleDateString('en-IN')}
                                                </span>
                                            </div>
                                            <div className="maternity-visit-grid">
                                                {v.motherTemp && <div><span className="text-muted">Mom Temp</span><span>{v.motherTemp}°C</span></div>}
                                                {v.motherBP && <div><span className="text-muted">Mom BP</span><span>{v.motherBP}</span></div>}
                                                {v.breastfeeding && <div><span className="text-muted">Breastfeeding</span><span>{v.breastfeeding}</span></div>}
                                                {v.woundHealing && <div><span className="text-muted">Wound</span><span>{v.woundHealing}</span></div>}
                                                {v.babyWeight && <div><span className="text-muted">Baby Wt</span><span>{v.babyWeight} kg</span></div>}
                                                {v.babyTemp && <div><span className="text-muted">Baby Temp</span><span>{v.babyTemp}°C</span></div>}
                                            </div>
                                            {v.immunizations?.length > 0 && (
                                                <div style={{ marginTop: '0.5rem', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                                    <Syringe size={12} color="var(--accent-indigo)" />
                                                    {v.immunizations.map((im, idx) => (
                                                        <span key={idx} className="badge badge-green" style={{ fontSize: '0.68rem' }}>{im}</span>
                                                    ))}
                                                </div>
                                            )}
                                            {v.notes && <div className="maternity-visit-notes">{v.notes}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ══════ ANC FORM MODAL ══════ */}
            {showANCForm && (
                <div className="modal-overlay" onClick={() => setShowANCForm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '720px', maxHeight: '90vh', overflow: 'auto' }}>
                        <div className="modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Stethoscope size={18} /> ANC Visit #{ancForm.visitNumber}
                            </h3>
                            <button className="btn btn-ghost" onClick={() => setShowANCForm(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAddANC}>

                            {/* ──── SECTION A: Core Measurable Vitals ──── */}
                            <div className="ds-section-header">
                                <Stethoscope size={15} /> A. Maternal Vitals <span className="text-marathi text-muted" style={{ fontSize: '0.72rem' }}>(महत्त्वपूर्ण चिन्हे)</span>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">BP Systolic (mmHg) <span className="label-marathi">रक्तदाब</span></label>
                                    <input type="number" className="form-input" value={ancForm.bpSystolic}
                                        onChange={e => setANCForm({ ...ancForm, bpSystolic: e.target.value })} placeholder="e.g. 120"
                                        style={Number(ancForm.bpSystolic) >= 140 ? { borderColor: 'var(--alert-red)', background: 'rgba(220,38,38,0.04)' } : {}} />
                                    {Number(ancForm.bpSystolic) >= 140 && <div className="form-hint" style={{ color: 'var(--alert-red)' }}>⚠ High (≥140)</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">BP Diastolic (mmHg)</label>
                                    <input type="number" className="form-input" value={ancForm.bpDiastolic}
                                        onChange={e => setANCForm({ ...ancForm, bpDiastolic: e.target.value })} placeholder="e.g. 80"
                                        style={Number(ancForm.bpDiastolic) >= 90 ? { borderColor: 'var(--alert-red)', background: 'rgba(220,38,38,0.04)' } : {}} />
                                    {Number(ancForm.bpDiastolic) >= 90 && <div className="form-hint" style={{ color: 'var(--alert-red)' }}>⚠ High (≥90)</div>}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Pulse Rate (bpm) <span className="label-marathi">नाडी</span></label>
                                    <input type="number" className="form-input" value={ancForm.pulse}
                                        onChange={e => setANCForm({ ...ancForm, pulse: e.target.value })} placeholder="e.g. 80"
                                        style={Number(ancForm.pulse) > 120 ? { borderColor: 'var(--alert-red)', background: 'rgba(220,38,38,0.04)' } : {}} />
                                    {Number(ancForm.pulse) > 120 && <div className="form-hint" style={{ color: 'var(--alert-red)' }}>⚠ High (&gt;120)</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Respiratory Rate (/min) <span className="label-marathi">श्वसन दर</span></label>
                                    <input type="number" className="form-input" value={ancForm.respiratoryRate}
                                        onChange={e => setANCForm({ ...ancForm, respiratoryRate: e.target.value })} placeholder="e.g. 18"
                                        style={Number(ancForm.respiratoryRate) > 24 ? { borderColor: 'var(--alert-red)', background: 'rgba(220,38,38,0.04)' } : {}} />
                                    {Number(ancForm.respiratoryRate) > 24 && <div className="form-hint" style={{ color: 'var(--alert-red)' }}>⚠ High (&gt;24)</div>}
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Temperature (°C) <span className="label-marathi">तापमान</span></label>
                                    <input type="number" step="0.1" className="form-input" value={ancForm.temperature}
                                        onChange={e => setANCForm({ ...ancForm, temperature: e.target.value })} placeholder="e.g. 36.6"
                                        style={Number(ancForm.temperature) >= 38 ? { borderColor: 'var(--alert-red)', background: 'rgba(220,38,38,0.04)' } : {}} />
                                    {Number(ancForm.temperature) >= 38 && <div className="form-hint" style={{ color: 'var(--alert-red)' }}>⚠ Fever (≥38°C)</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">SpO₂ (%) <span className="text-muted" style={{ fontSize: '0.68rem' }}>(optional)</span></label>
                                    <input type="number" className="form-input" value={ancForm.spo2}
                                        onChange={e => setANCForm({ ...ancForm, spo2: e.target.value })} placeholder="e.g. 98"
                                        style={Number(ancForm.spo2) > 0 && Number(ancForm.spo2) < 94 ? { borderColor: 'var(--alert-red)', background: 'rgba(220,38,38,0.04)' } : {}} />
                                    {Number(ancForm.spo2) > 0 && Number(ancForm.spo2) < 94 && <div className="form-hint" style={{ color: 'var(--alert-red)' }}>⚠ Low (&lt;94%)</div>}
                                </div>
                            </div>

                            {/* ──── SECTION B: Danger Signs ──── */}
                            <div className="ds-section-header" style={{ color: 'var(--alert-red)' }}>
                                <AlertCircle size={15} /> B. Maternal Danger Signs <span className="text-marathi" style={{ fontSize: '0.72rem' }}>(धोक्याची चिन्हे)</span>
                            </div>
                            <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>If ANY is checked → HIGH Risk → Immediate PHC Escalation</p>
                            <div className="ds-danger-grid">
                                {MATERNAL_DANGER_SIGNS.map(ds => (
                                    <button key={ds.key} type="button"
                                        className={`ds-danger-btn ${ancForm.dangerSigns.includes(ds.key) ? 'selected' : ''}`}
                                        onClick={() => toggleDangerSign(ds.key)}>
                                        <span className="ds-danger-icon">{ds.icon}</span>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.76rem' }}>{ds.label}</div>
                                            <div className="text-marathi" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{ds.labelMr}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* ──── SECTION C: Moderate Risk ──── */}
                            <div className="ds-section-header" style={{ color: 'var(--accent-saffron)', marginTop: '1rem' }}>
                                <Shield size={15} /> C. Moderate Risk Indicators <span className="text-marathi" style={{ fontSize: '0.72rem' }}>(मध्यम जोखीम)</span>
                            </div>
                            <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '0.5rem' }}>Not emergency, but escalate for review</p>
                            <div className="ds-moderate-grid">
                                {MODERATE_RISK_INDICATORS.map(mr => (
                                    <label key={mr.key} className={`ds-moderate-btn ${ancForm.moderateRisks.includes(mr.key) ? 'selected' : ''}`}>
                                        <input type="checkbox" checked={ancForm.moderateRisks.includes(mr.key)} onChange={() => toggleModerateRisk(mr.key)} style={{ display: 'none' }} />
                                        <div className="ds-moderate-check">{ancForm.moderateRisks.includes(mr.key) ? '☑' : '☐'}</div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.76rem' }}>{mr.label}</div>
                                            <div className="text-marathi" style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{mr.labelMr}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            {/* ──── LIVE RISK RESULT ──── */}
                            {(ancForm.bpSystolic || ancForm.pulse || ancForm.temperature || ancForm.dangerSigns.length > 0 || ancForm.moderateRisks.length > 0) && (
                                <div className={`ds-risk-result ${liveRisk.level.toLowerCase()}`} style={{ marginTop: '1rem' }}>
                                    <div className="ds-risk-header">
                                        <span className="ds-risk-badge">
                                            {liveRisk.level === 'HIGH' ? '🚨' : liveRisk.level === 'MODERATE' ? '🟡' : '🟢'}
                                            Risk Level: {liveRisk.level}
                                        </span>
                                        {liveRisk.escalate && (
                                            <span className="badge badge-red" style={{ fontSize: '0.7rem', animation: 'pulse 1.5s infinite' }}>ESCALATE TO PHC</span>
                                        )}
                                    </div>
                                    {liveRisk.reasons.length > 0 && (
                                        <div className="ds-risk-reasons">
                                            {liveRisk.reasons.map((r, i) => <div key={i}>• {r}</div>)}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ──── Original ANC Fields ──── */}
                            <div className="ds-section-header" style={{ marginTop: '1rem' }}>
                                <Activity size={15} /> D. Clinical Measurements <span className="text-marathi text-muted" style={{ fontSize: '0.72rem' }}>(वैद्यकीय मोजमापे)</span>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Weight (kg) <span className="label-marathi">वजन</span></label>
                                    <input type="number" step="0.1" className="form-input" value={ancForm.weight}
                                        onChange={e => setANCForm({ ...ancForm, weight: e.target.value })} placeholder="e.g. 55" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hemoglobin (g/dL) <span className="label-marathi">हिमोग्लोबिन</span></label>
                                    <input type="number" step="0.1" className="form-input" value={ancForm.hemoglobin}
                                        onChange={e => setANCForm({ ...ancForm, hemoglobin: e.target.value })} placeholder="e.g. 11.5" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Urine Test <span className="label-marathi">मूत्र चाचणी</span></label>
                                    <select className="form-input" value={ancForm.urineTest}
                                        onChange={e => setANCForm({ ...ancForm, urineTest: e.target.value })}>
                                        <option value="Normal">Normal</option>
                                        <option value="Protein+">Protein +</option>
                                        <option value="Sugar+">Sugar +</option>
                                        <option value="Both+">Both +</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Fundal Height (cm)</label>
                                    <input type="number" step="0.5" className="form-input" value={ancForm.fundalHeight}
                                        onChange={e => setANCForm({ ...ancForm, fundalHeight: e.target.value })} placeholder="cm" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Fetal Heart Rate (bpm)</label>
                                    <input type="number" className="form-input" value={ancForm.fetalHeartRate}
                                        onChange={e => setANCForm({ ...ancForm, fetalHeartRate: e.target.value })} placeholder="bpm" />
                                </div>
                            </div>
                            <div className="form-row" style={{ alignItems: 'center' }}>
                                <label className="maternity-checkbox">
                                    <input type="checkbox" checked={ancForm.ttDose}
                                        onChange={e => setANCForm({ ...ancForm, ttDose: e.target.checked })} />
                                    <span>TT Injection Given <span className="label-marathi">टीटी दिले</span></span>
                                </label>
                                <label className="maternity-checkbox">
                                    <input type="checkbox" checked={ancForm.ifaTablets}
                                        onChange={e => setANCForm({ ...ancForm, ifaTablets: e.target.checked })} />
                                    <span>IFA Tablets Given <span className="label-marathi">आयएफए दिले</span></span>
                                </label>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-input" rows="2" value={ancForm.notes}
                                    onChange={e => setANCForm({ ...ancForm, notes: e.target.value })} placeholder="Any observations..." />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={submitting}
                                    style={liveRisk.escalate ? { background: 'var(--alert-red)' } : {}}>
                                    {submitting ? 'Saving...' : liveRisk.escalate ? '⚠ Save & Escalate' : 'Save ANC Visit'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowANCForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════ DELIVERY FORM MODAL ══════ */}
            {showDeliveryForm && (
                <div className="modal-overlay" onClick={() => setShowDeliveryForm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Baby size={18} /> Record Delivery Outcome
                            </h3>
                            <button className="btn btn-ghost" onClick={() => setShowDeliveryForm(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleRecordDelivery}>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Delivery Date <span className="label-marathi">प्रसूती तारीख</span></label>
                                    <input type="date" className="form-input" required value={deliveryForm.date}
                                        onChange={e => setDeliveryForm({ ...deliveryForm, date: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type <span className="label-marathi">प्रकार</span></label>
                                    <select className="form-input" value={deliveryForm.type}
                                        onChange={e => setDeliveryForm({ ...deliveryForm, type: e.target.value })}>
                                        <option value="Normal">Normal Delivery</option>
                                        <option value="C-Section">C-Section</option>
                                        <option value="Assisted">Assisted (Forceps/Vacuum)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Place <span className="label-marathi">ठिकाण</span></label>
                                    <select className="form-input" value={deliveryForm.place}
                                        onChange={e => setDeliveryForm({ ...deliveryForm, place: e.target.value })}>
                                        <option value="Hospital">Hospital</option>
                                        <option value="PHC">PHC</option>
                                        <option value="Home">Home</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Baby Gender</label>
                                    <select className="form-input" value={deliveryForm.babyGender}
                                        onChange={e => setDeliveryForm({ ...deliveryForm, babyGender: e.target.value })}>
                                        <option value="">Select...</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Baby Weight (kg)</label>
                                    <input type="number" step="0.01" className="form-input" value={deliveryForm.babyWeight}
                                        onChange={e => setDeliveryForm({ ...deliveryForm, babyWeight: e.target.value })} placeholder="e.g. 2.8" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">APGAR Score (1 min)</label>
                                    <input type="number" min="0" max="10" className="form-input" value={deliveryForm.apgarScore}
                                        onChange={e => setDeliveryForm({ ...deliveryForm, apgarScore: e.target.value })} placeholder="0–10" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Complications (if any)</label>
                                <textarea className="form-input" rows="2" value={deliveryForm.complications}
                                    onChange={e => setDeliveryForm({ ...deliveryForm, complications: e.target.value })} placeholder="e.g. PPH, tear..." />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Recording...' : 'Record Delivery'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDeliveryForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══════ PNC FORM MODAL ══════ */}
            {showPNCForm && (
                <div className="modal-overlay" onClick={() => setShowPNCForm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Stethoscope size={18} /> PNC Visit
                            </h3>
                            <button className="btn btn-ghost" onClick={() => setShowPNCForm(false)}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleAddPNC}>
                            <div className="form-group">
                                <label className="form-label">Visit Type <span className="label-marathi">भेट प्रकार</span></label>
                                <select className="form-input" value={pncForm.visitType}
                                    onChange={e => setPNCForm({ ...pncForm, visitType: e.target.value })}>
                                    {PNC_SCHEDULE.map(s => (
                                        <option key={s.key} value={s.key}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Mother Temp (°C)</label>
                                    <input type="number" step="0.1" className="form-input" value={pncForm.motherTemp}
                                        onChange={e => setPNCForm({ ...pncForm, motherTemp: e.target.value })} placeholder="e.g. 37.0" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mother BP</label>
                                    <input type="text" className="form-input" value={pncForm.motherBP}
                                        onChange={e => setPNCForm({ ...pncForm, motherBP: e.target.value })} placeholder="e.g. 120/80" />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Breastfeeding <span className="label-marathi">स्तनपान</span></label>
                                    <select className="form-input" value={pncForm.breastfeeding}
                                        onChange={e => setPNCForm({ ...pncForm, breastfeeding: e.target.value })}>
                                        <option value="Exclusive">Exclusive</option>
                                        <option value="Mixed">Mixed</option>
                                        <option value="None">None</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Wound Healing</label>
                                    <select className="form-input" value={pncForm.woundHealing}
                                        onChange={e => setPNCForm({ ...pncForm, woundHealing: e.target.value })}>
                                        <option value="Good">Good</option>
                                        <option value="Infected">Infected</option>
                                        <option value="N/A">N/A</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Baby Weight (kg)</label>
                                    <input type="number" step="0.01" className="form-input" value={pncForm.babyWeight}
                                        onChange={e => setPNCForm({ ...pncForm, babyWeight: e.target.value })} placeholder="kg" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Baby Temp (°C)</label>
                                    <input type="number" step="0.1" className="form-input" value={pncForm.babyTemp}
                                        onChange={e => setPNCForm({ ...pncForm, babyTemp: e.target.value })} placeholder="°C" />
                                </div>
                            </div>

                            {/* Immunizations */}
                            <div className="form-group">
                                <label className="form-label">
                                    <Syringe size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                                    Baby Immunizations <span className="label-marathi">लसीकरण</span>
                                </label>
                                <div className="maternity-risk-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                                    {BABY_IMMUNIZATIONS.map(im => (
                                        <button key={im.key} type="button"
                                            className={`maternity-risk-btn ${pncForm.immunizations.includes(im.key) ? 'selected' : ''}`}
                                            onClick={() => toggleImmunization(im.key)}
                                            style={{ padding: '0.5rem' }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>{im.label}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{im.when}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Notes</label>
                                <textarea className="form-input" rows="2" value={pncForm.notes}
                                    onChange={e => setPNCForm({ ...pncForm, notes: e.target.value })} placeholder="Any observations..." />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Saving...' : 'Save PNC Visit'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowPNCForm(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
