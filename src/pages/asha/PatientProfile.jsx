// ============================================================
// Patient Profile — View patient details + visit history
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getPatientById, updatePatient } from '../../services/patientService';
import { getVisitsByPatient } from '../../services/visitService';
import { getActiveMaternityRecord, getGestationalAge, daysUntilEDD } from '../../services/maternityService';
import { getVaccinations, getVaccineStatus, getDaysOverdue } from '../../services/vaccinationService';
import { Plus, ClipboardList, Flag, MessageSquare, XCircle, ArrowLeft, Baby, Heart, Syringe, ChevronRight, ShieldCheck, ShieldOff, FileText, Activity, AlertTriangle, Pencil, Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PatientProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [patient, setPatient] = useState(null);
    const [visits, setVisits] = useState([]);
    const [maternityRec, setMaternityRec] = useState(null);
    const [vaccinations, setVaccinations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);

    // Edit mode state
    const [editing, setEditing] = useState(false);
    const [editData, setEditData] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [p, v] = await Promise.all([
                getPatientById(id),
                getVisitsByPatient(id),
            ]);
            // Ownership guard — ASHA can only view their own patients
            if (p && user && p.createdBy !== user.uid) {
                setUnauthorized(true);
                setLoading(false);
                return;
            }
            setPatient(p);
            setVisits(v);
            // Load maternity record for female patients
            if (p && p.gender === 'Female') {
                try {
                    const mr = await getActiveMaternityRecord(id);
                    setMaternityRec(mr);
                } catch (e) { /* no maternity record */ }
            }
            // Load vaccination records
            try {
                const vaxList = await getVaccinations(id);
                setVaccinations(vaxList);
            } catch (e) { /* no vaccinations */ }
        } catch (err) {
            console.error('Error loading patient:', err);
        } finally {
            setLoading(false);
        }
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

    const startEditing = () => {
        setEditData({
            name: patient.name || '',
            age: patient.age || '',
            gender: patient.gender || '',
            houseNumber: patient.houseNumber || '',
            village: patient.village || '',
            contact: patient.contact || '',
            abhaId: patient.abhaId || '',
        });
        setEditing(true);
    };

    const cancelEditing = () => {
        setEditing(false);
        setEditData({});
    };

    const handleEditChange = (field, value) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!editData.name || !editData.age || !editData.gender || !editData.village || !editData.houseNumber) {
            alert(t('patientProfile.fillRequired'));
            return;
        }
        setSaving(true);
        try {
            await updatePatient(id, editData);
            const updated = await getPatientById(id);
            setPatient(updated);
            setEditing(false);
        } catch (err) {
            console.error('Error updating patient:', err);
            alert(t('patientProfile.updateFailed'));
        } finally {
            setSaving(false);
        }
    };

    const getRiskClass = (level) => {
        if (level === 'Red') return 'red';
        if (level === 'Yellow') return 'yellow';
        return 'green';
    };

    if (loading) {
        return (
            <div className="loading-spinner">
                <div>
                    <div className="spinner"></div>
                    <div className="loading-text">{t('patientProfile.loadingProfile')}</div>
                </div>
            </div>
        );
    }

    if (unauthorized) {
        return (
            <div className="card">
                <div className="empty-state">
                    <div className="empty-icon"><XCircle size={48} strokeWidth={1} /></div>
                    <p>{t('patientProfile.unauthorized', 'You do not have access to this patient.')}</p>
                    <button className="btn btn-secondary" onClick={() => navigate('/search')} style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowLeft size={16} /> {t('patientProfile.backToSearch')}
                    </button>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="card">
                <div className="empty-state">
                    <div className="empty-icon"><XCircle size={48} strokeWidth={1} /></div>
                    <p>{t('patientProfile.patientNotFound')}</p>
                    <button className="btn btn-secondary" onClick={() => navigate('/search')} style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowLeft size={16} /> {t('patientProfile.backToSearch')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Patient Details Card */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <div className="card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="patient-avatar" style={{ width: '56px', height: '56px', fontSize: '1.5rem' }}>
                            {patient.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2px' }}>
                                {patient.name}
                                {/* ABHA Linked Badge */}
                                {patient.abhaLinked || patient.abhaId ? (
                                    <span className="badge badge-green" style={{ fontSize: '0.6rem', marginLeft: '8px', verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                        <ShieldCheck size={10} /> {t('patient.abhaLinked')}
                                    </span>
                                ) : (
                                    <span className="badge" style={{ fontSize: '0.6rem', marginLeft: '8px', verticalAlign: 'middle', display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(100,100,100,0.08)', color: 'var(--text-muted)' }}>
                                        <ShieldOff size={10} /> {t('patient.abhaNotLinked')}
                                    </span>
                                )}
                            </h2>
                            <div className="text-muted">
                                {patient.patientId} • {t('patientProfile.registered')} {formatTime(patient.createdAt)}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {!editing && (
                            <button className="btn btn-secondary" onClick={startEditing}
                                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Pencil size={16} /> {t('patientProfile.edit')}
                            </button>
                        )}
                        {editing && (
                            <>
                                <button className="btn btn-primary" onClick={handleSave} disabled={saving}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Save size={16} /> {saving ? t('patientProfile.saving') : t('patientProfile.save')}
                                </button>
                                <button className="btn btn-secondary" onClick={cancelEditing}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <X size={16} /> {t('patientProfile.cancel')}
                                </button>
                            </>
                        )}
                        {patient.gender === 'Female' && (
                            <button className="btn btn-secondary" onClick={() => navigate('/maternity')}
                                style={{ borderColor: 'var(--accent-saffron)', color: 'var(--accent-saffron)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Baby size={16} /> {t('patientProfile.maternity')}
                            </button>
                        )}
                        <button className="btn btn-primary" onClick={() => navigate(`/patient/${id}/visit`)}>
                            <Plus size={16} /> {t('patientProfile.newVisit')}
                        </button>
                    </div>
                </div>

                <div className="warli-divider" style={{ margin: '1rem 0' }}></div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    {editing ? (
                        <>
                            <div>
                                <label className="form-label">{t('register.fullName')} *</label>
                                <input className="input" value={editData.name} onChange={e => handleEditChange('name', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">{t('register.age')} *</label>
                                <input className="input" type="number" value={editData.age} onChange={e => handleEditChange('age', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">{t('register.gender')} *</label>
                                <select className="input" value={editData.gender} onChange={e => handleEditChange('gender', e.target.value)}>
                                    <option value="Male">{t('register.male')}</option>
                                    <option value="Female">{t('register.female')}</option>
                                    <option value="Other">{t('register.other')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="form-label">{t('register.village')} *</label>
                                <input className="input" value={editData.village} onChange={e => handleEditChange('village', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">{t('register.houseNumber')} *</label>
                                <input className="input" value={editData.houseNumber} onChange={e => handleEditChange('houseNumber', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">{t('register.contact')}</label>
                                <input className="input" value={editData.contact} onChange={e => handleEditChange('contact', e.target.value)} />
                            </div>
                            <div>
                                <label className="form-label">{t('register.abhaId')}</label>
                                <input className="input" value={editData.abhaId} onChange={e => handleEditChange('abhaId', e.target.value)} />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <div className="text-muted" style={{ marginBottom: '2px' }}>{t('patientProfile.ageGender')}</div>
                                <div style={{ fontWeight: 500 }}>{patient.age} {t('patientProfile.yrs')} • {patient.gender}</div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ marginBottom: '2px' }}>{t('patientProfile.village')}</div>
                                <div style={{ fontWeight: 500 }}>{patient.village}</div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ marginBottom: '2px' }}>{t('patientProfile.houseNo')}</div>
                                <div style={{ fontWeight: 500 }}>{patient.houseNumber}</div>
                            </div>
                            <div>
                                <div className="text-muted" style={{ marginBottom: '2px' }}>{t('patientProfile.familyId')}</div>
                                <div style={{ fontWeight: 500 }}>{patient.familyId}</div>
                            </div>
                            {patient.abhaId && (
                                <div>
                                    <div className="text-muted" style={{ marginBottom: '2px' }}>{t('patientProfile.abhaId')}</div>
                                    <div style={{ fontWeight: 500 }}>{patient.abhaId}</div>
                                </div>
                            )}
                            {patient.contact && (
                                <div>
                                    <div className="text-muted" style={{ marginBottom: '2px' }}>{t('patientProfile.contact')}</div>
                                    <div style={{ fontWeight: 500 }}>{patient.contact}</div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Maternity Badge */}
                {maternityRec && (
                    <div className="maternity-profile-badge" onClick={() => navigate('/maternity')} style={{ cursor: 'pointer', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {maternityRec.status === 'antenatal' ? <Heart size={16} color="var(--alert-red)" /> : <Baby size={16} color="var(--accent-saffron)" />}
                            <span style={{ fontWeight: 600 }}>
                                {maternityRec.status === 'antenatal' ? t('patientProfile.pregnantANC') : t('patientProfile.postNatalPNC')}
                            </span>
                        </div>
                        {maternityRec.status === 'antenatal' && maternityRec.lmpDate && (() => {
                            const lmp = maternityRec.lmpDate?.toDate?.() ? maternityRec.lmpDate.toDate() : new Date(maternityRec.lmpDate);
                            const ga = getGestationalAge(lmp);
                            const edd = maternityRec.eddDate?.toDate?.() ? maternityRec.eddDate.toDate() : new Date(maternityRec.eddDate);
                            const days = daysUntilEDD(edd);
                            return (
                                <span className="text-muted" style={{ fontSize: '0.78rem' }}>
                                    {ga.weeks}w {ga.days}d • {days > 0 ? t('patientProfile.daysToEDD', { days }) : t('patientProfile.eddPassed')}
                                </span>
                            );
                        })()}
                    </div>
                )}
            </div>

            {/* Vaccination Overview */}
            {vaccinations.length > 0 && (() => {
                const pendingVax = vaccinations
                    .map(v => ({ ...v, computedStatus: getVaccineStatus(v.scheduledDate, v.givenDate) }))
                    .filter(v => v.computedStatus !== 'completed' && v.computedStatus !== 'upcoming');
                return pendingVax.length > 0 ? (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-header">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Syringe size={18} /> {t('maternity.vaccinationOverview')}
                            </h3>
                            <button className="btn btn-secondary" style={{ fontSize: '0.75rem' }}
                                onClick={() => navigate('/vaccinations')}>
                                {t('dashboard.viewAll')} <ChevronRight size={14} />
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {pendingVax.slice(0, 6).map(vax => {
                                const isOverdue = vax.computedStatus === 'overdue';
                                const days = getDaysOverdue(vax.scheduledDate);
                                return (
                                    <span key={vax.id} className={`badge ${isOverdue ? 'badge-red' : 'badge-yellow'}`}
                                        style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        💉 {vax.vaccineName} D{vax.doseNumber}
                                        {isOverdue ? ` (${days}d overdue)` : ' (due)'}
                                    </span>
                                );
                            })}
                            {pendingVax.length > 6 && (
                                <span className="badge" style={{ fontSize: '0.68rem', background: 'rgba(100,100,100,0.06)' }}>
                                    +{pendingVax.length - 6} more
                                </span>
                            )}
                        </div>
                    </div>
                ) : null;
            })()}

            {/* Digital Health Record Summary — shown only when ABHA linked */}
            {(patient.abhaLinked || patient.abhaId) && (() => {
                const totalVisits = visits.length;
                const escalations = visits.filter(v => v.status === 'Pending PHC Review' || v.status === 'Reviewed' || v.status === 'Referral Approved' || v.emergencyFlag);
                const redEsc = visits.filter(v => v.riskLevel === 'Red').length;
                const yellowEsc = visits.filter(v => v.riskLevel === 'Yellow').length;
                const reviewed = visits.filter(v => v.status === 'Reviewed' || v.status === 'Referral Approved').length;
                const pending = visits.filter(v => v.status === 'Pending PHC Review').length;
                const latest = visits.length > 0 ? visits[0] : null;
                const monitoringStatus = !latest ? 'No visits' :
                    latest.riskLevel === 'Red' ? 'Active – High Risk' :
                        latest.riskLevel === 'Yellow' ? 'Active – Moderate Risk' :
                            latest.status === 'Reviewed' ? 'Resolved' : 'Routine Monitoring';
                const monitorColor = !latest ? 'var(--text-muted)' :
                    latest.riskLevel === 'Red' ? '#DC2626' :
                        latest.riskLevel === 'Yellow' ? '#D97706' :
                            latest.status === 'Reviewed' ? '#16A34A' : '#6366F1';

                return (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-header">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={18} /> {t('dhr.title')}
                            </h3>
                            <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>ABHA: {patient.abhaId}</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                            {/* Past Visit Count */}
                            <div className="dhr-stat">
                                <div className="dhr-stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                                    <ClipboardList size={18} />
                                </div>
                                <div>
                                    <div className="dhr-stat-value">{totalVisits}</div>
                                    <div className="dhr-stat-label">{t('dhr.pastVisits')}</div>
                                </div>
                            </div>
                            {/* Escalation History */}
                            <div className="dhr-stat">
                                <div className="dhr-stat-icon" style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                                    <AlertTriangle size={18} />
                                </div>
                                <div>
                                    <div className="dhr-stat-value">{escalations.length}</div>
                                    <div className="dhr-stat-label">{t('dhr.escalations')}</div>
                                    {(redEsc > 0 || yellowEsc > 0) && (
                                        <div style={{ display: 'flex', gap: '0.2rem', marginTop: '2px' }}>
                                            {redEsc > 0 && <span className="badge badge-red" style={{ fontSize: '0.55rem' }}>{redEsc} Red</span>}
                                            {yellowEsc > 0 && <span className="badge badge-yellow" style={{ fontSize: '0.55rem' }}>{yellowEsc} Yellow</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {/* PHC Decision */}
                            <div className="dhr-stat">
                                <div className="dhr-stat-icon" style={{ background: 'rgba(34,197,94,0.1)', color: '#16A34A' }}>
                                    <ShieldCheck size={18} />
                                </div>
                                <div>
                                    <div className="dhr-stat-value">{reviewed}</div>
                                    <div className="dhr-stat-label">{t('dhr.phcReviewed')}</div>
                                    {pending > 0 && <span className="badge badge-yellow" style={{ fontSize: '0.55rem', marginTop: '2px' }}>{pending} pending</span>}
                                </div>
                            </div>
                            {/* Monitoring Status */}
                            <div className="dhr-stat">
                                <div className="dhr-stat-icon" style={{ background: 'rgba(255,136,0,0.1)', color: '#FF8800' }}>
                                    <Activity size={18} />
                                </div>
                                <div>
                                    <div className="dhr-stat-value" style={{ fontSize: '0.85rem', color: monitorColor }}>{monitoringStatus}</div>
                                    <div className="dhr-stat-label">{t('dhr.currentStatus')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Visit History */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        {t('visit.visitHistory')}
                    </h3>
                    <span className="badge badge-indigo">{visits.length} {t('visit.visits')}</span>
                </div>

                {visits.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><ClipboardList size={48} strokeWidth={1} /></div>
                        <p>{t('patientProfile.noVisitsYet')}</p>
                        <button className="btn btn-primary" onClick={() => navigate(`/patient/${id}/visit`)} style={{ marginTop: '1rem' }}>
                            <Plus size={16} /> {t('patientProfile.createFirstVisit')}
                        </button>
                    </div>
                ) : (
                    <div className="cards-grid stagger-children">
                        {visits.map((visit) => (
                            <div
                                key={visit.id}
                                className="card"
                                style={{ padding: '1rem 1.25rem', background: 'var(--bg-primary)' }}
                            >
                                <div className="visit-card">
                                    <div className="visit-card-left">
                                        <div className={`visit-risk-dot ${getRiskClass(visit.riskLevel)}`}></div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                {visit.chiefComplaint || t('dashboard.noComplaintRecorded')}
                                            </div>
                                            <div className="text-muted" style={{ marginTop: '4px' }}>
                                                {formatTime(visit.createdAt)}
                                                {visit.symptomDuration && ` • ${t('patientProfile.duration')} ${visit.symptomDuration} ${t('patientProfile.days')}`}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {visit.news2Score != null && (
                                            <span className={`badge badge-${getRiskClass(visit.riskLevel)}`}>
                                                NEWS2: {visit.news2Score}
                                            </span>
                                        )}
                                        <span className={`status-badge ${visit.status === 'Pending PHC Review' ? 'pending' :
                                            visit.status === 'Reviewed' || visit.status === 'Referral Approved' ? 'reviewed' :
                                                visit.emergencyFlag ? 'emergency' : ''
                                            }`}>
                                            {visit.status}
                                        </span>
                                    </div>
                                </div>

                                {/* NEWS2 Breakdown */}
                                {visit.news2Breakdown && visit.news2Breakdown.length > 0 && (
                                    <div style={{ marginTop: '0.75rem', paddingLeft: '1.5rem' }}>
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
                                    </div>
                                )}

                                {/* Red Flags */}
                                {visit.redFlags && visit.redFlags.length > 0 && (
                                    <div style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            {visit.redFlags.map((flag, idx) => (
                                                <span key={idx} className="badge badge-red" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                                    <Flag size={10} /> {flag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Doctor Note */}
                                {visit.doctorNote && (
                                    <div style={{
                                        marginTop: '0.75rem',
                                        paddingLeft: '1.5rem',
                                        fontSize: '0.85rem',
                                        color: 'var(--accent-indigo)',
                                        background: 'rgba(44,62,107,0.04)',
                                        padding: '0.5rem 0.75rem 0.5rem 1.5rem',
                                        borderRadius: 'var(--radius-sm)',
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '6px',
                                    }}>
                                        <MessageSquare size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                                        <span><strong>{t('patientProfile.doctorNote')}</strong> {visit.doctorNote}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
