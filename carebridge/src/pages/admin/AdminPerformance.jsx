// ============================================================
// Admin Performance — ASHA + PHC metrics with Chart.js
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { getAllVisits, formatDuration } from '../../services/visitService';
import {
    getASHAPerformanceMetrics,
    getPHCPerformanceMetrics,
} from '../../services/adminService';
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
    Users,
    Building2,
    CheckCircle2,
    Activity,
    Clock,
    Target,
    BarChart3,
} from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const COLORS = {
    saffron: '#FF8800',
    red: '#DC2626',
    green: '#22C55E',
    indigo: '#6366F1',
    yellow: '#F59E0B',
    teal: '#14B8A6',
    pink: '#EC4899',
};

const chartBase = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { font: { family: "'Inter', sans-serif", size: 11 }, usePointStyle: true, padding: 14 } },
        tooltip: { backgroundColor: 'rgba(30,30,30,0.92)', cornerRadius: 8, padding: 10, bodyFont: { size: 11 }, titleFont: { size: 12, weight: 600 } },
    },
};

export default function AdminPerformance() {
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('asha');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try { setVisits(await getAllVisits()); }
        catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const ashaMetrics = useMemo(() => getASHAPerformanceMetrics(visits), [visits]);
    const phcMetrics = useMemo(() => getPHCPerformanceMetrics(visits), [visits]);

    // ---- ASHA Charts ----
    const ashaCasesBar = useMemo(() => ({
        labels: ashaMetrics.map(a => a.name.length > 12 ? a.name.slice(0, 12) + '…' : a.name),
        datasets: [
            { label: 'Total Cases', data: ashaMetrics.map(a => a.totalCases), backgroundColor: COLORS.saffron, borderRadius: 6 },
            { label: 'High-Risk', data: ashaMetrics.map(a => a.highRiskIdentified), backgroundColor: COLORS.red, borderRadius: 6 },
            { label: 'Approved', data: ashaMetrics.map(a => a.approvedReferrals), backgroundColor: COLORS.green, borderRadius: 6 },
        ],
    }), [ashaMetrics]);

    const ashaAccuracyBar = useMemo(() => ({
        labels: ashaMetrics.map(a => a.name.length > 12 ? a.name.slice(0, 12) + '…' : a.name),
        datasets: [{
            label: 'Escalation Accuracy %',
            data: ashaMetrics.map(a => a.escalationAccuracy),
            backgroundColor: ashaMetrics.map(a =>
                a.escalationAccuracy >= 70 ? COLORS.green :
                    a.escalationAccuracy >= 40 ? COLORS.yellow : COLORS.red
            ),
            borderRadius: 6,
        }],
    }), [ashaMetrics]);

    // ---- PHC Charts ----
    const phcDecisionDoughnut = useMemo(() => {
        const totals = { referrals: 0, monitoring: 0, clarifications: 0, other: 0 };
        phcMetrics.forEach(p => {
            totals.referrals += p.approvedReferrals;
            totals.monitoring += p.monitoring;
            totals.clarifications += p.clarifications;
            totals.other += p.totalReviewed - p.approvedReferrals - p.monitoring - p.clarifications;
        });
        return {
            labels: ['Referrals Approved', 'Under Monitoring', 'Clarifications', 'Other'],
            datasets: [{
                data: [totals.referrals, totals.monitoring, totals.clarifications, Math.max(0, totals.other)],
                backgroundColor: [COLORS.green, COLORS.indigo, COLORS.saffron, '#94A3B8'],
                borderWidth: 0,
                hoverOffset: 6,
            }],
        };
    }, [phcMetrics]);

    const phcResponseBar = useMemo(() => ({
        labels: phcMetrics.map(p => p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name),
        datasets: [{
            label: 'Avg Response (min)',
            data: phcMetrics.map(p => p.avgResponseMs ? Math.round(p.avgResponseMs / 60000) : 0),
            backgroundColor: phcMetrics.map(p =>
                !p.avgResponseMs ? '#94A3B8' :
                    p.avgResponseMs > 3600000 ? COLORS.red :
                        p.avgResponseMs > 1800000 ? COLORS.yellow :
                            COLORS.green
            ),
            borderRadius: 6,
        }],
    }), [phcMetrics]);

    const phcClosureBar = useMemo(() => ({
        labels: phcMetrics.map(p => p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name),
        datasets: [
            { label: 'Closure Rate %', data: phcMetrics.map(p => p.closureRate), backgroundColor: COLORS.teal, borderRadius: 6 },
            { label: 'Referral Rate %', data: phcMetrics.map(p => p.referralRate), backgroundColor: COLORS.green, borderRadius: 6 },
            { label: 'Monitoring Rate %', data: phcMetrics.map(p => p.monitoringRate), backgroundColor: COLORS.indigo, borderRadius: 6 },
        ],
    }), [phcMetrics]);

    if (loading) {
        return (
            <div className="loading-spinner">
                <div><div className="spinner"></div><div className="loading-text">Loading performance data...</div></div>
            </div>
        );
    }

    return (
        <div>
            {/* Tab Switcher */}
            <div className="admin-section-switcher" style={{ marginBottom: '1.5rem' }}>
                <button className={`admin-section-btn ${activeTab === 'asha' ? 'active' : ''}`} onClick={() => setActiveTab('asha')}>
                    <Users size={16} /> ASHA Workers
                </button>
                <button className={`admin-section-btn ${activeTab === 'phc' ? 'active' : ''}`} onClick={() => setActiveTab('phc')}>
                    <Building2 size={16} /> PHC Doctors
                </button>
            </div>

            {/* ───── ASHA METRICS ───── */}
            {activeTab === 'asha' && (
                <div className="stagger-children">
                    {/* Summary Cards */}
                    <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
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
                                <div className="stat-card-value">{ashaMetrics.reduce((s, a) => s + a.totalCases, 0)}</div>
                                <div className="stat-card-label">Total Cases</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon green"><Target size={24} /></div>
                            <div>
                                <div className="stat-card-value">{ashaMetrics.length > 0 ? Math.round(ashaMetrics.reduce((s, a) => s + a.escalationAccuracy, 0) / ashaMetrics.length) : 0}%</div>
                                <div className="stat-card-label">Avg Escalation Accuracy</div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="admin-chart-row">
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <BarChart3 size={16} /> Cases by ASHA Worker
                            </h3>
                            <div className="admin-chart-container">
                                {ashaMetrics.length > 0 ? (
                                    <Bar data={ashaCasesBar} options={{ ...chartBase, scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } } } }} />
                                ) : <div className="empty-state"><p>No data</p></div>}
                            </div>
                        </div>
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <Target size={16} /> Escalation Accuracy by ASHA
                            </h3>
                            <div className="admin-chart-container">
                                {ashaMetrics.length > 0 ? (
                                    <Bar data={ashaAccuracyBar} options={{
                                        ...chartBase,
                                        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, title: { display: true, text: '%', font: { size: 11 } } } },
                                        plugins: { ...chartBase.plugins, legend: { display: false } },
                                    }} />
                                ) : <div className="empty-state"><p>No data</p></div>}
                            </div>
                        </div>
                    </div>

                    {/* Detail Table */}
                    <div className="card" style={{ marginTop: '1rem' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <Users size={16} /> ASHA Worker Detail
                        </h3>
                        {ashaMetrics.length === 0 ? <div className="empty-state"><p>No data</p></div> : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr><th>ASHA Worker</th><th>Cases</th><th>High-Risk</th><th>Rate</th><th>Escalated</th><th>Approved</th><th>Accuracy</th></tr>
                                    </thead>
                                    <tbody>
                                        {ashaMetrics.map((a, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{a.name}</td>
                                                <td>{a.totalCases}</td>
                                                <td><span className={`badge ${a.highRiskIdentified > 0 ? 'badge-red' : 'badge-green'}`}>{a.highRiskIdentified}</span></td>
                                                <td>{a.highRiskRate}%</td>
                                                <td>{a.escalated}</td>
                                                <td>{a.approvedReferrals}</td>
                                                <td>
                                                    <div className="perf-bar-container">
                                                        <div className={`perf-bar ${a.escalationAccuracy >= 70 ? 'perf-bar-green' : a.escalationAccuracy >= 40 ? 'perf-bar-yellow' : 'perf-bar-red'}`} style={{ width: `${Math.min(a.escalationAccuracy, 100)}%` }}></div>
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
                </div>
            )}

            {/* ───── PHC METRICS ───── */}
            {activeTab === 'phc' && (
                <div className="stagger-children">
                    {/* Summary Cards */}
                    <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
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
                                <div className="stat-card-value">{phcMetrics.reduce((s, p) => s + p.totalReviewed, 0)}</div>
                                <div className="stat-card-label">Total Reviews</div>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-icon green"><CheckCircle2 size={24} /></div>
                            <div>
                                <div className="stat-card-value">{phcMetrics.length > 0 ? Math.round(phcMetrics.reduce((s, p) => s + p.closureRate, 0) / phcMetrics.length) : 0}%</div>
                                <div className="stat-card-label">Avg Closure Rate</div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="admin-chart-row">
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <Activity size={16} /> Decision Pattern Distribution
                            </h3>
                            <div className="admin-chart-container admin-chart-doughnut">
                                {phcMetrics.length > 0 ? (
                                    <Doughnut data={phcDecisionDoughnut} options={{ ...chartBase, cutout: '62%', plugins: { ...chartBase.plugins, legend: { ...chartBase.plugins.legend, position: 'bottom' } } }} />
                                ) : <div className="empty-state"><p>No data</p></div>}
                            </div>
                        </div>
                        <div className="card admin-chart-card">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                                <Clock size={16} /> Response Time by PHC (min)
                            </h3>
                            <div className="admin-chart-container">
                                {phcMetrics.length > 0 ? (
                                    <Bar data={phcResponseBar} options={{
                                        ...chartBase,
                                        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, title: { display: true, text: 'Minutes', font: { size: 11 } } } },
                                        plugins: { ...chartBase.plugins, legend: { display: false } },
                                    }} />
                                ) : <div className="empty-state"><p>No data</p></div>}
                            </div>
                        </div>
                    </div>

                    {/* Closure & Rates Chart */}
                    <div className="card" style={{ marginTop: '1rem' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <BarChart3 size={16} /> PHC Decision & Closure Rates (%)
                        </h3>
                        <div className="admin-chart-container" style={{ height: '280px' }}>
                            {phcMetrics.length > 0 ? (
                                <Bar data={phcClosureBar} options={{
                                    ...chartBase,
                                    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.04)' } } },
                                }} />
                            ) : <div className="empty-state"><p>No data</p></div>}
                        </div>
                    </div>

                    {/* Detail Table */}
                    <div className="card" style={{ marginTop: '1rem' }}>
                        <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                            <Building2 size={16} /> PHC Doctor Detail
                        </h3>
                        {phcMetrics.length === 0 ? <div className="empty-state"><p>No data</p></div> : (
                            <div className="queue-table-wrapper">
                                <table className="queue-table">
                                    <thead>
                                        <tr><th>PHC Doctor</th><th>Reviewed</th><th>Avg Response</th><th>Referral %</th><th>Monitor %</th><th>Clarif.</th><th>Closure %</th></tr>
                                    </thead>
                                    <tbody>
                                        {phcMetrics.map((p, i) => (
                                            <tr key={i}>
                                                <td style={{ fontWeight: 600 }}>{p.name}</td>
                                                <td>{p.totalReviewed}</td>
                                                <td>{p.avgResponseMs ? <span className={p.avgResponseMs > 3600000 ? 'text-danger' : ''}>{formatDuration(p.avgResponseMs)}</span> : '—'}</td>
                                                <td>{p.referralRate}%</td>
                                                <td>{p.monitoringRate}%</td>
                                                <td>{p.clarifications}</td>
                                                <td>
                                                    <div className="perf-bar-container">
                                                        <div className={`perf-bar ${p.closureRate >= 70 ? 'perf-bar-green' : p.closureRate >= 40 ? 'perf-bar-yellow' : 'perf-bar-red'}`} style={{ width: `${Math.min(p.closureRate, 100)}%` }}></div>
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
                </div>
            )}
        </div>
    );
}
