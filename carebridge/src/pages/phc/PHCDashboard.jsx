// ============================================================
// PHC Dashboard — Pending Reviews List
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingReviews, getAllVisits } from '../../services/visitService';
import {
    Clock,
    ShieldAlert,
    CheckCircle2,
    Flag,
    MessageSquare,
    MapPin,
} from 'lucide-react';

export default function PHCDashboard() {
    const [pendingVisits, setPendingVisits] = useState([]);
    const [allVisits, setAllVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [pending, all] = await Promise.all([
                getPendingReviews(),
                getAllVisits(),
            ]);
            setPendingVisits(pending);
            setAllVisits(all);
        } catch (err) {
            console.error('Error loading reviews:', err);
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
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getRiskClass = (level) => {
        if (level === 'Red') return 'red';
        if (level === 'Yellow') return 'yellow';
        return 'green';
    };

    const reviewedVisits = allVisits.filter(v => v.status === 'Reviewed' || v.status === 'Referral Approved' || v.status === 'Observation');

    if (loading) {
        return (
            <div className="loading-spinner">
                <div>
                    <div className="spinner"></div>
                    <div className="loading-text">Loading reviews...</div>
                </div>
            </div>
        );
    }

    const displayVisits = activeTab === 'pending' ? pendingVisits : reviewedVisits;

    return (
        <div>
            {/* Stats */}
            <div className="stats-grid stagger-children" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-card-icon saffron"><Clock size={24} /></div>
                    <div>
                        <div className="stat-card-value">{pendingVisits.length}</div>
                        <div className="stat-card-label">Pending Reviews</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon red"><ShieldAlert size={24} /></div>
                    <div>
                        <div className="stat-card-value">{pendingVisits.filter(v => v.emergencyFlag).length}</div>
                        <div className="stat-card-label">Emergency Cases</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon green"><CheckCircle2 size={24} /></div>
                    <div>
                        <div className="stat-card-value">{reviewedVisits.length}</div>
                        <div className="stat-card-label">Reviewed</div>
                    </div>
                </div>
            </div>

            {/* Tab Buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button
                    className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('pending')}
                >
                    <Clock size={14} /> Pending ({pendingVisits.length})
                </button>
                <button
                    className={`btn ${activeTab === 'reviewed' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('reviewed')}
                >
                    <CheckCircle2 size={14} /> Reviewed ({reviewedVisits.length})
                </button>
            </div>

            {/* Visit Cards */}
            {displayVisits.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon">{activeTab === 'pending' ? <CheckCircle2 size={48} strokeWidth={1} /> : <Clock size={48} strokeWidth={1} />}</div>
                        <p>{activeTab === 'pending' ? 'No pending reviews — all caught up!' : 'No reviewed cases yet.'}</p>
                    </div>
                </div>
            ) : (
                <div className="cards-grid stagger-children">
                    {displayVisits.map((visit) => (
                        <div
                            key={visit.id}
                            className="card card-clickable"
                            onClick={() => navigate(`/phc/review/${visit.id}`)}
                            style={{ padding: '1.25rem' }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {visit.patientName}
                                        {visit.emergencyFlag && <span style={{ color: 'var(--alert-red)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem' }}><ShieldAlert size={14} /> EMERGENCY</span>}
                                    </div>
                                    <div className="patient-meta">
                                        <span>Age: {visit.patientAge}</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><MapPin size={12} /> {visit.patientVillage}</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Clock size={12} /> {formatTime(visit.createdAt)}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                                    {visit.news2Score != null && (
                                        <span className={`badge badge-${getRiskClass(visit.riskLevel)}`} style={{ fontSize: '0.85rem' }}>
                                            NEWS2: {visit.news2Score}
                                        </span>
                                    )}
                                    <span className={`badge badge-${getRiskClass(visit.riskLevel)}`}>
                                        {visit.riskLevel} Risk
                                    </span>
                                </div>
                            </div>

                            {/* Chief Complaint preview */}
                            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                {visit.chiefComplaint
                                    ? visit.chiefComplaint.substring(0, 100) + (visit.chiefComplaint.length > 100 ? '…' : '')
                                    : 'No complaint recorded'}
                            </div>

                            {/* Red flags */}
                            {visit.redFlags && visit.redFlags.length > 0 && (
                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {visit.redFlags.map((flag, idx) => (
                                        <span key={idx} className="badge badge-red" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                            <Flag size={10} /> {flag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Doctor note for reviewed */}
                            {visit.doctorNote && (
                                <div style={{
                                    marginTop: '0.75rem',
                                    padding: '0.5rem 0.75rem',
                                    background: 'rgba(44,62,107,0.05)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.85rem',
                                    color: 'var(--accent-indigo)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}>
                                    <MessageSquare size={14} /> {visit.doctorNote}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
