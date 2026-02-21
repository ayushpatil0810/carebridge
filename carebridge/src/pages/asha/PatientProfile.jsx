// ============================================================
// Patient Profile — View patient details + visit history
// ============================================================

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientById } from '../../services/patientService';
import { getVisitsByPatient } from '../../services/visitService';
import { Plus, ClipboardList, Flag, MessageSquare, XCircle, ArrowLeft } from 'lucide-react';

export default function PatientProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [patient, setPatient] = useState(null);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        try {
            const [p, v] = await Promise.all([
                getPatientById(id),
                getVisitsByPatient(id),
            ]);
            setPatient(p);
            setVisits(v);
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
                    <div className="loading-text">Loading patient profile...</div>
                </div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="card">
                <div className="empty-state">
                    <div className="empty-icon"><XCircle size={48} strokeWidth={1} /></div>
                    <p>Patient not found</p>
                    <button className="btn btn-secondary" onClick={() => navigate('/search')} style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <ArrowLeft size={16} /> Back to Search
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
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2px' }}>{patient.name}</h2>
                            <div className="text-muted">
                                {patient.patientId} • Registered {formatTime(patient.createdAt)}
                            </div>
                        </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => navigate(`/patient/${id}/visit`)}>
                        <Plus size={16} /> New Visit
                    </button>
                </div>

                <div className="warli-divider" style={{ margin: '1rem 0' }}></div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                    <div>
                        <div className="text-muted" style={{ marginBottom: '2px' }}>Age / Gender</div>
                        <div style={{ fontWeight: 500 }}>{patient.age} yrs • {patient.gender}</div>
                    </div>
                    <div>
                        <div className="text-muted" style={{ marginBottom: '2px' }}>Village (गाव)</div>
                        <div style={{ fontWeight: 500 }}>{patient.village}</div>
                    </div>
                    <div>
                        <div className="text-muted" style={{ marginBottom: '2px' }}>House No. (घर क्र.)</div>
                        <div style={{ fontWeight: 500 }}>{patient.houseNumber}</div>
                    </div>
                    <div>
                        <div className="text-muted" style={{ marginBottom: '2px' }}>Family ID</div>
                        <div style={{ fontWeight: 500 }}>{patient.familyId}</div>
                    </div>
                    {patient.abhaId && (
                        <div>
                            <div className="text-muted" style={{ marginBottom: '2px' }}>ABHA ID</div>
                            <div style={{ fontWeight: 500 }}>{patient.abhaId}</div>
                        </div>
                    )}
                    {patient.contact && (
                        <div>
                            <div className="text-muted" style={{ marginBottom: '2px' }}>Contact (संपर्क)</div>
                            <div style={{ fontWeight: 500 }}>{patient.contact}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Visit History */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        Visit History <span className="text-marathi text-muted" style={{ fontSize: '0.8rem' }}>(भेट इतिहास)</span>
                    </h3>
                    <span className="badge badge-indigo">{visits.length} visits</span>
                </div>

                {visits.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon"><ClipboardList size={48} strokeWidth={1} /></div>
                        <p>No visits recorded yet</p>
                        <button className="btn btn-primary" onClick={() => navigate(`/patient/${id}/visit`)} style={{ marginTop: '1rem' }}>
                            <Plus size={16} /> Create First Visit
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
                                                {visit.chiefComplaint || 'No complaint recorded'}
                                            </div>
                                            <div className="text-muted" style={{ marginTop: '4px' }}>
                                                {formatTime(visit.createdAt)}
                                                {visit.symptomDuration && ` • Duration: ${visit.symptomDuration} days`}
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
                                        <span><strong>Doctor Note:</strong> {visit.doctorNote}</span>
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
