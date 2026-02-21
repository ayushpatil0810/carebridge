// ============================================================
// Admin Performance — ASHA + PHC metrics (Feature 9)
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { getAllVisits, formatDuration } from '../../services/visitService';
import {
    getASHAPerformanceMetrics,
    getPHCPerformanceMetrics,
} from '../../services/adminService';
import {
    Users,
    Building2,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    Activity,
    Clock,
    Target,
    BarChart3,
} from 'lucide-react';

export default function AdminPerformance() {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('asha');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getAllVisits();
            setVisits(data);
        } catch (err) {
            console.error('Error loading performance data:', err);
        } finally {
            setLoading(false);
        }
    };

    const ashaMetrics = useMemo(() => getASHAPerformanceMetrics(visits), [visits]);
    const phcMetrics = useMemo(() => getPHCPerformanceMetrics(visits), [visits]);

    if (loading) {
        return (
            <div className="loading-spinner">
                <div>
                    <div className="spinner"></div>
                    <div className="loading-text">Loading performance data...</div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Tab Switcher */}
            <div className="admin-section-switcher" style={{ marginBottom: '1.5rem' }}>
                <button
                    className={`admin-section-btn ${activeTab === 'asha' ? 'active' : ''}`}
                    onClick={() => setActiveTab('asha')}
                >
                    <Users size={16} /> ASHA Workers
                </button>
                <button
                    className={`admin-section-btn ${activeTab === 'phc' ? 'active' : ''}`}
                    onClick={() => setActiveTab('phc')}
                >
                    <Building2 size={16} /> PHC Doctors
                </button>
            </div>

            {/* ───── ASHA METRICS ───── */}
            {activeTab === 'asha' && (
                <div className="stagger-children">
                    <div className="card">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                            <Users size={18} /> ASHA Worker Performance Metrics
                        </h3>
                        <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                            Supportive performance visibility — not a ranking system.
                        </p>

                        {ashaMetrics.length === 0 ? (
                            <div className="empty-state"><p>No ASHA data available yet.</p></div>
                        ) : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr>
                                            <th>ASHA Worker</th>
                                            <th>Cases Submitted</th>
                                            <th>High-Risk Identified</th>
                                            <th>High-Risk Rate</th>
                                            <th>Escalated</th>
                                            <th>Approved Referrals</th>
                                            <th>Escalation Accuracy</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ashaMetrics.map((a, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{a.name}</td>
                                                <td>{a.totalCases}</td>
                                                <td>
                                                    <span className={`badge ${a.highRiskIdentified > 0 ? 'badge-red' : 'badge-green'}`}>
                                                        {a.highRiskIdentified}
                                                    </span>
                                                </td>
                                                <td>{a.highRiskRate}%</td>
                                                <td>{a.escalated}</td>
                                                <td>{a.approvedReferrals}</td>
                                                <td>
                                                    <div className="perf-bar-container">
                                                        <div
                                                            className={`perf-bar ${a.escalationAccuracy >= 70 ? 'perf-bar-green' : a.escalationAccuracy >= 40 ? 'perf-bar-yellow' : 'perf-bar-red'}`}
                                                            style={{ width: `${Math.min(a.escalationAccuracy, 100)}%` }}
                                                        ></div>
                                                        <span className="perf-bar-label">{a.escalationAccuracy}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ASHA Summary Cards */}
                    <div className="stats-grid" style={{ marginTop: '1rem' }}>
                        <div className="stat-card">
                            <div className="stat-card-icon saffron"><Users size={24} /></div>
                            <div>
                                <div className="stat-card-value">{ashaMetrics.length}</div>
                                <div className="stat-card-label">Active ASHA Workers</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon indigo"><Activity size={24} /></div>
                            <div>
                                <div className="stat-card-value">
                                    {ashaMetrics.reduce((sum, a) => sum + a.totalCases, 0)}
                                </div>
                                <div className="stat-card-label">Total Cases</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon green"><Target size={24} /></div>
                            <div>
                                <div className="stat-card-value">
                                    {ashaMetrics.length > 0
                                        ? Math.round(ashaMetrics.reduce((sum, a) => sum + a.escalationAccuracy, 0) / ashaMetrics.length)
                                        : 0}%
                                </div>
                                <div className="stat-card-label">Avg Escalation Accuracy</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ───── PHC METRICS ───── */}
            {activeTab === 'phc' && (
                <div className="stagger-children">
                    <div className="card">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                            <Building2 size={18} /> PHC Doctor Performance Metrics
                        </h3>
                        <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                            Operational metrics for governance and accountability.
                        </p>

                        {phcMetrics.length === 0 ? (
                            <div className="empty-state"><p>No PHC review data available yet.</p></div>
                        ) : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr>
                                            <th>PHC Doctor</th>
                                            <th>Cases Reviewed</th>
                                            <th>Avg Response</th>
                                            <th>Referral Rate</th>
                                            <th>Monitoring Rate</th>
                                            <th>Clarifications</th>
                                            <th>Closure Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {phcMetrics.map((p, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{p.name}</td>
                                                <td>{p.totalReviewed}</td>
                                                <td>
                                                    {p.avgResponseMs ? (
                                                        <span className={p.avgResponseMs > 3600000 ? 'text-danger' : ''}>
                                                            {formatDuration(p.avgResponseMs)}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td>{p.referralRate}%</td>
                                                <td>{p.monitoringRate}%</td>
                                                <td>{p.clarifications}</td>
                                                <td>
                                                    <div className="perf-bar-container">
                                                        <div
                                                            className={`perf-bar ${p.closureRate >= 70 ? 'perf-bar-green' : p.closureRate >= 40 ? 'perf-bar-yellow' : 'perf-bar-red'}`}
                                                            style={{ width: `${Math.min(p.closureRate, 100)}%` }}
                                                        ></div>
                                                        <span className="perf-bar-label">{p.closureRate}%</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* PHC Summary Cards */}
                    <div className="stats-grid" style={{ marginTop: '1rem' }}>
                        <div className="stat-card">
                            <div className="stat-card-icon saffron"><Building2 size={24} /></div>
                            <div>
                                <div className="stat-card-value">{phcMetrics.length}</div>
                                <div className="stat-card-label">Active PHC Doctors</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon indigo"><BarChart3 size={24} /></div>
                            <div>
                                <div className="stat-card-value">
                                    {phcMetrics.reduce((sum, p) => sum + p.totalReviewed, 0)}
                                </div>
                                <div className="stat-card-label">Total Reviews</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon green"><CheckCircle2 size={24} /></div>
                            <div>
                                <div className="stat-card-value">
                                    {phcMetrics.length > 0
                                        ? Math.round(phcMetrics.reduce((sum, p) => sum + p.closureRate, 0) / phcMetrics.length)
                                        : 0}%
                                </div>
                                <div className="stat-card-label">Avg Closure Rate</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
