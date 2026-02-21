// ============================================================
// PHC Dashboard — Smart Case Queue + Village Overview + ASHA Stats
// Enhanced with Chart.js visualizations
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getAllVisits,
    sortByPriority,
    calculateASHAStats,
    getUniqueVillages,
    getUniqueASHANames,
    timeSince,
    formatDuration,
} from '../../services/visitService';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
    Clock,
    ShieldAlert,
    CheckCircle2,
    Eye,
    MessageCircleQuestion,
    Filter,
    MapPin,
    Users,
    BarChart3,
    ChevronDown,
    AlertCircle,
    Activity,
    ArrowUpDown,
    Timer,
    RefreshCw,
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const COLORS = {
    saffron: '#FF8800',
    red: '#DC2626',
    green: '#22C55E',
    indigo: '#6366F1',
    yellow: '#F59E0B',
    teal: '#14B8A6',
};

const chartBase = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { font: { family: "'Inter', sans-serif", size: 11 }, usePointStyle: true, padding: 14 } },
        tooltip: { backgroundColor: 'rgba(30,30,30,0.92)', cornerRadius: 8, padding: 10, bodyFont: { size: 11 }, titleFont: { size: 12, weight: 600 } },
    },
};

export default function PHCDashboard() {
    const [allVisits, setAllVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [activeSection, setActiveSection] = useState('queue'); // queue | villages | asha

    // Filters
    const [filterVillage, setFilterVillage] = useState('');
    const [filterASHA, setFilterASHA] = useState('');
    const [filterRisk, setFilterRisk] = useState('');

    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const all = await getAllVisits();
            setAllVisits(all);
        } catch (err) {
            console.error('Error loading visits:', err);
        } finally {
            setLoading(false);
        }
    };

    // Derived data
    const pendingVisits = useMemo(
        () => sortByPriority(allVisits.filter(v => v.status === 'Pending PHC Review')),
        [allVisits]
    );
    const monitoringVisits = useMemo(
        () => allVisits.filter(v => v.status === 'Under Monitoring'),
        [allVisits]
    );
    const clarificationVisits = useMemo(
        () => allVisits.filter(v => v.status === 'Awaiting ASHA Response'),
        [allVisits]
    );
    const reviewedVisits = useMemo(
        () => allVisits.filter(v =>
            v.status === 'Reviewed' || v.status === 'Referral Approved'
        ),
        [allVisits]
    );

    const villages = useMemo(() => getUniqueVillages(allVisits), [allVisits]);
    const ashaNames = useMemo(() => getUniqueASHANames(allVisits), [allVisits]);
    const ashaStats = useMemo(() => calculateASHAStats(allVisits), [allVisits]);

    // Average response time compute
    const avgResponseTime = useMemo(() => {
        const reviewed = allVisits.filter(v => v.responseTimeMs && v.responseTimeMs > 0);
        if (reviewed.length === 0) return null;
        const total = reviewed.reduce((acc, v) => acc + v.responseTimeMs, 0);
        return total / reviewed.length;
    }, [allVisits]);

    // Repeat escalation patient IDs
    const repeatPatients = useMemo(() => {
        const counts = {};
        allVisits.filter(v => v.status === 'Pending PHC Review').forEach(v => {
            const pid = v.patientId || v.patientDocId;
            if (pid) counts[pid] = (counts[pid] || 0) + 1;
        });
        return new Set(Object.entries(counts).filter(([, c]) => c > 1).map(([id]) => id));
    }, [allVisits]);

    // Filtered queue
    const getFilteredVisits = (visits) => {
        return visits.filter(v => {
            if (filterVillage && v.patientVillage !== filterVillage) return false;
            if (filterASHA && (v.createdByName || v.createdBy) !== filterASHA) return false;
            if (filterRisk && v.riskLevel !== filterRisk) return false;
            return true;
        });
    };

    // Village stats
    const villageStats = useMemo(() => {
        const stats = {};
        allVisits.forEach(v => {
            const village = v.patientVillage || 'Unknown';
            if (!stats[village]) {
                stats[village] = { village, total: 0, highRisk: 0, pending: 0, monitoring: 0 };
            }
            stats[village].total++;
            if (v.riskLevel === 'Red') stats[village].highRisk++;
            if (v.status === 'Pending PHC Review') stats[village].pending++;
            if (v.status === 'Under Monitoring') stats[village].monitoring++;
        });
        return Object.values(stats).sort((a, b) => b.pending - a.pending || b.highRisk - a.highRisk);
    }, [allVisits]);

    // ──── CHART DATA ────

    // Risk level distribution (doughnut for queue section)
    const riskDoughnut = useMemo(() => {
        const counts = { Red: 0, Yellow: 0, Green: 0 };
        allVisits.forEach(v => { if (counts[v.riskLevel] !== undefined) counts[v.riskLevel]++; });
        return {
            labels: ['High Risk (Red)', 'Moderate (Yellow)', 'Low Risk (Green)'],
            datasets: [{
                data: [counts.Red, counts.Yellow, counts.Green],
                backgroundColor: [COLORS.red, COLORS.yellow, COLORS.green],
                borderWidth: 0,
                hoverOffset: 6,
            }],
        };
    }, [allVisits]);

    // Status distribution (doughnut)
    const statusDoughnut = useMemo(() => {
        return {
            labels: ['Pending', 'Monitoring', 'Awaiting Response', 'Reviewed'],
            datasets: [{
                data: [pendingVisits.length, monitoringVisits.length, clarificationVisits.length, reviewedVisits.length],
                backgroundColor: [COLORS.saffron, COLORS.indigo, COLORS.yellow, COLORS.green],
                borderWidth: 0,
                hoverOffset: 6,
            }],
        };
    }, [pendingVisits, monitoringVisits, clarificationVisits, reviewedVisits]);

    // Village bar chart
    const villageBarData = useMemo(() => {
        const top = villageStats.slice(0, 10);
        return {
            labels: top.map(v => v.village),
            datasets: [
                { label: 'Total', data: top.map(v => v.total), backgroundColor: COLORS.saffron, borderRadius: 6 },
                { label: 'High-Risk', data: top.map(v => v.highRisk), backgroundColor: COLORS.red, borderRadius: 6 },
                { label: 'Pending', data: top.map(v => v.pending), backgroundColor: COLORS.yellow, borderRadius: 6 },
            ],
        };
    }, [villageStats]);

    // ASHA bar chart
    const ashaBarData = useMemo(() => ({
        labels: ashaStats.map(a => a.name.length > 12 ? a.name.slice(0, 12) + '…' : a.name),
        datasets: [
            { label: 'Submitted', data: ashaStats.map(a => a.totalCases), backgroundColor: COLORS.saffron, borderRadius: 6 },
            { label: 'Reviewed', data: ashaStats.map(a => a.reviewedCases), backgroundColor: COLORS.green, borderRadius: 6 },
        ],
    }), [ashaStats]);

    // ASHA approval rate bar
    const ashaApprovalBar = useMemo(() => ({
        labels: ashaStats.map(a => a.name.length > 12 ? a.name.slice(0, 12) + '…' : a.name),
        datasets: [{
            label: 'Approval Rate %',
            data: ashaStats.map(a => a.approvalRate),
            backgroundColor: ashaStats.map(a =>
                a.approvalRate >= 70 ? COLORS.green :
                    a.approvalRate >= 40 ? COLORS.yellow : COLORS.red
            ),
            borderRadius: 6,
        }],
    }), [ashaStats]);

    const getRiskClass = (level) => {
        if (level === 'Red') return 'red';
        if (level === 'Yellow') return 'yellow';
        return 'green';
    };

    // Check if monitoring has expired
    const isMonitoringExpired = (visit) => {
        if (!visit.monitoringStartedAt || !visit.monitoringPeriod) return false;
        const started = visit.monitoringStartedAt.toDate
            ? visit.monitoringStartedAt.toDate()
            : new Date(visit.monitoringStartedAt);
        const periodHours = parseInt(visit.monitoringPeriod) || 24;
        return Date.now() - started.getTime() > periodHours * 3600000;
    };

    if (loading) {
        return (
            <div className="loading-spinner">
                <div>
                    <div className="spinner"></div>
                    <div className="loading-text">Loading dashboard...</div>
                </div>
            </div>
        );
    }

    const tabVisits = {
        pending: getFilteredVisits(pendingVisits),
        monitoring: getFilteredVisits(monitoringVisits),
        clarification: getFilteredVisits(clarificationVisits),
        reviewed: getFilteredVisits(reviewedVisits),
    };

    return (
        <div>
            {/* Stat Cards */}
            <div className="stats-grid stagger-children" style={{ marginBottom: '1.5rem' }}>
                <div className="stat-card">
                    <div className="stat-card-icon saffron"><Clock size={24} /></div>
                    <div>
                        <div className="stat-card-value">{pendingVisits.length}</div>
                        <div className="stat-card-label">Pending Reviews</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon red"><ShieldAlert size={24} /></div>
                    <div>
                        <div className="stat-card-value">{pendingVisits.filter(v => v.emergencyFlag).length}</div>
                        <div className="stat-card-label">Emergency Cases</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon indigo"><Eye size={24} /></div>
                    <div>
                        <div className="stat-card-value">{monitoringVisits.length}</div>
                        <div className="stat-card-label">Under Monitoring</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon green"><CheckCircle2 size={24} /></div>
                    <div>
                        <div className="stat-card-value">{reviewedVisits.length}</div>
                        <div className="stat-card-label">Reviewed</div>
                    </div>
                </div>
            </div>

            {/* Response Time & Repeat Indicator Row */}
            <div className="stats-grid stagger-children" style={{ marginBottom: '1.25rem', gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="stat-card">
                    <div className="stat-card-icon saffron"><Timer size={24} /></div>
                    <div>
                        <div className="stat-card-value">{avgResponseTime ? formatDuration(avgResponseTime) : '—'}</div>
                        <div className="stat-card-label">Avg Response Time</div>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card-icon" style={{ background: repeatPatients.size > 0 ? 'var(--alert-red-light)' : 'var(--green-light)' }}>
                        <RefreshCw size={24} color={repeatPatients.size > 0 ? 'var(--alert-red)' : 'var(--green)'} />
                    </div>
                    <div>
                        <div className="stat-card-value">{repeatPatients.size}</div>
                        <div className="stat-card-label">Repeat Escalation Patients</div>
                    </div>
                </div>
            </div>

            {/* Section Switcher */}
            <div className="admin-section-switcher" style={{ marginBottom: '1.25rem' }}>
                {[
                    { key: 'queue', label: 'Case Queue', icon: ArrowUpDown },
                    { key: 'villages', label: 'Village Overview', icon: MapPin },
                    { key: 'asha', label: 'ASHA Stats', icon: BarChart3 },
                ].map(s => {
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

            {/* =============== CASE QUEUE SECTION =============== */}
            {activeSection === 'queue' && (
                <div className="stagger-children">
                    {/* Quick Visual Charts */}
                    <div className="admin-chart-row" style={{ marginBottom: '1.25rem' }}>
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <Activity size={16} /> Risk Distribution
                            </h3>
                            <div className="admin-chart-container admin-chart-doughnut">
                                {allVisits.length > 0 ? (
                                    <Doughnut data={riskDoughnut} options={{ ...chartBase, cutout: '62%', plugins: { ...chartBase.plugins, legend: { ...chartBase.plugins.legend, position: 'bottom' } } }} />
                                ) : <div className="empty-state"><p>No data</p></div>}
                            </div>
                        </div>
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <BarChart3 size={16} /> Status Overview
                            </h3>
                            <div className="admin-chart-container admin-chart-doughnut">
                                {allVisits.length > 0 ? (
                                    <Doughnut data={statusDoughnut} options={{ ...chartBase, cutout: '62%', plugins: { ...chartBase.plugins, legend: { ...chartBase.plugins.legend, position: 'bottom' } } }} />
                                ) : <div className="empty-state"><p>No data</p></div>}
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="filter-bar card" style={{ padding: '0.75rem 1rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                            <Filter size={14} /> Filters:
                        </span>
                        <select
                            className="form-input"
                            value={filterVillage}
                            onChange={e => setFilterVillage(e.target.value)}
                            style={{ width: 'auto', padding: '6px 30px 6px 10px', fontSize: '0.8rem' }}
                        >
                            <option value="">All Villages</option>
                            {villages.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <select
                            className="form-input"
                            value={filterASHA}
                            onChange={e => setFilterASHA(e.target.value)}
                            style={{ width: 'auto', padding: '6px 30px 6px 10px', fontSize: '0.8rem' }}
                        >
                            <option value="">All ASHA Workers</option>
                            {ashaNames.map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <select
                            className="form-input"
                            value={filterRisk}
                            onChange={e => setFilterRisk(e.target.value)}
                            style={{ width: 'auto', padding: '6px 30px 6px 10px', fontSize: '0.8rem' }}
                        >
                            <option value="">All Risk Levels</option>
                            <option value="Red">Red (High)</option>
                            <option value="Yellow">Yellow (Medium)</option>
                            <option value="Green">Green (Low)</option>
                        </select>
                        {(filterVillage || filterASHA || filterRisk) && (
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => { setFilterVillage(''); setFilterASHA(''); setFilterRisk(''); }}
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {/* Queue Tabs */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        {[
                            { key: 'pending', label: 'Pending', count: tabVisits.pending.length, icon: <Clock size={13} /> },
                            { key: 'monitoring', label: 'Monitoring', count: tabVisits.monitoring.length, icon: <Eye size={13} /> },
                            { key: 'clarification', label: 'Awaiting Response', count: tabVisits.clarification.length, icon: <MessageCircleQuestion size={13} /> },
                            { key: 'reviewed', label: 'Reviewed', count: tabVisits.reviewed.length, icon: <CheckCircle2 size={13} /> },
                        ].map(t => (
                            <button
                                key={t.key}
                                className={`btn btn-sm ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setActiveTab(t.key)}
                            >
                                {t.icon} {t.label} ({t.count})
                            </button>
                        ))}
                    </div>

                    {/* Queue Table */}
                    {tabVisits[activeTab].length === 0 ? (
                        <div className="card">
                            <div className="empty-state">
                                <div className="empty-icon"><CheckCircle2 size={48} strokeWidth={1} /></div>
                                <p>
                                    {activeTab === 'pending' && 'No pending reviews — all caught up!'}
                                    {activeTab === 'monitoring' && 'No cases under monitoring.'}
                                    {activeTab === 'clarification' && 'No pending clarifications.'}
                                    {activeTab === 'reviewed' && 'No reviewed cases yet.'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '4px', padding: 0 }}></th>
                                            <th>Patient</th>
                                            <th>Age</th>
                                            <th>Village</th>
                                            <th>NEWS2</th>
                                            <th>{activeTab === 'monitoring' ? 'Period' : 'Waiting'}</th>
                                            <th>ASHA</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tabVisits[activeTab].map((visit) => (
                                            <tr
                                                key={visit.id}
                                                className="queue-row"
                                                onClick={() => navigate(`/phc/review/${visit.id}`)}
                                            >
                                                <td className={`queue-risk-bar risk-${getRiskClass(visit.riskLevel)}`}></td>
                                                <td>
                                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                        {visit.patientName || 'Unknown'}
                                                        {visit.emergencyFlag && (
                                                            <span className="emergency-tag"><ShieldAlert size={12} /> EMR</span>
                                                        )}
                                                    </div>
                                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                        {visit.patientId}
                                                    </div>
                                                </td>
                                                <td>{visit.patientAge || '—'}</td>
                                                <td>{visit.patientVillage || '—'}</td>
                                                <td>
                                                    <span className={`badge badge-${getRiskClass(visit.riskLevel)}`}>
                                                        {visit.news2Score ?? '—'}
                                                    </span>
                                                </td>
                                                <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                    {activeTab === 'monitoring' ? (
                                                        <span>
                                                            {visit.monitoringPeriod || '—'}
                                                            {isMonitoringExpired(visit) && (
                                                                <span className="expired-tag"><AlertCircle size={11} /> Expired</span>
                                                            )}
                                                        </span>
                                                    ) : (() => {
                                                        const reqAt = visit.reviewRequestedAt || visit.createdAt;
                                                        if (!reqAt) return '—';
                                                        const ts = reqAt?.toDate?.() || new Date(reqAt);
                                                        const diffMs = Date.now() - ts.getTime();
                                                        const diffMin = Math.round(diffMs / 60000);
                                                        const color = diffMin < 15 ? 'var(--green)' : diffMin < 60 ? '#F59E0B' : 'var(--alert-red)';
                                                        return (
                                                            <span style={{ color, fontWeight: 600 }}>
                                                                {diffMin < 60 ? `${diffMin}m` : `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="text-muted" style={{ fontSize: '0.8rem' }}>
                                                    {visit.createdByName || '—'}
                                                </td>
                                                <td>
                                                    <span className={`status-badge ${visit.status === 'Pending PHC Review' ? 'pending' :
                                                        visit.status === 'Under Monitoring' ? 'monitoring' :
                                                            visit.status === 'Awaiting ASHA Response' ? 'clarification' :
                                                                'reviewed'
                                                        }`}>
                                                        {visit.status === 'Pending PHC Review' ? 'Pending' :
                                                            visit.status === 'Under Monitoring' ? 'Monitoring' :
                                                                visit.status === 'Awaiting ASHA Response' ? 'Awaiting' :
                                                                    visit.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* =============== VILLAGE OVERVIEW SECTION =============== */}
            {activeSection === 'villages' && (
                <div className="stagger-children">
                    {/* Village Bar Chart */}
                    <div className="card" style={{ marginBottom: '1rem' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <MapPin size={16} /> Village Case Distribution
                        </h3>
                        <div className="admin-chart-container" style={{ height: '280px' }}>
                            {villageStats.length > 0 ? (
                                <Bar
                                    data={villageBarData}
                                    options={{
                                        ...chartBase,
                                        scales: {
                                            x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                                            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
                                        },
                                    }}
                                />
                            ) : <div className="empty-state"><p>No village data</p></div>}
                        </div>
                    </div>

                    {/* Village Table */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <MapPin size={18} /> Village-Wise Patient Overview
                            </h3>
                        </div>
                        {villageStats.length === 0 ? (
                            <div className="empty-state">
                                <p>No village data available yet.</p>
                            </div>
                        ) : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr>
                                            <th>Village</th>
                                            <th>Total Cases</th>
                                            <th>High-Risk</th>
                                            <th>Pending</th>
                                            <th>Monitoring</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {villageStats.map((vs) => (
                                            <tr key={vs.village} className="queue-row" onClick={() => { setActiveSection('queue'); setFilterVillage(vs.village); }}>
                                                <td style={{ fontWeight: 600 }}>{vs.village}</td>
                                                <td>{vs.total}</td>
                                                <td>
                                                    {vs.highRisk > 0 ? (
                                                        <span className="badge badge-red">{vs.highRisk}</span>
                                                    ) : (
                                                        <span className="text-muted">0</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {vs.pending > 0 ? (
                                                        <span className="badge badge-yellow">{vs.pending}</span>
                                                    ) : (
                                                        <span className="text-muted">0</span>
                                                    )}
                                                </td>
                                                <td>{vs.monitoring}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* =============== ASHA STATS SECTION =============== */}
            {activeSection === 'asha' && (
                <div className="stagger-children">
                    {/* ASHA Charts */}
                    <div className="admin-chart-row" style={{ marginBottom: '1rem' }}>
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <Users size={16} /> Cases per ASHA Worker
                            </h3>
                            <div className="admin-chart-container">
                                {ashaStats.length > 0 ? (
                                    <Bar data={ashaBarData} options={{
                                        ...chartBase,
                                        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } } },
                                    }} />
                                ) : <div className="empty-state"><p>No data</p></div>}
                            </div>
                        </div>
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <CheckCircle2 size={16} /> Referral Approval Rate
                            </h3>
                            <div className="admin-chart-container">
                                {ashaStats.length > 0 ? (
                                    <Bar data={ashaApprovalBar} options={{
                                        ...chartBase,
                                        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, title: { display: true, text: '%', font: { size: 11 } } } },
                                        plugins: { ...chartBase.plugins, legend: { display: false } },
                                    }} />
                                ) : <div className="empty-state"><p>No data</p></div>}
                            </div>
                        </div>
                    </div>

                    {/* ASHA Detail Table */}
                    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)' }}>
                            <h3 className="card-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={18} /> ASHA Performance Overview
                            </h3>
                            <p className="text-muted" style={{ marginTop: '4px', fontSize: '0.75rem' }}>Operational reporting — not for ranking</p>
                        </div>
                        {ashaStats.length === 0 ? (
                            <div className="empty-state">
                                <p>No ASHA data available yet.</p>
                            </div>
                        ) : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr>
                                            <th>ASHA Worker</th>
                                            <th>Cases Submitted</th>
                                            <th>Reviewed</th>
                                            <th>Avg Response Time</th>
                                            <th>Referral Approval</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ashaStats.map((s) => (
                                            <tr key={s.name} className="queue-row" onClick={() => { setActiveSection('queue'); setFilterASHA(s.name); }}>
                                                <td style={{ fontWeight: 600 }}>{s.name}</td>
                                                <td>{s.totalCases}</td>
                                                <td>{s.reviewedCases}</td>
                                                <td className="text-muted">{formatDuration(s.avgResponseTimeMs)}</td>
                                                <td>
                                                    {s.approvalRate > 0 ? (
                                                        <div className="perf-bar-container">
                                                            <div className={`perf-bar ${s.approvalRate >= 70 ? 'perf-bar-green' : s.approvalRate >= 40 ? 'perf-bar-yellow' : 'perf-bar-red'}`} style={{ width: `${Math.min(s.approvalRate, 100)}%` }}></div>
                                                            <span className="perf-bar-label">{s.approvalRate}%</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-muted">—</span>
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
