// ============================================================
// Message Log — Accountability log of all sent messages
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getMessageLogsByUser } from '../../services/messageService';
import {
    FileText,
    Clock,
    MessageSquare,
    ExternalLink,
    Search,
    Filter,
} from 'lucide-react';

const TYPE_LABELS = {
    monitoring_advice: { label: 'Monitoring Advice', color: '#22C55E' },
    recheck_reminder: { label: 'Recheck Reminder', color: '#F59E0B' },
    referral_notice: { label: 'Referral Notice', color: '#DC2626' },
    followup_reminder: { label: 'Follow-Up Reminder', color: '#6366F1' },
    template_dengue: { label: 'Dengue Prevention', color: '#14B8A6' },
    template_heatstroke: { label: 'Heatstroke Awareness', color: '#FF8800' },
    template_vaccination: { label: 'Vaccination Reminder', color: '#6366F1' },
    template_tb_followup: { label: 'TB Follow-Up', color: '#EC4899' },
    template_pregnancy: { label: 'Pregnancy Check-Up', color: '#F59E0B' },
    template_followup_general: { label: 'General Follow-Up', color: '#94A3B8' },
};

export default function MessageLog() {
    const { user } = useAuth();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState('');

    useEffect(() => {
        loadLogs();
    }, [user]);

    const loadLogs = async () => {
        if (!user) return;
        try {
            const data = await getMessageLogsByUser(user.uid);
            setLogs(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '—';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
        });
    };

    const filtered = logs.filter(log => {
        if (filterType && log.messageType !== filterType) return false;
        if (search) {
            const q = search.toLowerCase();
            return (log.patientName || '').toLowerCase().includes(q) ||
                (log.messageText || '').toLowerCase().includes(q);
        }
        return true;
    });

    const uniqueTypes = [...new Set(logs.map(l => l.messageType))];

    if (loading) {
        return (
            <div className="loading-spinner">
                <div><div className="spinner"></div><div className="loading-text">Loading message log...</div></div>
            </div>
        );
    }

    return (
        <div>
            <div className="card" style={{ marginBottom: '1rem' }}>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                    <FileText size={18} /> Message Log
                </h3>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    Complete record of all messages sent. {logs.length} message{logs.length !== 1 ? 's' : ''} logged.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 200px' }}>
                        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Search patient or message…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{ paddingLeft: '36px' }}
                        />
                    </div>
                    <select
                        className="form-input"
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        style={{ width: 'auto', padding: '6px 30px 6px 10px', fontSize: '0.8rem' }}
                    >
                        <option value="">All Types</option>
                        {uniqueTypes.map(t => (
                            <option key={t} value={t}>{TYPE_LABELS[t]?.label || t}</option>
                        ))}
                    </select>
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon"><MessageSquare size={48} strokeWidth={1} /></div>
                        <p>No messages logged yet.</p>
                    </div>
                </div>
            ) : (
                <div className="msg-log-list stagger-children">
                    {filtered.map(log => {
                        const typeInfo = TYPE_LABELS[log.messageType] || { label: log.messageType, color: '#94A3B8' };
                        return (
                            <div key={log.id} className="msg-log-card">
                                <div className="msg-log-header">
                                    <span className="msg-log-type" style={{ '--type-color': typeInfo.color }}>
                                        {typeInfo.label}
                                    </span>
                                    <span className="msg-log-time">
                                        <Clock size={12} /> {formatTime(log.sentAt)}
                                    </span>
                                </div>
                                <div className="msg-log-patient">
                                    {log.patientName || 'Unknown Patient'}
                                    {log.patientId && <span className="text-muted" style={{ fontSize: '0.75rem', marginLeft: '8px' }}>{log.patientId}</span>}
                                </div>
                                <div className="msg-log-text">{log.messageText}</div>
                                <div className="msg-log-footer">
                                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                                        Sent by: {log.sentByName || 'ASHA'}
                                    </span>
                                    {log.visitId && (
                                        <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                                            Case Linked
                                        </span>
                                    )}
                                    <span className="msg-log-channel">
                                        <ExternalLink size={11} /> {log.channel || 'WhatsApp'}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
