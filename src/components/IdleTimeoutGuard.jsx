// ============================================================
// IdleTimeoutGuard — Warns user before auto-logout on inactivity
// Mount once inside AuthProvider. Only active when user is logged in.
// ============================================================

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import useIdleTimeout from '../hooks/useIdleTimeout';
import { Clock, LogOut, RefreshCw } from 'lucide-react';

const WARN_AFTER = 4 * 60 * 1000;    // warn at 4 min idle
const TIMEOUT_AFTER = 5 * 60 * 1000; // logout at 5 min idle

export default function IdleTimeoutGuard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showWarning, setShowWarning] = useState(false);
    const [countdown, setCountdown] = useState(60);

    const handleWarn = useCallback(() => {
        if (!user) return;
        setShowWarning(true);
        let secs = 60;
        setCountdown(secs);
        const interval = setInterval(() => {
            secs -= 1;
            setCountdown(secs);
            if (secs <= 0) clearInterval(interval);
        }, 1000);
    }, [user]);

    const handleTimeout = useCallback(async () => {
        if (!user) return;
        setShowWarning(false);
        await logout();
        navigate('/login');
    }, [user, logout, navigate]);

    const handleStayLoggedIn = useCallback(() => {
        setShowWarning(false);
        setCountdown(60);
    }, []);

    const handleLogoutNow = useCallback(async () => {
        setShowWarning(false);
        await logout();
        navigate('/login');
    }, [logout, navigate]);

    useIdleTimeout({
        onWarn: handleWarn,
        onTimeout: handleTimeout,
        warnAfter: WARN_AFTER,
        timeoutAfter: TIMEOUT_AFTER,
        enabled: !!user,
    });

    if (!showWarning) return null;

    return (
        <div className="idle-overlay" role="dialog" aria-modal="true" aria-labelledby="idle-title">
            <div className="idle-modal">
                <div className="idle-modal-icon">
                    <Clock size={32} strokeWidth={1.5} />
                </div>
                <h2 className="idle-modal-title" id="idle-title">Still there?</h2>
                <p className="idle-modal-body">
                    You've been inactive for a while. For your security, you'll be logged out automatically
                    in <strong>{countdown}s</strong>.
                </p>
                <div className="idle-modal-actions">
                    <button className="btn btn-primary" onClick={handleStayLoggedIn}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={15} /> Stay logged in
                    </button>
                    <button className="btn btn-secondary" onClick={handleLogoutNow}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LogOut size={15} /> Logout now
                    </button>
                </div>
            </div>
        </div>
    );
}
