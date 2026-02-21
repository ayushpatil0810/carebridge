// ============================================================
// Follow-Up Dashboard — Due today + upcoming follow-ups
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
    getFollowUpsByUser,
    completeFollowUp,
    markReminderSent,
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
} from 'lucide-react';

export default function FollowUps() {
    const { user, userName } = useAuth();
    const [followUps, setFollowUps] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('today');

    useEffect(() => {
        loadFollowUps();
    }, [user]);

    const loadFollowUps = async () => {
        if (!user) return;
        try {
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
    const overdue = followUps.filter(f => f.followUpDate < today && f.status === 'pending');

    const handleComplete = async (id) => {
        await completeFollowUp(id);
        setFollowUps(prev => prev.map(f => f.id === id ? { ...f, status: 'completed' } : f));
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

        // Open WhatsApp — in practice you'd need the patient's phone number from patient data
        // For now, we log it and the ASHA worker can find the patient's number
        window.open(getWhatsAppLink('', msg), '_blank');
    };

    const getItems = () => {
        switch (activeTab) {
            case 'today': return [...overdue, ...dueToday];
            case 'upcoming': return upcoming;
            case 'completed': return completed;
            default: return [];
        }
    };

    const items = getItems();

    if (loading) {
        return (
            <div className="loading-spinner">
                <div><div className="spinner"></div><div className="loading-text">Loading follow-ups...</div></div>
            </div>
        );
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
                        <div className="stat-label">Overdue</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--accent-saffron-bg)', color: 'var(--accent-saffron)' }}>
                        <Clock size={20} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{dueToday.length}</div>
                        <div className="stat-label">Due Today</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--accent-indigo-bg)', color: 'var(--accent-indigo)' }}>
                        <CalendarCheck size={20} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{upcoming.length}</div>
                        <div className="stat-label">Upcoming</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'var(--green-bg, #dcfce7)', color: 'var(--green)' }}>
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="stat-content">
                        <div className="stat-value">{completed.length}</div>
                        <div className="stat-label">Completed</div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="admin-section-switcher" style={{ marginBottom: '1rem' }}>
                <button className={`section-btn ${activeTab === 'today' ? 'active' : ''}`} onClick={() => setActiveTab('today')}>
                    Due Today {(overdue.length + dueToday.length) > 0 && <span className="badge badge-red" style={{ marginLeft: '6px', fontSize: '0.65rem' }}>{overdue.length + dueToday.length}</span>}
                </button>
                <button className={`section-btn ${activeTab === 'upcoming' ? 'active' : ''}`} onClick={() => setActiveTab('upcoming')}>
                    Upcoming ({upcoming.length})
                </button>
                <button className={`section-btn ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>
                    Completed ({completed.length})
                </button>
            </div>

            {/* List */}
            {items.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon"><CalendarCheck size={48} strokeWidth={1} /></div>
                        <p>{activeTab === 'completed' ? 'No completed follow-ups yet.' : 'No follow-ups in this category.'}</p>
                    </div>
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
                                        <div style={{ fontWeight: 600 }}>{fu.patientName || 'Patient'}</div>
                                        <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                                            <MapPin size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {fu.patientVillage || '—'}
                                            &nbsp;&nbsp;•&nbsp;&nbsp;
                                            <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> {fu.followUpDate} at {fu.followUpTime || '09:00'}
                                        </div>
                                        {fu.reason && <div className="text-muted" style={{ fontSize: '0.8rem', marginTop: '2px' }}>Reason: {fu.reason}</div>}
                                        {isOverdue && <span className="badge badge-red" style={{ fontSize: '0.65rem', marginTop: '4px' }}>Overdue</span>}
                                        {fu.reminderSent && <span className="badge badge-indigo" style={{ fontSize: '0.65rem', marginTop: '4px', marginLeft: '6px' }}>Reminder Sent</span>}
                                    </div>
                                    {fu.status === 'pending' && (
                                        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                            <button
                                                className="btn btn-sm btn-success"
                                                onClick={() => handleSendReminder(fu)}
                                                title="Send reminder via WhatsApp"
                                            >
                                                <Bell size={13} /> Remind
                                            </button>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={() => handleComplete(fu.id)}
                                                title="Mark as completed"
                                            >
                                                <CheckCircle2 size={13} /> Done
                                            </button>
                                        </div>
                                    )}
                                    {fu.status === 'completed' && (
                                        <span className="status-badge approved" style={{ fontSize: '0.75rem' }}>✓ Completed</span>
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
