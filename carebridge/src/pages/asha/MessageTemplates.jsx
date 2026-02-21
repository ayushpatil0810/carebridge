// ============================================================
// Message Templates — Public Health Message Library
// ============================================================

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { HEALTH_TEMPLATES, logMessage, getWhatsAppLink } from '../../services/messageService';
import {
    BookOpen,
    Send,
    ExternalLink,
    Search,
    Check,
    MessageSquare,
} from 'lucide-react';

export default function MessageTemplates() {
    const { t } = useTranslation();
    const { user, userName } = useAuth();
    const [search, setSearch] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [phone, setPhone] = useState('');
    const [patientName, setPatientName] = useState('');
    const [useMarathi, setUseMarathi] = useState(false);
    const [sending, setSending] = useState(false);
    const [sentId, setSentId] = useState(null);

    const filtered = HEALTH_TEMPLATES.filter(tpl =>
        tpl.title.toLowerCase().includes(search.toLowerCase()) ||
        tpl.category.toLowerCase().includes(search.toLowerCase())
    );

    const handleSend = async () => {
        if (!selectedTemplate || !phone) return;
        setSending(true);
        try {
            const msg = useMarathi ? selectedTemplate.messageMarathi : selectedTemplate.message;
            await logMessage({
                patientId: '',
                patientName,
                messageType: `template_${selectedTemplate.id}`,
                messageText: msg,
                sentBy: user?.uid || '',
                sentByName: userName || '',
                channel: 'whatsapp',
            });
            window.open(getWhatsAppLink(phone, msg), '_blank');
            setSentId(selectedTemplate.id);

            // Reset after brief delay
            setTimeout(() => {
                setSentId(null);
                setSelectedTemplate(null);
                setPhone('');
                setPatientName('');
            }, 2000);
        } catch (err) {
            console.error(err);
        } finally {
            setSending(false);
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                    <BookOpen size={18} /> {t('messageTemplates.title')}
                </h3>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    {t('messageTemplates.description')}
                </p>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="form-input"
                        placeholder={t('messageTemplates.searchPlaceholder')}
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: '36px' }}
                    />
                </div>
            </div>

            {/* Template Grid */}
            <div className="template-grid stagger-children">
                {filtered.map(tpl => (
                    <div
                        key={tpl.id}
                        className={`template-card ${selectedTemplate?.id === tpl.id ? 'selected' : ''}`}
                        onClick={() => { setSelectedTemplate(tpl); setUseMarathi(false); }}
                    >
                        <div className="template-card-header">
                            <span className="template-icon">{tpl.icon}</span>
                            <div>
                                <div className="template-title">{tpl.title}</div>
                                <div className="template-category">{tpl.category}</div>
                            </div>
                        </div>
                        <p className="template-preview">{tpl.message.length > 80 ? tpl.message.slice(0, 80) + '…' : tpl.message}</p>
                        {selectedTemplate?.id === tpl.id && <div className="template-selected-badge"><Check size={14} /> {t('messageTemplates.selected')}</div>}
                    </div>
                ))}
            </div>

            {/* Send Panel */}
            {selectedTemplate && (
                <div className="card" style={{ marginTop: '1rem', borderLeft: '4px solid var(--accent-saffron)' }}>
                    <h4 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                        <MessageSquare size={16} /> {selectedTemplate.title}
                    </h4>

                    {selectedTemplate.messageMarathi && (
                        <div className="msg-lang-toggle" style={{ marginBottom: '0.75rem' }}>
                            <button className={`btn btn-sm ${!useMarathi ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setUseMarathi(false)}>{t('messageTemplates.english')}</button>
                            <button className={`btn btn-sm ${useMarathi ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setUseMarathi(true)}>{t('messageTemplates.marathi')}</button>
                        </div>
                    )}

                    <div className="msg-preview-box" style={{ marginBottom: '0.75rem' }}>
                        {useMarathi ? selectedTemplate.messageMarathi : selectedTemplate.message}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder={t('messageTemplates.patientNameOptional')}
                            value={patientName}
                            onChange={e => setPatientName(e.target.value)}
                            style={{ flex: '1 1 140px' }}
                        />
                        <input
                            type="tel"
                            className="form-input"
                            placeholder={t('messageTemplates.phoneNumber')}
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            style={{ flex: '1 1 140px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTemplate(null)}>{t('common.cancel')}</button>
                        <button
                            className="btn btn-success btn-sm"
                            onClick={handleSend}
                            disabled={!phone || sending}
                        >
                            {sentId === selectedTemplate.id ? (
                                <><Check size={14} /> {t('messageTemplates.sent')}</>
                            ) : (
                                <><Send size={14} /> {sending ? t('messageTemplates.sending') : t('messageTemplates.sendViaWhatsApp')} <ExternalLink size={12} /></>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
