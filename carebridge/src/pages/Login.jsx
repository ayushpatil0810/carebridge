// ============================================================
// Login Page — CareBridge
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Mail, Lock, User, AlertTriangle } from 'lucide-react';

export default function Login() {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRoleInput] = useState('asha');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isRegister) {
                await register(email, password, name, role);
            } else {
                await login(email, password);
            }
        } catch (err) {
            console.error(err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Invalid email or password');
            } else if (err.code === 'auth/email-already-in-use') {
                setError('An account with this email already exists');
            } else if (err.code === 'auth/weak-password') {
                setError('Password must be at least 6 characters');
            } else {
                setError(err.message || 'Something went wrong');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-brand">
                    <div className="login-icon">
                        <Heart size={40} color="var(--accent-saffron)" strokeWidth={1.5} />
                    </div>
                    <h1>CareBridge</h1>
                    <p className="login-subtitle">Clinical Support System</p>
                </div>

                <div className="warli-divider" style={{ marginBottom: '1.5rem' }}></div>

                <form onSubmit={handleSubmit}>
                    {isRegister && (
                        <div className="form-group">
                            <label className="form-label">
                                <User size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                                Full Name <span className="label-marathi">पूर्ण नाव</span>
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">
                            <Mail size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                            Email <span className="label-marathi">ईमेल</span>
                        </label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">
                            <Lock size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} />
                            Password <span className="label-marathi">पासवर्ड</span>
                        </label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            minLength={6}
                        />
                    </div>

                    {isRegister && (
                        <div className="form-group">
                            <label className="form-label">
                                Role <span className="label-marathi">भूमिका</span>
                            </label>
                            <div className="radio-group">
                                <label className={`radio-option ${role === 'asha' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="asha"
                                        checked={role === 'asha'}
                                        onChange={(e) => setRoleInput(e.target.value)}
                                    />
                                    ASHA Worker
                                </label>
                                <label className={`radio-option ${role === 'phc' ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="role"
                                        value="phc"
                                        checked={role === 'phc'}
                                        onChange={(e) => setRoleInput(e.target.value)}
                                    />
                                    PHC Doctor
                                </label>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="warning-banner" style={{ marginBottom: '1rem' }}>
                            <span className="warning-icon"><AlertTriangle size={18} /></span>
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg btn-block"
                        disabled={loading}
                    >
                        {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                    <button
                        className="btn btn-ghost"
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setError('');
                        }}
                    >
                        {isRegister
                            ? 'Already have an account? Sign In'
                            : "Don't have an account? Register"}
                    </button>
                </div>
            </div>
        </div>
    );
}
