// ============================================================
// SBARDisplay — Read-only display of SBAR summary
// ============================================================
// Used in both VisitEntry (after generation) and PHC CaseReview.
// Shows AI-generated or fallback SBAR with clear labeling.
// ============================================================

import { useState } from 'react';
import {
    FileText,
    ChevronDown,
    ChevronUp,
    Sparkles,
    AlertTriangle,
    Globe,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function SBARDisplay({
    sbarEnglish,
    sbarTranslated,
    aiGenerated = false,
    rawNotes,
    showRawNotes = false,
}) {
    const { t, i18n } = useTranslation();
    const [rawExpanded, setRawExpanded] = useState(false);
    const [showTranslated, setShowTranslated] = useState(!!sbarTranslated && i18n.language !== 'en');

    if (!sbarEnglish) return null;

    // Parse SBAR sections from text
    const parseSBAR = (text) => {
        const sections = { S: '', B: '', A: '', R: '' };
        const lines = text.split('\n');
        let currentKey = null;

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('S:')) {
                currentKey = 'S';
                sections.S = trimmed.substring(2).trim();
            } else if (trimmed.startsWith('B:')) {
                currentKey = 'B';
                sections.B = trimmed.substring(2).trim();
            } else if (trimmed.startsWith('A:')) {
                currentKey = 'A';
                sections.A = trimmed.substring(2).trim();
            } else if (trimmed.startsWith('R:')) {
                currentKey = 'R';
                sections.R = trimmed.substring(2).trim();
            } else if (currentKey && trimmed) {
                sections[currentKey] += ' ' + trimmed;
            }
        }

        return sections;
    };

    const displayText = showTranslated && sbarTranslated ? sbarTranslated : sbarEnglish;
    const sections = parseSBAR(displayText);
    const hasParsedSections = sections.S || sections.B || sections.A || sections.R;

    const SBAR_LABELS = {
        S: { title: t('sbar.situation', 'SITUATION'), color: '#2563EB' },
        B: { title: t('sbar.background', 'BACKGROUND'), color: '#7C3AED' },
        A: { title: t('sbar.assessment', 'ASSESSMENT'), color: '#D97706' },
        R: { title: t('sbar.recommendation', 'RECOMMENDATION'), color: '#059669' },
    };

    return (
        <div className="card" style={{ marginBottom: '1rem' }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
            }}>
                <h3 className="card-title" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: 0,
                }}>
                    <FileText size={18} />
                    {t('sbar.title', 'SBAR Summary')}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* AI/Template badge */}
                    <span style={{
                        fontSize: '0.65rem',
                        padding: '2px 8px',
                        borderRadius: '99px',
                        background: aiGenerated ? 'rgba(99, 102, 241, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: aiGenerated ? 'var(--accent-indigo)' : '#D97706',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontWeight: 600,
                    }}>
                        {aiGenerated ? (
                            <><Sparkles size={10} /> {t('sbar.aiGenerated', 'AI Generated')}</>
                        ) : (
                            <><AlertTriangle size={10} /> {t('sbar.templateGenerated', 'Template')}</>
                        )}
                    </span>

                    {/* Language toggle */}
                    {sbarTranslated && (
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setShowTranslated(prev => !prev)}
                            style={{
                                fontSize: '0.7rem',
                                padding: '2px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                        >
                            <Globe size={12} />
                            {showTranslated ? 'English' : t('sbar.localLang', 'Local Language')}
                        </button>
                    )}
                </div>
            </div>

            {/* SBAR Sections */}
            {hasParsedSections ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {Object.entries(SBAR_LABELS).map(([key, label]) => (
                        sections[key] ? (
                            <div key={key} className="sbar-section">
                                <div className="sbar-section-title" style={{ color: label.color }}>
                                    {label.title}
                                </div>
                                <div className="sbar-section-content">
                                    {sections[key]}
                                </div>
                            </div>
                        ) : null
                    ))}
                </div>
            ) : (
                // Fallback: show raw text if parsing fails
                <div style={{
                    background: 'var(--bg-secondary)',
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--radius)',
                    fontSize: '0.88rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap',
                }}>
                    {displayText}
                </div>
            )}

            {/* AI Disclaimer */}
            {aiGenerated && (
                <div style={{
                    marginTop: '0.75rem',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    fontStyle: 'italic',
                }}>
                    {t('sbar.disclaimer', 'AI-structured summary for documentation purposes only. Not a diagnosis. All decisions remain with the clinician.')}
                </div>
            )}

            {/* Raw Notes (Collapsible) */}
            {showRawNotes && rawNotes && (
                <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setRawExpanded(prev => !prev)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '0.8rem',
                            padding: '4px 8px',
                            width: '100%',
                            justifyContent: 'space-between',
                        }}
                    >
                        <span>{t('sbar.rawNotes', 'Raw Clinical Notes')}</span>
                        {rawExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {rawExpanded && (
                        <div style={{
                            marginTop: '0.5rem',
                            background: 'var(--bg-secondary)',
                            padding: '0.75rem 1rem',
                            borderRadius: 'var(--radius)',
                            fontSize: '0.85rem',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap',
                        }}>
                            {rawNotes}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
