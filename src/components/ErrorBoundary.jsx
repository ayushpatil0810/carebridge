// ============================================================
// ErrorBoundary — Catches unexpected render errors in subtrees
// Usage: <ErrorBoundary fallback="optional custom text">...</ErrorBoundary>
// ============================================================

import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[CareBridge] Uncaught render error:', error, info.componentStack);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            const { fallback } = this.props;
            if (fallback) return fallback;

            return (
                <div className="error-boundary-fallback">
                    <div className="error-boundary-inner">
                        <div className="error-boundary-icon" aria-hidden="true">⚠️</div>
                        <h2 className="error-boundary-title">Something went wrong</h2>
                        <p className="error-boundary-msg">
                            {this.state.error?.message || 'An unexpected error occurred in this section.'}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" onClick={this.handleReset}>
                                Try again
                            </button>
                            <button className="btn btn-secondary" onClick={() => window.location.href = '/'}>
                                Go to Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
