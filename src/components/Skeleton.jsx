// ============================================================
// Skeleton — Shimmer placeholder components for loading states
// ============================================================

/**
 * Base skeleton block.
 * Props: width (string), height (string | number), style (object)
 */
export function Skeleton({ width = '100%', height = 14, style = {}, className = '' }) {
    return (
        <span
            className={`skeleton ${className}`}
            style={{ width, height: typeof height === 'number' ? `${height}px` : height, display: 'block', ...style }}
            aria-hidden="true"
        />
    );
}

/** Single-line text skeleton */
export function SkeletonText({ width = '100%', size = 'base' }) {
    const heights = { sm: 11, base: 14, lg: 20, xl: 28 };
    return (
        <Skeleton
            width={width}
            height={heights[size] ?? 14}
            className={`skeleton-text`}
        />
    );
}

/** Circular skeleton (avatar, icon) */
export function SkeletonCircle({ size = 40 }) {
    return (
        <Skeleton
            width={size}
            height={size}
            className="skeleton-circle"
            style={{ flexShrink: 0, width: size, height: size, borderRadius: '50%' }}
        />
    );
}

/** A full stat card skeleton matching .stat-card */
export function SkeletonStatCard() {
    return (
        <div className="skeleton-stat-card">
            <Skeleton width={48} height={48} style={{ borderRadius: 'var(--radius-md)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
                <SkeletonText width="50%" size="xl" />
                <SkeletonText width="70%" size="sm" />
            </div>
        </div>
    );
}

/** A generic card skeleton */
export function SkeletonCard({ lines = 3 }) {
    return (
        <div className="skeleton-card">
            <SkeletonText width="60%" size="lg" />
            <div style={{ height: 8 }} />
            {Array.from({ length: lines }).map((_, i) => (
                <SkeletonText key={i} width={i === lines - 1 ? '50%' : '100%'} />
            ))}
        </div>
    );
}

/** A list-row skeleton (patient/visit rows) */
export function SkeletonListRow({ hasAvatar = true }) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.9rem 1.25rem',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
            }}
        >
            {hasAvatar && <SkeletonCircle size={42} />}
            <div style={{ flex: 1 }}>
                <SkeletonText width="45%" size="base" />
                <SkeletonText width="65%" size="sm" />
            </div>
            <Skeleton width={60} height={24} style={{ borderRadius: 'var(--radius-full)' }} />
        </div>
    );
}

/** Stats grid skeleton — 4 stat cards */
export function SkeletonStatsGrid({ count = 4 }) {
    return (
        <div className="stats-grid stagger-children">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonStatCard key={i} />
            ))}
        </div>
    );
}

/** Full dashboard skeleton */
export function SkeletonDashboard() {
    return (
        <div>
            <SkeletonStatsGrid count={4} />
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <Skeleton width={160} height={42} style={{ borderRadius: 'var(--radius-sm)' }} />
                <Skeleton width={160} height={42} style={{ borderRadius: 'var(--radius-sm)' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[1, 2, 3].map(i => <SkeletonListRow key={i} />)}
            </div>
        </div>
    );
}

/** Search results skeleton */
export function SkeletonSearchResults({ count = 3 }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonListRow key={i} hasAvatar />
            ))}
        </div>
    );
}

/** Follow-ups list skeleton */
export function SkeletonFollowUpList({ count = 4 }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="skeleton-card"
                    style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <SkeletonCircle size={36} />
                        <div style={{ flex: 1 }}>
                            <SkeletonText width="40%" size="base" />
                            <SkeletonText width="60%" size="sm" />
                        </div>
                        <Skeleton width={80} height={28} style={{ borderRadius: 'var(--radius-sm)' }} />
                    </div>
                </div>
            ))}
        </div>
    );
}
