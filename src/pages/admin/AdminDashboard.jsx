// ============================================================
// Admin Dashboard — Overview, Risk Map, NEWS2, Response, Villages
// Enhanced with Chart.js visualizations
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
    getEscalationVolumeStats,
    getRepeatEscalations,
} from '../../services/adminService';
import { formatDuration } from '../../services/visitService';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
    LayoutDashboard,
    Activity,
    AlertCircle,
    Clock,
    CheckCircle2,
    MapPin,
    Building2,
    ShieldAlert,
    Timer,
    Zap,
    AlertTriangle,
    Eye,
    RefreshCw,
    TrendingUp,
    Download,
} from 'lucide-react';
import { exportVisitsCSV, exportVillageCaseLoadCSV } from '../../utils/csvExport';

// Register Chart.js modules
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler
);

// Shared chart defaults
const CHART_COLORS = {
    saffron: '#FF8800',
    saffronLight: 'rgba(255, 136, 0, 0.15)',
    red: '#DC2626',
    redLight: 'rgba(220, 38, 38, 0.15)',
    green: '#22C55E',
    greenLight: 'rgba(34, 197, 94, 0.15)',
    indigo: '#6366F1',
    indigoLight: 'rgba(99, 102, 241, 0.15)',
    yellow: '#F59E0B',
    yellowLight: 'rgba(245, 158, 11, 0.15)',
    teal: '#14B8A6',
    tealLight: 'rgba(20, 184, 166, 0.15)',
};

const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                font: { family: "'Inter', sans-serif", size: 11 },
                usePointStyle: true,
                padding: 16,
            },
        },
        tooltip: {
            backgroundColor: 'rgba(30, 30, 30, 0.92)',
            titleFont: { family: "'Inter', sans-serif", size: 12, weight: 600 },
            bodyFont: { family: "'Inter', sans-serif", size: 11 },
            padding: 10,
            cornerRadius: 8,
            boxPadding: 4,
        },
    },
};

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
    const escalationStats = useMemo(() => getEscalationVolumeStats(visits), [visits]);
    const repeatEscalations = useMemo(() => getRepeatEscalations(visits), [visits]);

    // ---- Chart Data Builders ----

    // Case Status Distribution (Doughnut)
    const statusDistribution = useMemo(() => {
        const counts = {};
        visits.forEach((v) => {
            const s = v.status || 'Unknown';
            counts[s] = (counts[s] || 0) + 1;
        });
        const labels = Object.keys(counts);
        const data = Object.values(counts);
        const colors = labels.map((l) => {
            if (l.includes('Pending')) return CHART_COLORS.yellow;
            if (l.includes('Approved') || l.includes('Referral')) return CHART_COLORS.green;
            if (l.includes('Monitoring')) return CHART_COLORS.indigo;
            if (l.includes('ASHA') || l.includes('Clarification')) return CHART_COLORS.saffron;
            if (l.includes('Completed') || l.includes('Reviewed')) return CHART_COLORS.teal;
            return '#94A3B8';
        });
        return { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 6 }] };
    }, [visits]);

    // PHC Case Load (Bar)
    const phcBarData = useMemo(() => {
        const top = phcSummary.slice(0, 10);
        return {
            labels: top.map((p) => p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name),
            datasets: [
                { label: 'Total', data: top.map((p) => p.totalCases), backgroundColor: CHART_COLORS.saffron, borderRadius: 6 },
                { label: 'High NEWS2', data: top.map((p) => p.highNEWS2), backgroundColor: CHART_COLORS.red, borderRadius: 6 },
                { label: 'Pending', data: top.map((p) => p.pending), backgroundColor: CHART_COLORS.yellow, borderRadius: 6 },
            ],
        };
    }, [phcSummary]);

    // Risk Indicator Distribution (Doughnut)
    const riskDoughnut = useMemo(() => {
        const greenCount = riskIndicators.filter((r) => r.level === 'green').length;
        const yellowCount = riskIndicators.filter((r) => r.level === 'yellow').length;
        const redCount = riskIndicators.filter((r) => r.level === 'red').length;
        return {
            labels: ['Low Load', 'Moderate Load', 'High Load'],
            datasets: [{
                data: [greenCount, yellowCount, redCount],
                backgroundColor: [CHART_COLORS.green, CHART_COLORS.yellow, CHART_COLORS.red],
                borderWidth: 0,
                hoverOffset: 8,
            }],
        };
    }, [riskIndicators]);

    // High NEWS2 by Village (Horizontal Bar)
    const news2VillageBar = useMemo(() => {
        const top = highNEWS2Village.slice(0, 12);
        return {
            labels: top.map((v) => v.name),
            datasets: [{
                label: 'High NEWS2 Cases',
                data: top.map((v) => v.count),
                backgroundColor: CHART_COLORS.red,
                borderRadius: 6,
            }],
        };
    }, [highNEWS2Village]);

    // High NEWS2 by PHC (Bar)
    const news2PhcBar = useMemo(() => {
        const top = highNEWS2PHC.slice(0, 10);
        return {
            labels: top.map((p) => p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name),
            datasets: [{
                label: 'High NEWS2 Cases',
                data: top.map((p) => p.count),
                backgroundColor: CHART_COLORS.saffron,
                borderRadius: 6,
            }],
        };
    }, [highNEWS2PHC]);

    // Response Time Bar
    const responseBar = useMemo(() => {
        const phcs = responseTimes.phcs.slice(0, 10);
        return {
            labels: phcs.map((p) => p.name.length > 14 ? p.name.slice(0, 14) + '…' : p.name),
            datasets: [{
                label: 'Avg Response (min)',
                data: phcs.map((p) => Math.round(p.avgMs / 60000)),
                backgroundColor: phcs.map((p) =>
                    p.avgMs > 3600000 ? CHART_COLORS.red :
                        p.avgMs > 1800000 ? CHART_COLORS.yellow :
                            CHART_COLORS.green
                ),
                borderRadius: 6,
            }],
        };
    }, [responseTimes]);

    // Village Case Load (Stacked Bar)
    const villageBar = useMemo(() => {
        const top = villageCaseLoad.slice(0, 12);
        return {
            labels: top.map((v) => v.name),
            datasets: [
                { label: 'Low Risk', data: top.map((v) => v.totalCases - v.highRisk), backgroundColor: CHART_COLORS.green, borderRadius: 4 },
                { label: 'High Risk', data: top.map((v) => v.highRisk), backgroundColor: CHART_COLORS.red, borderRadius: 4 },
                { label: 'Monitoring', data: top.map((v) => v.monitoring), backgroundColor: CHART_COLORS.indigo, borderRadius: 4 },
            ],
        };
    }, [villageCaseLoad]);

    const sections = [
        { key: 'overview', label: 'Overview', icon: LayoutDashboard },
        { key: 'escalation', label: 'Escalation Monitor', icon: TrendingUp },
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

            {/* Export Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => exportVisitsCSV(visits)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                    <Download size={14} /> Export All Visits (CSV)
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => exportVillageCaseLoadCSV(villageCaseLoad)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                    <Download size={14} /> Export Village Data (CSV)
                </button>
            </div>

            {/* ───── OVERVIEW SECTION ───── */}
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

                    {/* Charts Row */}
                    <div className="admin-chart-row">
                        {/* Case Status Doughnut */}
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <Activity size={16} /> Case Status Distribution
                            </h3>
                            <div className="admin-chart-container admin-chart-doughnut">
                                {visits.length > 0 ? (
                                    <Doughnut
                                        data={statusDistribution}
                                        options={{
                                            ...chartDefaults,
                                            cutout: '62%',
                                            plugins: {
                                                ...chartDefaults.plugins,
                                                legend: { ...chartDefaults.plugins.legend, position: 'bottom' },
                                            },
                                        }}
                                    />
                                ) : <div className="empty-state"><p>No data</p></div>}
                            </div>
                        </div>

                        {/* PHC Case Load Bar */}
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <Building2 size={16} /> PHC Case Load
                            </h3>
                            <div className="admin-chart-container">
                                {phcSummary.length > 0 ? (
                                    <Bar
                                        data={phcBarData}
                                        options={{
                                            ...chartDefaults,
                                            scales: {
                                                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                                                y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } },
                                            },
                                        }}
                                    />
                                ) : <div className="empty-state"><p>No data</p></div>}
                            </div>
                        </div>
                    </div>

                    {/* PHC Summary Table */}
                    <div className="card" style={{ marginTop: '1.5rem' }}>
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
                                                <td><span className={`badge ${p.highNEWS2 > 0 ? 'badge-red' : 'badge-green'}`}>{p.highNEWS2}</span></td>
                                                <td>{p.escalated}</td>
                                                <td>{p.approvedReferrals}</td>
                                                <td>{p.underMonitoring}</td>
                                                <td>{p.pending > 0 ? <span className="badge badge-yellow">{p.pending}</span> : <span className="badge badge-green">0</span>}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ───── ESCALATION MONITOR ───── */}
            {activeSection === 'escalation' && (
                <div className="stagger-children">
                    {/* Escalation Volume Cards */}
                    <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                        <div className="stat-card">
                            <div className="stat-card-icon saffron"><TrendingUp size={24} /></div>
                            <div>
                                <div className="stat-card-value">{escalationStats.totalEscalations}</div>
                                <div className="stat-card-label">Total Escalations</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon red"><ShieldAlert size={24} /></div>
                            <div>
                                <div className="stat-card-value">{escalationStats.highNEWS2Cases}</div>
                                <div className="stat-card-label">High NEWS2 Cases</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon" style={{ background: escalationStats.slaBreaches > 0 ? 'var(--alert-red-light)' : 'var(--green-light)' }}>
                                <AlertTriangle size={24} color={escalationStats.slaBreaches > 0 ? 'var(--alert-red)' : 'var(--green)'} />
                            </div>
                            <div>
                                <div className="stat-card-value" style={{ color: escalationStats.slaBreaches > 0 ? 'var(--alert-red)' : 'inherit' }}>{escalationStats.slaBreaches}</div>
                                <div className="stat-card-label">SLA Breaches ({'>'}1hr)</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon indigo"><Eye size={24} /></div>
                            <div>
                                <div className="stat-card-value">{escalationStats.monitorReferralRatio}</div>
                                <div className="stat-card-label">Monitor : Referral Ratio</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-saffron)' }}>{escalationStats.pendingCount}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Pending Now</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>{escalationStats.monitoringCount}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Under Monitoring</div>
                        </div>
                        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--green)' }}>{escalationStats.referralCount}</div>
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>Referrals Approved</div>
                        </div>
                    </div>

                    {/* Repeat Escalation Table */}
                    <div className="card">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <RefreshCw size={18} /> Repeat Escalation Patients
                            {repeatEscalations.length > 0 && (
                                <span className="badge badge-red" style={{ fontSize: '0.7rem', marginLeft: '4px' }}>
                                    {repeatEscalations.length} flagged
                                </span>
                            )}
                        </h3>
                        <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>
                            Patients escalated multiple times — may indicate care loop or deteriorating conditions.
                        </p>
                        {repeatEscalations.length === 0 ? (
                            <div className="empty-state"><p>No repeat escalations detected — good sign!</p></div>
                        ) : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr>
                                            <th>Patient</th>
                                            <th>Village</th>
                                            <th>Escalations</th>
                                            <th>Latest Risk</th>
                                            <th>Latest NEWS2</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {repeatEscalations.map((p, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{p.patientName}</td>
                                                <td>{p.village}</td>
                                                <td>
                                                    <span className={`badge ${p.count >= 3 ? 'badge-red' : 'badge-yellow'}`}>
                                                        {p.count}x
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-${p.latestRisk === 'Red' ? 'red' : p.latestRisk === 'Yellow' ? 'yellow' : 'green'}`}>
                                                        {p.latestRisk || 'N/A'}
                                                    </span>
                                                </td>
                                                <td>{p.latestNews2 || '—'}</td>
                                                <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                    {p.count >= 3 ? (
                                                        <span style={{ color: 'var(--alert-red)', fontWeight: 600 }}>Care Loop Alert</span>
                                                    ) : (
                                                        'Flagged'
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

            {/* ───── CLINICAL LOAD MAP ───── */}
            {activeSection === 'riskmap' && (
                <div className="stagger-children">
                    <div className="admin-chart-row">
                        {/* Risk Distribution Doughnut */}
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <ShieldAlert size={16} /> Risk Load Distribution
                            </h3>
                            <div className="admin-chart-container admin-chart-doughnut">
                                {riskIndicators.length > 0 ? (
                                    <Doughnut
                                        data={riskDoughnut}
                                        options={{
                                            ...chartDefaults,
                                            cutout: '62%',
                                            plugins: {
                                                ...chartDefaults.plugins,
                                                legend: { ...chartDefaults.plugins.legend, position: 'bottom' },
                                            },
                                        }}
                                    />
                                ) : <div className="empty-state"><p>No data</p></div>}
                            </div>
                        </div>

                        {/* Risk Map Cards */}
                        <div className="card admin-chart-card" style={{ overflow: 'auto' }}>
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                                <MapPin size={16} /> Clinical Load Visualization
                            </h3>
                            <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>
                                Case load visualization — not an outbreak indicator.
                            </p>
                            {riskIndicators.length === 0 ? (
                                <div className="empty-state"><p>No data</p></div>
                            ) : (
                                <div className="risk-map-grid" style={{ maxHeight: '300px', overflowY: 'auto' }}>
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
                            )}
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="risk-map-legend" style={{ marginTop: '1rem' }}>
                        <div className="risk-map-legend-item">
                            <span className="risk-map-dot green" style={{ width: 10, height: 10 }}></span>
                            <span>Low load (&lt;20%)</span>
                        </div>
                        <div className="risk-map-legend-item">
                            <span className="risk-map-dot yellow" style={{ width: 10, height: 10 }}></span>
                            <span>Moderate (20–40%)</span>
                        </div>
                        <div className="risk-map-legend-item">
                            <span className="risk-map-dot red" style={{ width: 10, height: 10 }}></span>
                            <span>High load (&gt;40%)</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ───── HIGH NEWS2 MONITORING ───── */}
            {activeSection === 'highnews2' && (
                <div className="stagger-children">
                    <div className="admin-chart-row">
                        {/* Per PHC Bar Chart */}
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <Building2 size={16} /> High NEWS2 by PHC
                            </h3>
                            <div className="admin-chart-container">
                                {highNEWS2PHC.length > 0 ? (
                                    <Bar
                                        data={news2PhcBar}
                                        options={{
                                            ...chartDefaults,
                                            indexAxis: 'y',
                                            scales: {
                                                x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } },
                                                y: { grid: { display: false }, ticks: { font: { size: 10 } } },
                                            },
                                            plugins: { ...chartDefaults.plugins, legend: { display: false } },
                                        }}
                                    />
                                ) : <div className="empty-state"><p>No high NEWS2 cases</p></div>}
                            </div>
                        </div>

                        {/* Per Village Bar Chart */}
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <MapPin size={16} /> High NEWS2 by Village
                            </h3>
                            <div className="admin-chart-container">
                                {highNEWS2Village.length > 0 ? (
                                    <Bar
                                        data={news2VillageBar}
                                        options={{
                                            ...chartDefaults,
                                            indexAxis: 'y',
                                            scales: {
                                                x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } },
                                                y: { grid: { display: false }, ticks: { font: { size: 10 } } },
                                            },
                                            plugins: { ...chartDefaults.plugins, legend: { display: false } },
                                        }}
                                    />
                                ) : <div className="empty-state"><p>No high NEWS2 cases</p></div>}
                            </div>
                        </div>
                    </div>

                    {/* Count tables below */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                        <div className="card">
                            <h3 className="card-title" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>PHC Detail Table</h3>
                            {highNEWS2PHC.length === 0 ? <p className="text-muted" style={{ fontSize: '0.8rem' }}>No data</p> : (
                                <div className="queue-table-wrapper">
                                    <table className="queue-table">
                                        <thead><tr><th>PHC / Doctor</th><th>Count</th></tr></thead>
                                        <tbody>
                                            {highNEWS2PHC.map((p, i) => (<tr key={i}><td style={{ fontWeight: 600 }}>{p.name}</td><td><span className="badge badge-red">{p.count}</span></td></tr>))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="card">
                            <h3 className="card-title" style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>Village Detail Table</h3>
                            {highNEWS2Village.length === 0 ? <p className="text-muted" style={{ fontSize: '0.8rem' }}>No data</p> : (
                                <div className="queue-table-wrapper">
                                    <table className="queue-table">
                                        <thead><tr><th>Village</th><th>Count</th></tr></thead>
                                        <tbody>
                                            {highNEWS2Village.map((v, i) => (<tr key={i}><td style={{ fontWeight: 600 }}>{v.name}</td><td><span className="badge badge-red">{v.count}</span></td></tr>))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ───── RESPONSE TIMES ───── */}
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
                                <div className="stat-card-value">{responseTimes.fastest ? responseTimes.fastest.name : '—'}</div>
                                <div className="stat-card-label">{responseTimes.fastest ? `Fastest (${formatDuration(responseTimes.fastest.avgMs)})` : 'Fastest PHC'}</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon red"><AlertTriangle size={24} /></div>
                            <div>
                                <div className="stat-card-value">{responseTimes.delayed.length}</div>
                                <div className="stat-card-label">Delayed Response PHCs</div>
                            </div>
                        </div>
                    </div>

                    {/* Response Time Chart */}
                    <div className="card">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <Clock size={16} /> Average Response Time by PHC (minutes)
                        </h3>
                        <div className="admin-chart-container" style={{ height: '300px' }}>
                            {responseTimes.phcs.length > 0 ? (
                                <Bar
                                    data={responseBar}
                                    options={{
                                        ...chartDefaults,
                                        scales: {
                                            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                                            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, title: { display: true, text: 'Minutes', font: { size: 11 } } },
                                        },
                                        plugins: { ...chartDefaults.plugins, legend: { display: false } },
                                    }}
                                />
                            ) : <div className="empty-state"><p>No response data yet</p></div>}
                        </div>
                    </div>

                    {/* Response Table */}
                    <div className="card" style={{ marginTop: '1rem' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <Clock size={16} /> Response Time Details
                        </h3>
                        {responseTimes.phcs.length === 0 ? (
                            <div className="empty-state"><p>No data</p></div>
                        ) : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr><th>PHC / Doctor</th><th>Reviewed</th><th>Avg</th><th>Fastest</th><th>Slowest</th><th>Status</th></tr>
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
                                                    {p.avgMs > 3600000 ? <span className="badge badge-red">Delayed</span> :
                                                        p.avgMs > 1800000 ? <span className="badge badge-yellow">Moderate</span> :
                                                            <span className="badge badge-green">Good</span>}
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

            {/* ───── VILLAGE CASE LOAD ───── */}
            {activeSection === 'villages' && (
                <div className="stagger-children">
                    {/* Stacked Bar Chart */}
                    <div className="card">
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
                            <MapPin size={16} /> Village Case Distribution
                        </h3>
                        <p className="text-muted" style={{ fontSize: '0.75rem', marginBottom: '1rem' }}>
                            Operational visibility — no predictive claims.
                        </p>
                        <div className="admin-chart-container" style={{ height: '320px' }}>
                            {villageCaseLoad.length > 0 ? (
                                <Bar
                                    data={villageBar}
                                    options={{
                                        ...chartDefaults,
                                        scales: {
                                            x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
                                            y: { stacked: true, beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
                                        },
                                    }}
                                />
                            ) : <div className="empty-state"><p>No village data</p></div>}
                        </div>
                    </div>

                    {/* Village Table */}
                    <div className="card" style={{ marginTop: '1rem' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <MapPin size={16} /> Village Detail Table
                        </h3>
                        {villageCaseLoad.length === 0 ? (
                            <div className="empty-state"><p>No data</p></div>
                        ) : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead><tr><th>Village</th><th>Total</th><th>High-Risk</th><th>Monitoring</th><th>Pending</th></tr></thead>
                                    <tbody>
                                        {villageCaseLoad.map((v, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{v.name}</td>
                                                <td>{v.totalCases}</td>
                                                <td><span className={`badge ${v.highRisk > 0 ? 'badge-red' : 'badge-green'}`}>{v.highRisk}</span></td>
                                                <td>{v.monitoring}</td>
                                                <td>{v.pending > 0 ? <span className="badge badge-yellow">{v.pending}</span> : '0'}</td>
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
