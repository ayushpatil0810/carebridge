// ============================================================
// Clarification Response — ASHA responds to doctor's question
// ============================================================

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    getVisitById,
    respondToClarification,
} from '../../services/visitService';
import {
    ArrowLeft,
    MessageCircleQuestion,
    Send,
    CheckCircle2,
    AlertCircle,
    User,
    MapPin,
    Activity,
    FileText,
} from 'lucide-react';

export default function ClarificationResponse() {
    const { t } = useTranslation();
    const { visitId } = useParams();
    const { user, userName } = useAuth();
    const navigate = useNavigate();

    const [visit, setVisit] = useState(null);
    const [loading, setLoading] = useState(true);
    const [responseText, setResponseText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        loadVisit();
    }, [visitId]);

    const loadVisit = async () => {
        try {
            const data = await getVisitById(visitId);
            if (!data) {
                setError(t('clarification.visitNotFound'));
            } else if (user && data.createdBy !== user.uid) {
                setError(t('clarification.unauthorized', 'You do not have access to this visit.'));
            } else {
                setVisit(data);
            }
        } catch (err) {
            setError(t('clarification.errorLoading'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!responseText.trim()) return;
        setSubmitting(true);
        setError('');
        try {
            await respondToClarification(visitId, {
                responseText: responseText.trim(),
                respondedBy: userName,
            });
            setSuccess(t('clarification.responseSubmitted'));
            setTimeout(() => navigate('/dashboard'), 2000);
        } catch (err) {
            setError(t('clarification.failedSubmit') + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-spinner">
                <div>
                    <div className="spinner"></div>
                    <div className="loading-text">{t('clarification.loading')}</div>
                </div>
            </div>
        );
    }

    if (error && !visit) {
        return (
            <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
                <AlertCircle size={40} color="var(--alert-red)" />
                <p style={{ marginTop: '1rem' }}>{error}</p>
                <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={16} /> {t('clarification.backToDashboard')}
                </button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '700px' }}>
            <button className="btn btn-ghost" onClick={() => navigate('/dashboard')} style={{ marginBottom: '1rem' }}>
                <ArrowLeft size={16} /> {t('clarification.backToDashboard')}
            </button>

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

            {/* Patient Summary */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h3 style={{ fontWeight: 600, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <User size={18} /> {visit?.patientName || t('clarification.unknownPatient')}
                        </h3>
                        <div className="text-muted" style={{ marginTop: '4px', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <span>{visit?.patientAge || '—'}</span>
                            <span><MapPin size={12} /> {visit?.patientVillage || '—'}</span>
                            <span><Activity size={12} /> NEWS2: {visit?.news2Score ?? '—'}</span>
                        </div>
                    </div>
                    <span className={`badge badge-${visit?.riskLevel === 'Red' ? 'red' : visit?.riskLevel === 'Yellow' ? 'yellow' : 'green'}`}>
                        {visit?.riskLevel || 'N/A'}
                    </span>
                </div>
                <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--bg-primary)', borderRadius: '6px', fontSize: '0.9rem' }}>
                    <span className="detail-label">{t('clarification.chiefComplaint')} </span>
                    {visit?.chiefComplaint || '—'}
                </div>
            </div>

            {/* Doctor's Question */}
            <div className="card" style={{ marginBottom: '1rem', borderColor: 'var(--yellow)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '1rem', color: '#9A7B12', marginBottom: '0.75rem' }}>
                    <MessageCircleQuestion size={18} /> {t('clarification.doctorsQuestion')}
                </h3>
                <div style={{
                    background: 'var(--yellow-bg)',
                    padding: '0.75rem 1rem',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    borderLeft: '3px solid var(--yellow)',
                }}>
                    {visit?.clarificationMessage || t('clarification.noQuestion')}
                </div>
                {visit?.reviewedBy && (
                    <div className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                        {t('clarification.askedBy')} {visit.reviewedBy}
                    </div>
                )}
            </div>

            {/* Response Form */}
            <div className="card">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>
                    <FileText size={18} /> {t('clarification.yourResponse')}
                </h3>
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                    <textarea
                        className="form-input"
                        rows="5"
                        placeholder={t('clarification.responsePlaceholder')}
                        value={responseText}
                        onChange={e => setResponseText(e.target.value)}
                        disabled={success}
                    />
                    <div className="form-hint">{t('clarification.afterSubmit')}</div>
                </div>
                <button
                    className="btn btn-primary btn-block"
                    onClick={handleSubmit}
                    disabled={submitting || !responseText.trim() || success}
                >
                    {submitting ? (
                        <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }}></div> {t('clarification.submitting')}</>
                    ) : (
                        <><Send size={16} /> {t('clarification.submitResponse')}</>
                    )}
                </button>
            </div>
        </div>
    );
}
