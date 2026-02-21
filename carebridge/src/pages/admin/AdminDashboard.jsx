// ============================================================
// Admin Dashboard — Overview, Risk Map, NEWS2, Response, Villages
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { getAllVisits } from '../../services/visitService';
import {
    getPHCSummary,
    getGlobalSummary,
    getPHCRiskIndicators,
    getHighNEWS2ByPHC,
    getHighNEWS2ByVillage,
    getPHCResponseTimes,
    getVillageCaseLoad,
} from '../../services/adminService';
import { formatDuration } from '../../services/visitService';
import {
    LayoutDashboard,
    Activity,
    AlertCircle,
    Clock,
    CheckCircle2,
    Eye,
    MapPin,
    TrendingUp,
    Building2,
    ShieldAlert,
    Timer,
    Zap,
    AlertTriangle,
} from 'lucide-react';

export default function AdminDashboard() {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('overview');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await getAllVisits();
            setVisits(data);
        } catch (err) {
            console.error('Error loading admin data:', err);
        } finally {
            setLoading(false);
        }
    };

    // Memoized computations
    const globalStats = useMemo(() => getGlobalSummary(visits), [visits]);
    const phcSummary = useMemo(() => getPHCSummary(visits), [visits]);
    const riskIndicators = useMemo(() => getPHCRiskIndicators(visits), [visits]);
    const highNEWS2PHC = useMemo(() => getHighNEWS2ByPHC(visits), [visits]);
    const highNEWS2Village = useMemo(() => getHighNEWS2ByVillage(visits), [visits]);
    const responseTimes = useMemo(() => getPHCResponseTimes(visits), [visits]);
    const villageCaseLoad = useMemo(() => getVillageCaseLoad(visits), [visits]);

    const sections = [
        { key: 'overview', label: 'Overview', icon: LayoutDashboard },
        { key: 'riskmap', label: 'Clinical Load', icon: MapPin },
        { key: 'highnews2', label: 'High NEWS2', icon: AlertCircle },
        { key: 'response', label: 'Response Times', icon: Clock },
        { key: 'villages', label: 'Village Load', icon: Building2 },
    ];

    if (loading) {
        return (
            <div className="loading-spinner">
                <div>
                    <div className="spinner"></div>
                    <div className="loading-text">Loading administrative data...</div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Section Switcher */}
            <div className="admin-section-switcher">
                {sections.map((s) => {
                    const Icon = s.icon;
                    return (
                        <button
                            key={s.key}
                            className={`admin-section-btn ${activeSection === s.key ? 'active' : ''}`}
                            onClick={() => setActiveSection(s.key)}
                        >
                            <Icon size={16} /> {s.label}
                        </button>
                    );
                })}
            </div>

            {/* ───── OVERVIEW SECTION (Features 1 & 2) ───── */}
            {activeSection === 'overview' && (
                <div className="stagger-children">
                    {/* Global Summary Cards */}
                    <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                        <div className="stat-card">
                            <div className="stat-card-icon saffron"><Activity size={24} /></div>
                            <div>
                                <div className="stat-card-value">{globalStats.totalCases}</div>
                                <div className="stat-card-label">Total Cases</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon red"><ShieldAlert size={24} /></div>
                            <div>
                                <div className="stat-card-value">{globalStats.highRiskCases}</div>
                                <div className="stat-card-label">High Risk Cases</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon indigo"><Clock size={24} /></div>
                            <div>
                                <div className="stat-card-value">{globalStats.pendingSecondOpinions}</div>
                                <div className="stat-card-label">Pending Reviews</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon green"><CheckCircle2 size={24} /></div>
                            <div>
                                <div className="stat-card-value">{globalStats.referralsApproved}</div>
                                <div className="stat-card-label">Referrals Approved</div>
                            </div>
                        </div>
                    </div>

                    {/* PHC Summary Table */}
                    <div className="card">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <Building2 size={18} /> PHC-Wise Summary
                        </h3>
                        {phcSummary.length === 0 ? (
                            <div className="empty-state"><p>No PHC data available yet.</p></div>
                        ) : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr>
                                            <th>PHC / Doctor</th>
                                            <th>Total</th>
                                            <th>High NEWS2</th>
                                            <th>Escalated</th>
                                            <th>Approved</th>
                                            <th>Monitoring</th>
                                            <th>Pending</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {phcSummary.map((p, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{p.name}</td>
                                                <td>{p.totalCases}</td>
                                                <td>
                                                    <span className={`badge ${p.highNEWS2 > 0 ? 'badge-red' : 'badge-green'}`}>
                                                        {p.highNEWS2}
                                                    </span>
                                                </td>
                                                <td>{p.escalated}</td>
                                                <td>{p.approvedReferrals}</td>
                                                <td>{p.underMonitoring}</td>
                                                <td>
                                                    {p.pending > 0 ? (
                                                        <span className="badge badge-yellow">{p.pending}</span>
                                                    ) : (
                                                        <span className="badge badge-green">0</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ───── CLINICAL LOAD MAP (Feature 3) ───── */}
            {activeSection === 'riskmap' && (
                <div className="stagger-children">
                    <div className="card">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                            <MapPin size={18} /> Clinical Load Distribution Visualization
                        </h3>
                        <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
                            PHCs color-coded by percentage of high NEWS2 cases. This is a case load visualization, not an outbreak indicator.
                        </p>

                        {riskIndicators.length === 0 ? (
                            <div className="empty-state"><p>No PHC data available.</p></div>
                        ) : (
                            <>
                                {/* Risk Map Grid */}
                                <div className="risk-map-grid">
                                    {riskIndicators.map((phc, i) => (
                                        <div key={i} className={`risk-map-card risk-map-${phc.level}`}>
                                            <div className={`risk-map-dot ${phc.level}`}></div>
                                            <div className="risk-map-name">{phc.name}</div>
                                            <div className="risk-map-stats">
                                                <span>{phc.total} total</span>
                                                <span className="risk-map-pct">{phc.highRiskPct}% high-risk</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Legend */}
                                <div className="risk-map-legend">
                                    <div className="risk-map-legend-item">
                                        <span className="risk-map-dot green" style={{ width: 10, height: 10 }}></span>
                                        <span>Low load (&lt;20% high NEWS2)</span>
                                    </div>
                                    <div className="risk-map-legend-item">
                                        <span className="risk-map-dot yellow" style={{ width: 10, height: 10 }}></span>
                                        <span>Moderate load (20–40%)</span>
                                    </div>
                                    <div className="risk-map-legend-item">
                                        <span className="risk-map-dot red" style={{ width: 10, height: 10 }}></span>
                                        <span>High load (&gt;40%)</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ───── HIGH NEWS2 MONITORING (Feature 4) ───── */}
            {activeSection === 'highnews2' && (
                <div className="stagger-children" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {/* Per PHC */}
                    <div className="card">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <Building2 size={18} /> High NEWS2 by PHC
                        </h3>
                        {highNEWS2PHC.length === 0 ? (
                            <div className="empty-state"><p>No high NEWS2 cases.</p></div>
                        ) : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr><th>PHC / Doctor</th><th>Count</th></tr>
                                    </thead>
                                    <tbody>
                                        {highNEWS2PHC.map((p, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{p.name}</td>
                                                <td><span className="badge badge-red">{p.count}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Per Village */}
                    <div className="card">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <MapPin size={18} /> High NEWS2 by Village
                        </h3>
                        {highNEWS2Village.length === 0 ? (
                            <div className="empty-state"><p>No high NEWS2 cases.</p></div>
                        ) : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr><th>Village</th><th>Count</th></tr>
                                    </thead>
                                    <tbody>
                                        {highNEWS2Village.map((v, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{v.name}</td>
                                                <td><span className="badge badge-red">{v.count}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ───── RESPONSE TIMES (Feature 5) ───── */}
            {activeSection === 'response' && (
                <div className="stagger-children">
                    {/* Summary Cards */}
                    <div className="stats-grid" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        <div className="stat-card">
                            <div className="stat-card-icon saffron"><Timer size={24} /></div>
                            <div>
                                <div className="stat-card-value">{formatDuration(responseTimes.overallAvgMs)}</div>
                                <div className="stat-card-label">Overall Avg Response</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon green"><Zap size={24} /></div>
                            <div>
                                <div className="stat-card-value">
                                    {responseTimes.fastest ? responseTimes.fastest.name : '—'}
                                </div>
                                <div className="stat-card-label">
                                    Fastest PHC {responseTimes.fastest ? `(${formatDuration(responseTimes.fastest.avgMs)})` : ''}
                                </div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon red"><AlertTriangle size={24} /></div>
                            <div>
                                <div className="stat-card-value">{responseTimes.delayed.length}</div>
                                <div className="stat-card-label">PHCs with Delayed Response</div>
                            </div>
                        </div>
                    </div>

                    {/* PHC Response Table */}
                    <div className="card">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <Clock size={18} /> PHC Response Time Details
                        </h3>
                        {responseTimes.phcs.length === 0 ? (
                            <div className="empty-state"><p>No response time data available yet.</p></div>
                        ) : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr>
                                            <th>PHC / Doctor</th>
                                            <th>Cases Reviewed</th>
                                            <th>Avg Response</th>
                                            <th>Fastest</th>
                                            <th>Slowest</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {responseTimes.phcs.map((p, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{p.name}</td>
                                                <td>{p.casesReviewed}</td>
                                                <td>{formatDuration(p.avgMs)}</td>
                                                <td className="text-muted">{formatDuration(p.minMs)}</td>
                                                <td className="text-muted">{formatDuration(p.maxMs)}</td>
                                                <td>
                                                    {p.avgMs > 3600000 ? (
                                                        <span className="badge badge-red">Delayed</span>
                                                    ) : p.avgMs > 1800000 ? (
                                                        <span className="badge badge-yellow">Moderate</span>
                                                    ) : (
                                                        <span className="badge badge-green">Good</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ───── VILLAGE CASE LOAD (Feature 8) ───── */}
            {activeSection === 'villages' && (
                <div className="stagger-children">
                    <div className="card">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                            <MapPin size={18} /> Village-Level Case Distribution
                        </h3>
                        <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>
                            Operational visibility of case load by village. No predictive claims.
                        </p>
                        {villageCaseLoad.length === 0 ? (
                            <div className="empty-state"><p>No village data available.</p></div>
                        ) : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr>
                                            <th>Village</th>
                                            <th>Total Cases</th>
                                            <th>High-Risk</th>
                                            <th>Monitoring</th>
                                            <th>Pending</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {villageCaseLoad.map((v, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{v.name}</td>
                                                <td>{v.totalCases}</td>
                                                <td>
                                                    <span className={`badge ${v.highRisk > 0 ? 'badge-red' : 'badge-green'}`}>
                                                        {v.highRisk}
                                                    </span>
                                                </td>
                                                <td>{v.monitoring}</td>
                                                <td>
                                                    {v.pending > 0 ? (
                                                        <span className="badge badge-yellow">{v.pending}</span>
                                                    ) : (
                                                        '0'
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
