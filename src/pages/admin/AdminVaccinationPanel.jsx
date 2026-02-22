// ============================================================
// Admin Vaccination Panel — Governance Monitoring (Read-Only)
// Aggregated vaccination coverage, ASHA performance, alerts
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { getAdminVaccinationSummary } from '../../services/vaccinationService';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
    Syringe,
    ShieldCheck,
    AlertTriangle,
    Clock,
    Users,
    Download,
    Search,
    X,
    TrendingUp,
    Baby,
    UserCheck,
    Activity,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

// Register Chart.js modules
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, Filler);

const CHART_OPTS = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { display: false },
        tooltip: {
            backgroundColor: 'rgba(30,30,30,0.92)',
            titleFont: { family: "'Inter', sans-serif", size: 12, weight: 600 },
            bodyFont: { family: "'Inter', sans-serif", size: 11 },
            padding: 10,
            cornerRadius: 8,
        },
    },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { size: 10 } } },
    },
};

export default function AdminVaccinationPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterVillage, setFilterVillage] = useState('all');
    const [showAllAsha, setShowAllAsha] = useState(false);
    const [sortCol, setSortCol] = useState('overdue');
    const [sortDir, setSortDir] = useState('desc');

    useEffect(() => { loadData(); }, []);

    const loadData = async () => {
        try {
            const result = await getAdminVaccinationSummary();
            setData(result);
        } catch (err) {
            console.error('Error loading admin vaccination data:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Sorting ──
    const sortedVillages = useMemo(() => {
        if (!data) return [];
        let list = data.villageStats;
        if (filterVillage !== 'all') list = list.filter(v => v.village === filterVillage);
        if (searchTerm) {
            const t = searchTerm.toLowerCase();
            list = list.filter(v => v.village.toLowerCase().includes(t));
        }
        return [...list].sort((a, b) => {
            const av = a[sortCol] ?? 0, bv = b[sortCol] ?? 0;
            if (typeof av === 'string') return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
            return sortDir === 'asc' ? av - bv : bv - av;
        });
    }, [data, filterVillage, searchTerm, sortCol, sortDir]);

    const toggleSort = (col) => {
        if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortCol(col); setSortDir('desc'); }
    };
    const SortIcon = ({ col }) => sortCol === col ?
        (sortDir === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />) : null;

    // ── Monthly trend chart data ──
    const trendChart = useMemo(() => {
        if (!data || !data.monthlyTrend.length) return null;
        const labels = data.monthlyTrend.map(t => {
            const [y, m] = t.month.split('-');
            return new Date(y, m - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        });
        return {
            labels,
            datasets: [{
                label: 'Vaccinations Completed',
                data: data.monthlyTrend.map(t => t.count),
                borderColor: '#22C55E',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointBackgroundColor: '#22C55E',
            }],
        };
    }, [data]);

    // ── Village bar chart ──
    const villageChart = useMemo(() => {
        if (!data) return null;
        const top = data.villageStats.slice(0, 10);
        return {
            labels: top.map(v => v.village),
            datasets: [
                { label: 'Due', data: top.map(v => v.due), backgroundColor: 'rgba(245,158,11,0.7)', borderRadius: 4 },
                { label: 'Overdue', data: top.map(v => v.overdue), backgroundColor: 'rgba(220,38,38,0.7)', borderRadius: 4 },
                { label: 'Completed', data: top.map(v => v.completed), backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 4 },
            ],
        };
    }, [data]);

    // ── CSV Export ──
    const handleExportCSV = () => {
        if (!data) return;
        const rows = [['Village', 'Eligible Children', 'Fully Vaccinated', 'Vaccinated %', 'Due', 'Due %', 'Overdue', 'Overdue %', 'TT Coverage %', 'Avg Overdue Days']];
        data.villageStats.forEach(v => {
            rows.push([
                v.village, v.totalEligible, v.fullyVaccinated, v.fullyVaccinatedPct + '%',
                v.due, v.duePct + '%', v.overdue, v.overduePct + '%',
                v.ttCoveragePct != null ? v.ttCoveragePct + '%' : 'N/A',
                v.avgOverdueDays,
            ]);
        });
        rows.push([]);
        rows.push(['ASHA Worker', 'Total Scheduled', 'Completed', 'Completion Rate']);
        data.ashaStats.forEach(a => {
            rows.push([a.name, a.total, a.completed, a.completionRate + '%']);
        });
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin_vaccination_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="loading-spinner" style={{ minHeight: '50vh' }}>
                <div><div className="spinner"></div><div className="loading-text">Loading governance data...</div></div>
            </div>
        );
    }

    if (!data) return <div className="empty-state"><p>Unable to load vaccination data.</p></div>;

    const { totals, alerts, ashaStats } = data;

    return (
        <div>
            {/* ── Summary Stat Cards ── */}
            <div className="phc-mat-stats" style={{ marginBottom: '1.25rem' }}>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                        <Baby size={22} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{totals.totalEligible}</div>
                        <div className="phc-mat-stat-label">Eligible Children</div>
                    </div>
                </div>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
                        <Clock size={22} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{totals.due}</div>
                        <div className="phc-mat-stat-label">Total Due</div>
                    </div>
                </div>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{totals.overdue}</div>
                        <div className="phc-mat-stat-label">Total Overdue</div>
                    </div>
                </div>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#16A34A' }}>
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{totals.coveragePct}%</div>
                        <div className="phc-mat-stat-label">Coverage</div>
                    </div>
                </div>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(255,136,0,0.1)', color: '#FF8800' }}>
                        <Activity size={22} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{totals.avgOverdueDays}d</div>
                        <div className="phc-mat-stat-label">Avg Overdue</div>
                    </div>
                </div>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(168,85,247,0.1)', color: '#A855F7' }}>
                        <Syringe size={22} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{totals.ttCoveragePct}%</div>
                        <div className="phc-mat-stat-label">TT Coverage</div>
                    </div>
                </div>
            </div>

            {/* ── Performance Alerts ── */}
            {alerts.length > 0 && (
                <div className="phc-mat-alert-section" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem', fontWeight: 700, color: '#DC2626', fontSize: '0.88rem' }}>
                        <AlertTriangle size={16} />
                        Vaccination Performance Alert ({alerts.length} area{alerts.length > 1 ? 's' : ''})
                    </div>
                    <div className="phc-mat-alert-list">
                        {alerts.map(v => (
                            <div key={v.village} className="phc-mat-alert-item">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v.village}</span>
                                        <span className="text-muted" style={{ fontSize: '0.72rem', marginLeft: '6px' }}>
                                            {v.overdue} overdue of {v.totalVax} total
                                        </span>
                                    </div>
                                    <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>
                                        {v.overduePct}% overdue
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Toolbar ── */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: '1 1 200px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="form-input" placeholder="Search village..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '2rem', fontSize: '0.82rem' }} />
                        {searchTerm && (
                            <button className="btn btn-ghost" onClick={() => setSearchTerm('')}
                                style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', padding: '2px' }}>
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <select className="form-input" value={filterVillage} onChange={e => setFilterVillage(e.target.value)}
                        style={{ flex: '0 1 180px', fontSize: '0.82rem' }}>
                        <option value="all">All Villages</option>
                        {data.villageStats.map(v => <option key={v.village} value={v.village}>{v.village}</option>)}
                    </select>
                    <button className="btn btn-secondary" style={{ fontSize: '0.78rem', flexShrink: 0 }} onClick={handleExportCSV}>
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* ── Charts Row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                {trendChart && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <TrendingUp size={16} /> Monthly Vaccinations
                            </h3>
                        </div>
                        <div style={{ height: '220px', padding: '0.25rem' }}>
                            <Line data={trendChart} options={CHART_OPTS} />
                        </div>
                    </div>
                )}
                {villageChart && (
                    <div className="card">
                        <div className="card-header">
                            <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Syringe size={16} /> Village-wise Status
                            </h3>
                        </div>
                        <div style={{ height: '220px', padding: '0.25rem' }}>
                            <Bar data={villageChart} options={{ ...CHART_OPTS, plugins: { ...CHART_OPTS.plugins, legend: { display: true, position: 'top', labels: { boxWidth: 10, font: { size: 10 } } } }, scales: { ...CHART_OPTS.scales, x: { ...CHART_OPTS.scales.x, stacked: true }, y: { ...CHART_OPTS.scales.y, stacked: true } } }} />
                        </div>
                    </div>
                )}
            </div>

            {/* ── Village Coverage Table ── */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
                <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Users size={18} /> Village-wise Coverage
                    </h3>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>{sortedVillages.length} area{sortedVillages.length !== 1 ? 's' : ''}</span>
                </div>
                {sortedVillages.length === 0 ? (
                    <div className="empty-state"><p>No data found</p></div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-vax-table">
                            <thead>
                                <tr>
                                    <th onClick={() => toggleSort('village')} style={{ cursor: 'pointer' }}>Village <SortIcon col="village" /></th>
                                    <th onClick={() => toggleSort('totalEligible')} style={{ cursor: 'pointer', textAlign: 'center' }}>Children <SortIcon col="totalEligible" /></th>
                                    <th onClick={() => toggleSort('fullyVaccinatedPct')} style={{ cursor: 'pointer', textAlign: 'center' }}>Vaccinated % <SortIcon col="fullyVaccinatedPct" /></th>
                                    <th onClick={() => toggleSort('due')} style={{ cursor: 'pointer', textAlign: 'center' }}>Due <SortIcon col="due" /></th>
                                    <th onClick={() => toggleSort('overdue')} style={{ cursor: 'pointer', textAlign: 'center' }}>Overdue <SortIcon col="overdue" /></th>
                                    <th onClick={() => toggleSort('overduePct')} style={{ cursor: 'pointer', textAlign: 'center' }}>Overdue % <SortIcon col="overduePct" /></th>
                                    <th onClick={() => toggleSort('ttCoveragePct')} style={{ cursor: 'pointer', textAlign: 'center' }}>TT % <SortIcon col="ttCoveragePct" /></th>
                                    <th onClick={() => toggleSort('avgOverdueDays')} style={{ cursor: 'pointer', textAlign: 'center' }}>Avg Late <SortIcon col="avgOverdueDays" /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedVillages.map(v => (
                                    <tr key={v.village} className={v.overduePct > 20 ? 'alert-row' : ''}>
                                        <td style={{ fontWeight: 600 }}>
                                            {v.village}
                                            {v.overduePct > 20 && <AlertTriangle size={12} style={{ color: '#DC2626', marginLeft: '4px', verticalAlign: 'middle' }} />}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{v.totalEligible}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${v.fullyVaccinatedPct >= 80 ? 'badge-green' : v.fullyVaccinatedPct >= 50 ? 'badge-yellow' : 'badge-red'}`}
                                                style={{ fontSize: '0.68rem' }}>
                                                {v.fullyVaccinatedPct}%
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', color: '#D97706', fontWeight: v.due > 0 ? 600 : 400 }}>{v.due}</td>
                                        <td style={{ textAlign: 'center', color: v.overdue > 0 ? '#DC2626' : 'inherit', fontWeight: v.overdue > 0 ? 700 : 400 }}>{v.overdue}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${v.overduePct > 20 ? 'badge-red' : v.overduePct > 10 ? 'badge-yellow' : 'badge-green'}`}
                                                style={{ fontSize: '0.68rem' }}>
                                                {v.overduePct}%
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>{v.ttCoveragePct != null ? v.ttCoveragePct + '%' : '—'}</td>
                                        <td style={{ textAlign: 'center', color: v.avgOverdueDays > 14 ? '#DC2626' : 'inherit' }}>{v.avgOverdueDays}d</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── ASHA Performance ── */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <UserCheck size={18} /> ASHA-wise Completion Rate
                    </h3>
                    <span className="text-muted" style={{ fontSize: '0.72rem' }}>{ashaStats.length} workers</span>
                </div>
                {ashaStats.length === 0 ? (
                    <div className="empty-state"><p>No ASHA data available</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {(showAllAsha ? ashaStats : ashaStats.slice(0, 8)).map(a => (
                            <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border-light)' }}>
                                <span style={{ flex: '1 1 120px', fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                                <div style={{ flex: '2 1 200px', background: 'rgba(0,0,0,0.04)', borderRadius: '10px', height: '12px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${a.completionRate}%`, height: '100%', borderRadius: '10px',
                                        background: a.completionRate >= 80 ? '#22C55E' : a.completionRate >= 50 ? '#F59E0B' : '#DC2626',
                                        transition: 'width 0.5s ease',
                                    }} />
                                </div>
                                <span style={{
                                    flex: '0 0 55px', textAlign: 'right', fontWeight: 700, fontSize: '0.78rem',
                                    color: a.completionRate >= 80 ? '#22C55E' : a.completionRate >= 50 ? '#F59E0B' : '#DC2626'
                                }}>
                                    {a.completionRate}%
                                </span>
                                <span className="text-muted" style={{ flex: '0 0 60px', textAlign: 'right', fontSize: '0.68rem' }}>
                                    {a.completed}/{a.total}
                                </span>
                            </div>
                        ))}
                        {ashaStats.length > 8 && (
                            <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem' }}
                                onClick={() => setShowAllAsha(!showAllAsha)}>
                                {showAllAsha ? 'Show Less' : `Show All (${ashaStats.length})`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
