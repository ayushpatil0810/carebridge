// ============================================================
// Admin Notices — Send notices, flag PHCs, track acknowledgments
// Features 6 & 7
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAllNotices, createNotice } from '../../services/noticeService';
import { getAllVisits } from '../../services/visitService';
import { getPHCSummary } from '../../services/adminService';
import {
    Send,
    Bell,
    Flag,
    MessageSquare,
    CheckCircle2,
    Clock,
    AlertCircle,
    AlertTriangle,
    FileText,
} from 'lucide-react';

export default function AdminNotices() {
    const { user, userName } = useAuth();
    const [notices, setNotices] = useState([]);
    const [phcList, setPHCList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    // Form state
    const [targetPHC, setTargetPHC] = useState('');
    const [noticeType, setNoticeType] = useState('notice');
    const [message, setMessage] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [allNotices, visits] = await Promise.all([
                getAllNotices(),
                getAllVisits(),
            ]);
            setNotices(allNotices);
            // Get unique PHC names from visits
            const phcs = getPHCSummary(visits).map((p) => p.name).filter((n) => n !== 'Unassigned');
            setPHCList(phcs);
        } catch (err) {
            console.error('Error loading notices:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendNotice = async () => {
        if (!targetPHC || !message.trim()) return;
        setSubmitting(true);
        setError('');
        try {
            await createNotice({
                targetPHC,
                type: noticeType,
                message: message.trim(),
                createdBy: user?.uid || '',
                createdByName: userName || 'Admin',
            });
            setSuccess('Notice sent successfully!');
            setMessage('');
            setTargetPHC('');
            setNoticeType('notice');
            // Reload notices
            const updated = await getAllNotices();
            setNotices(updated);
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to send notice: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeIcon = (type) => {
        if (type === 'flag') return <Flag size={14} color="var(--alert-red)" />;
        if (type === 'comment') return <MessageSquare size={14} color="var(--accent-indigo)" />;
        return <Bell size={14} color="var(--accent-saffron)" />;
    };

    const getTypeLabel = (type) => {
        if (type === 'flag') return 'Flag for Review';
        if (type === 'comment') return 'Performance Comment';
        return 'Administrative Notice';
    };

    const getStatusBadge = (notice) => {
        if (notice.followUpStatus === 'resolved') {
            return <span className="badge badge-green">Resolved</span>;
        }
        if (notice.acknowledged) {
            return <span className="badge badge-indigo">Acknowledged</span>;
        }
        return <span className="badge badge-yellow">Pending</span>;
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

    if (loading) {
        return (
            <div className="loading-spinner">
                <div>
                    <div className="spinner"></div>
                    <div className="loading-text">Loading notices...</div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Success / Error banners */}
            {success && (
                <div style={{ background: 'var(--green-light)', color: 'var(--green)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={16} /> {success}
                </div>
            )}
            {error && (
                <div style={{ background: 'var(--alert-red-light)', color: 'var(--alert-red)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
                {/* Send Notice Form */}
                <div className="card" style={{ borderTop: '3px solid var(--accent-saffron)' }}>
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <Send size={18} /> Send Notice / Flag
                    </h3>

                    <div className="form-group">
                        <label className="form-label">Target PHC</label>
                        <select
                            className="form-input"
                            value={targetPHC}
                            onChange={(e) => setTargetPHC(e.target.value)}
                        >
                            <option value="">Select PHC / Doctor...</option>
                            {phcList.map((p, i) => (
                                <option key={i} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notice Type</label>
                        <div className="radio-group">
                            {[
                                { value: 'notice', label: 'Notice', icon: Bell },
                                { value: 'flag', label: 'Flag', icon: Flag },
                                { value: 'comment', label: 'Comment', icon: MessageSquare },
                            ].map((opt) => {
                                const Icon = opt.icon;
                                return (
                                    <label
                                        key={opt.value}
                                        className={`radio-option ${noticeType === opt.value ? 'selected' : ''}`}
                                    >
                                        <input
                                            type="radio"
                                            name="noticeType"
                                            value={opt.value}
                                            checked={noticeType === opt.value}
                                            onChange={(e) => setNoticeType(e.target.value)}
                                        />
                                        <Icon size={14} /> {opt.label}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Message</label>
                        <textarea
                            className="form-input"
                            rows="4"
                            placeholder='e.g., "PHC X – High pending cases. Please review backlog."'
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                    </div>

                    <button
                        className="btn btn-primary btn-block"
                        onClick={handleSendNotice}
                        disabled={submitting || !targetPHC || !message.trim()}
                    >
                        {submitting ? (
                            <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> Sending...</>
                        ) : (
                            <><Send size={16} /> Send Notice</>
                        )}
                    </button>
                </div>

                {/* Notice History */}
                <div className="card">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                        <FileText size={18} /> Notice History & Tracking
                    </h3>

                    {notices.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon"><Bell size={48} strokeWidth={1} /></div>
                            <p>No notices sent yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {notices.map((n) => (
                                <div key={n.id} className="notice-card">
                                    <div className="notice-header">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {getTypeIcon(n.type)}
                                            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{n.targetPHC}</span>
                                            <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                {getTypeLabel(n.type)}
                                            </span>
                                        </div>
                                        {getStatusBadge(n)}
                                    </div>
                                    <div className="notice-body">{n.message}</div>
                                    <div className="notice-footer">
                                        <span className="text-muted">
                                            <Clock size={11} /> Sent: {formatTime(n.createdAt)}
                                            {n.createdByName && ` by ${n.createdByName}`}
                                        </span>
                                        {n.acknowledged && (
                                            <span className="text-muted">
                                                <CheckCircle2 size={11} /> Ack: {formatTime(n.acknowledgedAt)}
                                                {n.acknowledgedBy && ` by ${n.acknowledgedBy}`}
                                            </span>
                                        )}
                                    </div>
                                    {n.responseNote && (
                                        <div className="notice-response">
                                            <strong>Response:</strong> {n.responseNote}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
