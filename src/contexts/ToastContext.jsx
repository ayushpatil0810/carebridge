// ============================================================
// ToastContext — Global toast / snackbar notification system
// Usage: const { toast } = useToast();
//        toast.success('Saved!') | toast.error('Failed') |
//        toast.info('Note') | toast.warn('Warning')
// ============================================================

import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

let _idCounter = 0;

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const timers = useRef({});

    const dismiss = useCallback((id) => {
        // Trigger exit animation
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
            clearTimeout(timers.current[id]);
            delete timers.current[id];
        }, 320);
    }, []);

    const add = useCallback((type, message, duration = 3500) => {
        const id = ++_idCounter;
        setToasts(prev => [...prev, { id, type, message, exiting: false }]);
        timers.current[id] = setTimeout(() => dismiss(id), duration);
        return id;
    }, [dismiss]);

    const toast = {
        success: (msg, dur) => add('success', msg, dur),
        error: (msg, dur) => add('error', msg, dur ?? 5000),
        info: (msg, dur) => add('info', msg, dur),
        warn: (msg, dur) => add('warn', msg, dur),
    };

    return (
        <ToastContext.Provider value={{ toast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismiss} />
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

// ─── Toast Container (renders fixed portal) ───────────────────
const ICONS = {
    success: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    ),
    error: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    ),
    info: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
    warn: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
};

function ToastContainer({ toasts, onDismiss }) {
    if (toasts.length === 0) return null;

    return (
        <div className="toast-container" aria-live="polite" aria-label="Notifications">
            {toasts.map(t => (
                <div
                    key={t.id}
                    className={`toast toast-${t.type} ${t.exiting ? 'toast-exit' : ''}`}
                    role="alert"
                >
                    <span className="toast-icon">{ICONS[t.type]}</span>
                    <span className="toast-message">{t.message}</span>
                    <button
                        className="toast-close"
                        onClick={() => onDismiss(t.id)}
                        aria-label="Dismiss"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            ))}
        </div>
    );
}
