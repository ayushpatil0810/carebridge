// ============================================================
// EmptyState — Reusable illustrated empty-state component
// ============================================================

/**
 * Props:
 *   icon        — React element (Lucide icon, etc.)
 *   title       — string
 *   description — string
 *   action      — { label: string, onClick: () => void } | null
 *   colorScheme — 'default' | 'green' | 'yellow' | 'red' | 'indigo'
 */
export default function EmptyState({
    icon,
    title = 'No data yet',
    description = '',
    action = null,
    colorScheme = 'default',
}) {
    const colors = {
        default: { bg: 'var(--bg-body)', border: 'var(--border-color)', iconColor: 'var(--text-muted)' },
        green: { bg: 'var(--green-bg)', border: 'var(--green-light)', iconColor: 'var(--green)' },
        yellow: { bg: 'var(--yellow-bg)', border: 'var(--yellow-light)', iconColor: 'var(--yellow-dark)' },
        red: { bg: 'var(--red-bg)', border: 'var(--red-light)', iconColor: 'var(--red)' },
        indigo: { bg: 'var(--primary-lighter)', border: 'var(--primary-light)', iconColor: 'var(--primary)' },
    };

    const { bg, border, iconColor } = colors[colorScheme] ?? colors.default;

    return (
        <div className="empty-state-enhanced">
            <div
                className="empty-state-icon-wrap"
                style={{ background: bg, borderColor: border, color: iconColor }}
            >
                {icon}
            </div>
            <div className="empty-state-title">{title}</div>
            {description && (
                <div className="empty-state-desc">{description}</div>
            )}
            {action && (
                <button className="btn btn-primary btn-sm" onClick={action.onClick}>
                    {action.label}
                </button>
            )}
        </div>
    );
}
