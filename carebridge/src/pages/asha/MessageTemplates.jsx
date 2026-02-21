// ============================================================
// Message Templates — Public Health Message Library
// ============================================================

import { useState } from 'react';
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
    const { user, userName } = useAuth();
    const [search, setSearch] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [phone, setPhone] = useState('');
    const [patientName, setPatientName] = useState('');
    const [useMarathi, setUseMarathi] = useState(false);
    const [sending, setSending] = useState(false);
    const [sentId, setSentId] = useState(null);

    const filtered = HEALTH_TEMPLATES.filter(t =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.category.toLowerCase().includes(search.toLowerCase())
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
                    <BookOpen size={18} /> Health Message Templates
                </h3>
                <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                    Reusable health awareness and reminder templates. Select a template, enter the recipient's number, and send via WhatsApp.
                </p>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        className="form-input"
                        placeholder="Search templates…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{ paddingLeft: '36px' }}
                    />
                </div>
            </div>

            {/* Template Grid */}
            <div className="template-grid stagger-children">
                {filtered.map(t => (
                    <div
                        key={t.id}
                        className={`template-card ${selectedTemplate?.id === t.id ? 'selected' : ''}`}
                        onClick={() => { setSelectedTemplate(t); setUseMarathi(false); }}
                    >
                        <div className="template-card-header">
                            <span className="template-icon">{t.icon}</span>
                            <div>
                                <div className="template-title">{t.title}</div>
                                <div className="template-category">{t.category}</div>
                            </div>
                        </div>
                        <p className="template-preview">{t.message.length > 80 ? t.message.slice(0, 80) + '…' : t.message}</p>
                        {selectedTemplate?.id === t.id && <div className="template-selected-badge"><Check size={14} /> Selected</div>}
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
                            <button className={`btn btn-sm ${!useMarathi ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setUseMarathi(false)}>English</button>
                            <button className={`btn btn-sm ${useMarathi ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setUseMarathi(true)}>मराठी</button>
                        </div>
                    )}

                    <div className="msg-preview-box" style={{ marginBottom: '0.75rem' }}>
                        {useMarathi ? selectedTemplate.messageMarathi : selectedTemplate.message}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        <input
                            type="text"
                            className="form-input"
                            placeholder="Patient name (optional)"
                            value={patientName}
                            onChange={e => setPatientName(e.target.value)}
                            style={{ flex: '1 1 140px' }}
                        />
                        <input
                            type="tel"
                            className="form-input"
                            placeholder="Phone number *"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            style={{ flex: '1 1 140px' }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTemplate(null)}>Cancel</button>
                        <button
                            className="btn btn-success btn-sm"
                            onClick={handleSend}
                            disabled={!phone || sending}
                        >
                            {sentId === selectedTemplate.id ? (
                                <><Check size={14} /> Sent!</>
                            ) : (
                                <><Send size={14} /> {sending ? 'Sending…' : 'Send via WhatsApp'} <ExternalLink size={12} /></>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
