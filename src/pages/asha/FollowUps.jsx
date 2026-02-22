// ============================================================
// Follow-Up Dashboard — Due today + upcoming follow-ups
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { SkeletonFollowUpList } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import {
    getFollowUpsByUser,
    completeFollowUp,
    markReminderSent,
    markMissedFollowUps,
    rescheduleFollowUp,
    todayStr,
} from '../../services/followUpService';
import {
    logMessage,
    getWhatsAppLink,
} from '../../services/messageService';
import {
    CalendarCheck,
    Clock,
    CheckCircle2,
    Bell,
    Send,
    ExternalLink,
    MapPin,
    AlertCircle,
    RefreshCw,
} from 'lucide-react';

export default function FollowUps() {
    const { t } = useTranslation();
    const { user, userName } = useAuth();
    const { toast } = useToast();
    const [followUps, setFollowUps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('today');
    const [rescheduleId, setRescheduleId] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');

    useEffect(() => {
        loadFollowUps();
    }, [user]);

    const loadFollowUps = async () => {
        if (!user) return;
        try {
            // Auto-mark overdue follow-ups as missed
            await markMissedFollowUps(user.uid);
            const data = await getFollowUpsByUser(user.uid);
            setFollowUps(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const today = todayStr();

    const dueToday = followUps.filter(f => f.followUpDate === today && f.status === 'pending');
    const upcoming = followUps.filter(f => f.followUpDate > today && f.status === 'pending');
    const completed = followUps.filter(f => f.status === 'completed');
    const missed = followUps.filter(f => f.status === 'missed');
    const overdue = followUps.filter(f => f.followUpDate < today && f.status === 'pending');

    const handleComplete = async (id) => {
        await completeFollowUp(id);
        setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status: 'completed' } : f));
        toast.success(t('followUp.markedComplete', 'Follow-up marked as completed.'));
    };

    const handleReschedule = async (id) => {
        if (!rescheduleDate) return;
        await rescheduleFollowUp(id, rescheduleDate);
        setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status: 'pending', followUpDate: rescheduleDate } : f));
        setRescheduleId(null);
        setRescheduleDate('');
        toast.success(t('followUp.rescheduled', 'Follow-up rescheduled successfully.'));
    };

    const handleSendReminder = async (fu) => {
        const msg = `Reminder: Your follow-up visit is due${fu.followUpDate === today ? ' today' : ` on ${fu.followUpDate}`}. Reason: ${fu.reason || 'General check-up'}. Please visit the health center or contact your ASHA worker.`;

        await logMessage({
            patientId: fu.patientId,
            patientName: fu.patientName,
            messageType: 'followup_reminder',
            messageText: msg,
            sentBy: user?.uid || '',
            sentByName: userName || '',
            visitId: fu.visitId,
            channel: 'whatsapp',
        });
        await markReminderSent(fu.id);
        setFollowUps(prev => prev.map(f => f.id === fu.id ? { ...f, reminderSent: true } : f));
        toast.success(t('followUp.reminderSentMsg', 'Reminder sent via WhatsApp.'));

        // Open WhatsApp with patient's contact number if available
        const phone = fu.patientContact || '';
        window.open(getWhatsAppLink(phone, msg), '_blank');
    };

    const getItems = () => {
        switch (activeTab) {
            case 'today': return [...overdue, ...dueToday];
            case 'upcoming': return upcoming;
            case 'completed': return completed;
            case 'missed': return missed;
            default: return [];
        }
    };

    const items = getItems();

    if (loading) {
        return <SkeletonFollowUpList count={5} />;
    }

    return (
        <div>
            {/* Summary Cards */}
            <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--alert-red-bg)', color: 'var(--alert-red)' }}>
                        <AlertCircle size={20} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{overdue.length}</div>
                        <div className="stat-label">{t('followUp.overdue')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--accent-saffron-bg)', color: 'var(--accent-saffron)' }}>
                        <Clock size={20} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{dueToday.length}</div>
                        <div className="stat-label">{t('followUp.dueToday')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--accent-indigo-bg)', color: 'var(--accent-indigo)' }}>
                        <CalendarCheck size={20} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{upcoming.length}</div>
                        <div className="stat-label">{t('followUp.upcoming')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--green-bg, #dcfce7)', color: 'var(--green)' }}>
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{completed.length}</div>
                        <div className="stat-label">{t('followUp.completed')}</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(220,38,38,0.06)', color: '#DC2626' }}>
                        <AlertCircle size={20} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{missed.length}</div>
                        <div className="stat-label">{t('followUp.missed')}</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="admin-section-switcher" style={{ marginBottom: '1rem' }}>
                <button className={`section-btn ${activeTab === 'today' ? 'active' : ''}`} onClick={() => setActiveTab('today')}>
                    {t('followUp.dueToday')} {(overdue.length + dueToday.length) > 0 && <span className="badge badge-red" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>{overdue.length + dueToday.length}</span>}
                </button>
                <button className={`section-btn ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>
                    {t('followUp.upcoming')} ({upcoming.length})
                </button>
                <button className={`section-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
                    {t('followUp.completed')} ({completed.length})
                </button>
                <button className={`section-btn ${activeTab === 'missed' ? 'active' : ''}`} onClick={() => setActiveTab('missed')}>
                    {t('followUp.missed')} {missed.length > 0 && <span className="badge badge-red" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>{missed.length}</span>}
                </button>
            </div>

            {/* List */}
            {items.length === 0 ? (
                <div className="card">
                    <EmptyState
                        icon={<CalendarCheck size={32} strokeWidth={1.5} />}
                        title={activeTab === 'completed' ? t('followUp.noCompleted', 'No completed follow-ups') : t('followUp.noFollowUps', "You're all caught up!")}
                        description={activeTab === 'today' ? t('followUp.noTodayDesc', 'No follow-ups are due today.') : activeTab === 'upcoming' ? t('followUp.noUpcomingDesc', 'No upcoming follow-ups scheduled.') : ''}
                        colorScheme={activeTab === 'completed' ? 'green' : 'default'}
                    />
                </div>
            ) : (
                <div className="stagger-children">
                    {items.map(fu => {
                        const isOverdue = fu.followUpDate < today && fu.status === 'pending';
                        return (
                            <div
                                key={fu.id}
                                className="card"
                                style={{
                                    marginBottom: '0.75rem',
                                    borderLeft: `4px solid ${isOverdue ? 'var(--alert-red)' : fu.status === 'completed' ? 'var(--green)' : 'var(--accent-saffron)'}`,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{fu.patientName || t('followUp.patient')}</div>
                                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                            <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {fu.patientVillage || '—'}
                                            &nbsp;&nbsp;•&nbsp;&nbsp;
                                            <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {fu.followUpDate} at {fu.followUpTime || '09:00'}
                                        </div>
                                        {fu.reason && <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>{t('followUp.reason')}: {fu.reason}</div>}
                                        {isOverdue && <span className="badge badge-red" style={{ fontSize: '0.65rem', marginTop: '4px' }}>{t('followUp.overdue')}</span>}
                                        {fu.reminderSent && <span className="badge badge-indigo" style={{ fontSize: '0.65rem', marginTop: '4px', marginLeft: '6px' }}>{t('followUp.reminderSent')}</span>}
                                    </div>
                                    {fu.status === 'pending' && (
                                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => handleSendReminder(fu)}
                                                title="Send reminder via WhatsApp"
                                            >
                                                <Bell size={13} /> {t('followUp.remind')}
                                            </button>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => handleComplete(fu.id)}
                                                title={t('followUp.markCompleted')}
                                            >
                                                <CheckCircle2 size={13} /> {t('followUp.done')}
                                            </button>
                                        </div>
                                    )}
                                    {fu.status === 'completed' && (
                                        <span className="status-badge approved" style={{ fontSize: '0.75rem' }}>✓ {t('followUp.completed')}</span>
                                    )}
                                    {fu.status === 'missed' && (
                                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, alignItems: 'center' }}>
                                            <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>{t('followUp.missed')}</span>
                                            {rescheduleId === fu.id ? (
                                                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                    <input type="date" className="input" style={{ fontSize: '0.75rem', padding: '4px 8px', width: '140px' }}
                                                        value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} min={today} />
                                                    <button className="btn btn-sm btn-primary" onClick={() => handleReschedule(fu.id)} disabled={!rescheduleDate}>
                                                        <CheckCircle2 size={13} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button className="btn btn-sm btn-secondary" onClick={() => { setRescheduleId(fu.id); setRescheduleDate(''); }}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <RefreshCw size={13} /> {t('followUp.reschedule')}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
