// ============================================================
// ASHA Dashboard — Summary cards + case list + clarification alerts
// ============================================================

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getVisitsByUser, getClarificationCasesByUser } from '../../services/visitService';
import { getDueVaccinationsByUser } from '../../services/vaccinationService';
import {
    ClipboardList,
    AlertCircle,
    Clock,
    CheckCircle2,
    UserPlus,
    Search,
    MessageSquare,
    MessageCircleQuestion,
    ArrowRight,
    Syringe,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SkeletonDashboard } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';

export default function Dashboard() {
    const [visits, setVisits] = useState([]);
    const [clarifications, setClarifications] = useState([]);
    const [dueVaccines, setDueVaccines] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation();

    useEffect(() => {
        if (user) loadData();
    }, [user]);

    const loadData = async () => {
        try {
            const [allVisits, clarCases, dueVax] = await Promise.all([
                getVisitsByUser(user.uid).catch(err => {
                    console.error('Error loading visits:', err);
                    return [];
                }),
                getClarificationCasesByUser(user.uid).catch(err => {
                    console.error('Error loading clarifications:', err);
                    return [];
                }),
                getDueVaccinationsByUser(user.uid).catch(err => {
                    console.error('Error loading vaccinations:', err);
                    return [];
                }),
            ]);
            setVisits(allVisits);
            setClarifications(clarCases);
            setDueVaccines(dueVax);
        } catch (err) {
            console.error('Error loading dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    // Compute stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayVisits = visits.filter(v => {
        if (!v.createdAt) return false;
        const visitDate = v.createdAt.toDate ? v.createdAt.toDate() : new Date(v.createdAt);
        return visitDate >= today;
    });

    const highRiskCount = visits.filter(v => v.riskLevel === 'Red' || (v.news2Score && v.news2Score >= 7)).length;
    const pendingReviews = visits.filter(v => v.status === 'Pending PHC Review').length;
    const approvedReferrals = visits.filter(v => v.status === 'Referral Approved').length;

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
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

    if (loading) {
        return <SkeletonDashboard />;
    }

    return (
        <div>
            {/* Clarification Alert Banner */}
            {clarifications.length > 0 && (
                <div className="clarification-alert" style={{
                    background: 'var(--yellow-bg)',
                    border: '1px solid var(--yellow-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.25rem',
                    animation: 'cardFadeIn var(--transition-slow) ease',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem', fontWeight: 600, color: '#9A7B12' }}>
                        <MessageCircleQuestion size={18} />
                        {t('dashboard.doctorClarificationsRequired', { count: clarifications.length })}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {clarifications.map(c => (
                            <div
                                key={c.id}
                                className="card card-clickable"
                                style={{ padding: '0.75rem 1rem', margin: 0, boxShadow: 'none', border: '1px solid var(--yellow-light)' }}
                                onClick={() => navigate(`/clarification/${c.id}`)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                            {c.patientName || t('dashboard.unknownPatient')}
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>
                                            {t('dashboard.doctorAsks')} "{c.clarificationMessage?.substring(0, 80) || '...'}"
                                        </div>
                                    </div>
                                    <ArrowRight size={16} color="#9A7B12" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stat Cards */}
            <div className="stats-grid stagger-children">
                <div className="stat-card">
                    <div className="stat-card-icon saffron"><ClipboardList size={24} /></div>
                    <div>
                        <div className="stat-card-value">{todayVisits.length}</div>
                        <div className="stat-card-label">{t('dashboard.casesToday')}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-icon red"><AlertCircle size={24} /></div>
                    <div>
                        <div className="stat-card-value">{highRiskCount}</div>
                        <div className="stat-card-label">{t('dashboard.highNEWS2Cases')}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-icon indigo"><Clock size={24} /></div>
                    <div>
                        <div className="stat-card-value">{pendingReviews}</div>
                        <div className="stat-card-label">{t('dashboard.pendingPHCReviews')}</div>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-card-icon green"><CheckCircle2 size={24} /></div>
                    <div>
                        <div className="stat-card-value">{approvedReferrals}</div>
                        <div className="stat-card-label">{t('dashboard.referralsApproved')}</div>
                    </div>
                </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <button className="btn btn-primary" onClick={() => navigate('/register')}>
                    <UserPlus size={16} /> {t('dashboard.registerPatient')}
                </button>
                <button className="btn btn-secondary" onClick={() => navigate('/search')}>
                    <Search size={16} /> {t('dashboard.searchPatients')}
                </button>
            </div>

            {/* Vaccinations Due Widget */}
            {dueVaccines.length > 0 && (
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Syringe size={18} /> {t('vaccination.due')}
                        </h2>
                        <button className="btn btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => navigate('/vaccinations')}>
                            {t('dashboard.viewAll')} <ArrowRight size={14} />
                        </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {dueVaccines.slice(0, 8).map(vax => (
                            <div key={`${vax.patientDocId}-${vax.id}`}
                                className="card card-clickable"
                                onClick={() => navigate('/vaccinations')}
                                style={{
                                    padding: '0.6rem 0.75rem', margin: 0, boxShadow: 'none',
                                    border: `1px solid ${vax.computedStatus === 'overdue' ? 'rgba(220,38,38,0.2)' : 'var(--border-light)'}`,
                                    background: vax.computedStatus === 'overdue' ? 'rgba(220,38,38,0.03)' : 'var(--bg-card)',
                                }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{vax.patientName}</div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            💉 {vax.vaccineName} (Dose {vax.doseNumber})
                                        </div>
                                    </div>
                                    <span className={`badge ${vax.computedStatus === 'overdue' ? 'badge-red' : 'badge-yellow'}`}
                                        style={{ fontSize: '0.68rem' }}>
                                        {vax.daysOverdue > 0 ? t('dashboard.dOverdue', { days: vax.daysOverdue }) : t('dashboard.dueToday')}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {dueVaccines.length > 8 && (
                            <div className="text-muted" style={{ fontSize: '0.75rem', textAlign: 'center', padding: '0.3rem' }}>
                                {t('dashboard.more', { count: dueVaccines.length - 8 })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Recent Visits */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">{t('visit.recentVisits')}</h2>
                </div>

                {visits.length === 0 ? (
                    <EmptyState
                        icon={<ClipboardList size={32} strokeWidth={1.5} />}
                        title={t('dashboard.noVisitsYet')}
                        description={t('dashboard.startByRegistering', 'Register a patient and record your first visit to see it here.')}
                        action={{ label: t('dashboard.registerPatient'), onClick: () => navigate('/register') }}
                    />
                ) : (
                    <div className="cards-grid stagger-children">
                        {visits.slice(0, 20).map((visit) => (
                            <div
                                key={visit.id}
                                className="card card-clickable"
                                onClick={() => navigate(`/patient/${visit.patientDocId}`)}
                                style={{ padding: '1rem 1.25rem' }}
                            >
                                <div className="visit-card">
                                    <div className="visit-card-left">
                                        <div className={`visit-risk-dot ${getRiskClass(visit.riskLevel)}`}></div>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                                {visit.patientName || t('dashboard.unknownPatient')}
                                            </div>
                                            <div className="text-muted" style={{ marginTop: '2px' }}>
                                                {visit.chiefComplaint ? visit.chiefComplaint.substring(0, 60) + (visit.chiefComplaint.length > 60 ? '...' : '') : t('dashboard.noComplaintRecorded')}
                                                {' • '}
                                                {formatTime(visit.createdAt)}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        {visit.news2Score != null && (
                                            <span className={`badge badge-${getRiskClass(visit.riskLevel)}`}>
                                                NEWS2: {visit.news2Score}
                                            </span>
                                        )}
                                        <span className={`status-badge ${visit.status === 'Pending PHC Review' ? 'pending' :
                                            visit.status === 'Awaiting ASHA Response' ? 'clarification' :
                                                visit.status === 'Under Monitoring' ? 'monitoring' :
                                                    visit.status === 'Reviewed' || visit.status === 'Referral Approved' ? 'reviewed' :
                                                        visit.emergencyFlag ? 'emergency' : ''
                                            }`}>
                                            {visit.status}
                                        </span>
                                    </div>
                                </div>
                                {visit.doctorNote && (
                                    <div style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', fontSize: '0.8rem', color: 'var(--accent-indigo)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <MessageSquare size={12} /> Dr: {visit.doctorNote}
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
