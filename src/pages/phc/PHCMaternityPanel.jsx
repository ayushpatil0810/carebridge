// ============================================================
// PHC Maternity Panel — Maternal Oversight for PHC Doctors
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import {
    getAllMaternityRecords,
    getGestationalAge,
    getTrimester,
    daysUntilEDD,
    HIGH_RISK_FACTORS,
    ANC_SCHEDULE,
    PNC_SCHEDULE,
    MATERNAL_DANGER_SIGNS,
} from '../../services/maternityService';
import {
    Baby,
    Heart,
    AlertCircle,
    Shield,
    Calendar,
    Activity,
    Search,
    X,
    ChevronDown,
    ChevronUp,
    User,
    MapPin,
    Clock,
    Stethoscope,
    CheckCircle2,
    AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PHCMaternityPanel() {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRisk, setFilterRisk] = useState('');
    const [filterVillage, setFilterVillage] = useState('');
    const [filterStatus, setFilterStatus] = useState('active'); // active | all
    const [sortBy, setSortBy] = useState('risk'); // risk | edd | name
    const [expandedId, setExpandedId] = useState(null);
    const { t } = useTranslation();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const all = await getAllMaternityRecords();
            setRecords(all);
        } catch (err) {
            console.error('Error loading maternity records:', err);
            setError('Failed to load maternity data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Derived data ──
    const activeRecords = useMemo(() => {
        let filtered = records;

        // Status filter
        if (filterStatus === 'active') {
            filtered = filtered.filter(r => r.status === 'antenatal' || r.status === 'postnatal');
        }

        // Search filter
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(r =>
                r.patientName?.toLowerCase().includes(term) ||
                r.patientVillage?.toLowerCase().includes(term)
            );
        }

        // Risk filter
        if (filterRisk) {
            filtered = filtered.filter(r => {
                const latestRisk = getLatestRiskLevel(r);
                return latestRisk === filterRisk;
            });
        }

        // Village filter
        if (filterVillage) {
            filtered = filtered.filter(r => r.patientVillage === filterVillage);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'risk') {
                const riskOrder = { HIGH: 0, MODERATE: 1, LOW: 2, '': 3 };
                const ra = riskOrder[getLatestRiskLevel(a)] ?? 3;
                const rb = riskOrder[getLatestRiskLevel(b)] ?? 3;
                if (ra !== rb) return ra - rb;
            }
            if (sortBy === 'edd') {
                const ea = getEddMs(a);
                const eb = getEddMs(b);
                return ea - eb; // Nearest EDD first
            }
            if (sortBy === 'name') {
                return (a.patientName || '').localeCompare(b.patientName || '');
            }
            return 0;
        });

        return filtered;
    }, [records, searchTerm, filterRisk, filterVillage, filterStatus, sortBy]);

    // ── Stats ──
    const stats = useMemo(() => {
        const active = records.filter(r => r.status === 'antenatal' || r.status === 'postnatal');
        const antenatal = records.filter(r => r.status === 'antenatal');
        const postnatal = records.filter(r => r.status === 'postnatal');
        const highRisk = antenatal.filter(r => {
            const risk = getLatestRiskLevel(r);
            return risk === 'HIGH' || (r.highRiskFactors?.length > 0);
        });
        const overdueAnc = antenatal.filter(r => {
            const { expected, actual } = getAncCompliance(r);
            return actual < expected;
        });

        return {
            total: active.length,
            antenatal: antenatal.length,
            postnatal: postnatal.length,
            highRisk: highRisk.length,
            overdueAnc: overdueAnc.length,
        };
    }, [records]);

    const villages = useMemo(() => {
        const set = new Set(records.map(r => r.patientVillage).filter(Boolean));
        return [...set].sort();
    }, [records]);

    // ── Helper Functions ──
    function getLatestRiskLevel(rec) {
        if (!rec.ancVisits?.length) return '';
        const latest = [...rec.ancVisits].sort((a, b) => (b.visitNumber || 0) - (a.visitNumber || 0))[0];
        return latest?.riskLevel || '';
    }

    function getEddMs(rec) {
        const edd = rec.eddDate?.toDate?.() ? rec.eddDate.toDate() : new Date(rec.eddDate);
        return edd.getTime() || Infinity;
    }

    function getRecordHelpers(rec) {
        try {
            const lmpDate = rec.lmpDate?.toDate?.() ? rec.lmpDate.toDate() : new Date(rec.lmpDate);
            const eddDate = rec.eddDate?.toDate?.() ? rec.eddDate.toDate() : new Date(rec.eddDate);
            const ga = getGestationalAge(lmpDate);
            const trimester = getTrimester(ga.weeks);
            const daysLeft = daysUntilEDD(eddDate);
            return { lmpDate, eddDate, ga, trimester, daysLeft };
        } catch {
            return { ga: { weeks: 0, days: 0 }, trimester: 1, daysLeft: 0 };
        }
    }

    function getAncCompliance(rec) {
        const h = getRecordHelpers(rec);
        const weeks = h.ga?.weeks || 0;
        let expected = 0;
        if (weeks >= 12) expected = 1;
        if (weeks >= 20) expected = 2;
        if (weeks >= 28) expected = 3;
        if (weeks >= 36) expected = 4;
        const actual = rec.ancVisits?.length || 0;
        return { expected, actual };
    }

    function getRiskBadge(level) {
        if (level === 'HIGH') return { bg: 'rgba(220,38,38,0.1)', color: '#DC2626', icon: '🚨', label: 'HIGH' };
        if (level === 'MODERATE') return { bg: 'rgba(245,158,11,0.1)', color: '#D97706', icon: '🟡', label: 'MODERATE' };
        if (level === 'LOW') return { bg: 'rgba(16,185,129,0.1)', color: '#16A34A', icon: '🟢', label: 'LOW' };
        return { bg: 'rgba(100,100,100,0.06)', color: 'var(--text-muted)', icon: '—', label: 'No data' };
    }

    // ── Loading / Error ──
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '1100px' }}>
            {/* Header */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
                <div className="card-header">
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Baby size={22} /> {t('maternity.maternalHealthOverview')}
                    </h2>
                </div>
                <p className="text-muted" style={{ fontSize: '0.82rem' }}>
                    All registered pregnancies and postnatal cases across ASHA workers.
                </p>
            </div>

            {error && (
                <div className="warning-banner" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* ── Stat Cards ── */}
            <div className="phc-mat-stats">
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                        <Heart size={20} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{stats.antenatal}</div>
                        <div className="phc-mat-stat-label">{t('maternity.antenatal')}</div>
                    </div>
                </div>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(220,38,38,0.1)', color: '#DC2626' }}>
                        <AlertTriangle size={20} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{stats.highRisk}</div>
                        <div className="phc-mat-stat-label">{t('maternity.highRisk')}</div>
                    </div>
                </div>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#16A34A' }}>
                        <Baby size={20} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{stats.postnatal}</div>
                        <div className="phc-mat-stat-label">{t('maternity.postnatal')}</div>
                    </div>
                </div>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
                        <Clock size={20} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{stats.overdueAnc}</div>
                        <div className="phc-mat-stat-label">{t('maternity.ancOverdue')}</div>
                    </div>
                </div>
            </div>

            {/* ── Filters ── */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <div className="phc-mat-filters">
                    <div style={{ position: 'relative', flex: '1 1 200px' }}>
                        <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        <input className="form-input" placeholder="Search patient name or village..."
                            value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: '2rem', fontSize: '0.82rem' }} />
                        {searchTerm && (
                            <button className="btn btn-ghost" onClick={() => setSearchTerm('')}
                                style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', padding: '2px' }}>
                                <X size={12} />
                            </button>
                        )}
                    </div>
                    <select className="form-input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        style={{ flex: '0 0 130px', fontSize: '0.82rem' }}>
                        <option value="active">Active Only</option>
                        <option value="all">All Records</option>
                    </select>
                    <select className="form-input" value={filterRisk} onChange={e => setFilterRisk(e.target.value)}
                        style={{ flex: '0 0 130px', fontSize: '0.82rem' }}>
                        <option value="">All Risks</option>
                        <option value="HIGH">🚨 High</option>
                        <option value="MODERATE">🟡 Moderate</option>
                        <option value="LOW">🟢 Low</option>
                    </select>
                    <select className="form-input" value={filterVillage} onChange={e => setFilterVillage(e.target.value)}
                        style={{ flex: '0 0 140px', fontSize: '0.82rem' }}>
                        <option value="">All Villages</option>
                        {villages.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select className="form-input" value={sortBy} onChange={e => setSortBy(e.target.value)}
                        style={{ flex: '0 0 130px', fontSize: '0.82rem' }}>
                        <option value="risk">Sort: Risk ↓</option>
                        <option value="edd">Sort: EDD ↑</option>
                        <option value="name">Sort: Name</option>
                    </select>
                </div>
            </div>

            {/* ── High-Risk Alert Section ── */}
            {stats.highRisk > 0 && (
                <div className="phc-mat-alert-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
                        <AlertCircle size={16} color="var(--alert-red)" />
                        <strong style={{ color: 'var(--alert-red)', fontSize: '0.85rem' }}>
                            {stats.highRisk} High-Risk Case{stats.highRisk !== 1 ? 's' : ''} Requiring Attention
                        </strong>
                    </div>
                    <div className="phc-mat-alert-list">
                        {records
                            .filter(r => r.status === 'antenatal' && (getLatestRiskLevel(r) === 'HIGH' || r.highRiskFactors?.length > 0))
                            .slice(0, 5)
                            .map(r => {
                                const h = getRecordHelpers(r);
                                const latestVisit = r.ancVisits?.length ? [...r.ancVisits].sort((a, b) => (b.visitNumber || 0) - (a.visitNumber || 0))[0] : null;
                                return (
                                    <div key={r.id} className="phc-mat-alert-item" onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span className="badge badge-red" style={{ fontSize: '0.7rem' }}>🚨 HIGH</span>
                                            <strong style={{ fontSize: '0.82rem' }}>{r.patientName}</strong>
                                            <span className="text-muted" style={{ fontSize: '0.72rem' }}>
                                                {r.patientVillage} • {h.ga?.weeks || 0}w
                                            </span>
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                                            {latestVisit?.riskReasons?.slice(0, 2).map((r, i) => <span key={i}>• {r} </span>)}
                                            {r.highRiskFactors?.slice(0, 2).map(k => {
                                                const f = HIGH_RISK_FACTORS.find(h => h.key === k);
                                                return <span key={k}>• {f?.label || k} </span>;
                                            })}
                                        </div>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            )}

            {/* ── Patient Table ── */}
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Activity size={16} /> Patient Registry
                        <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>
                            ({activeRecords.length} record{activeRecords.length !== 1 ? 's' : ''})
                        </span>
                    </h3>
                </div>

                {activeRecords.length === 0 ? (
                    <div className="empty-state">
                        <p>No maternity records found</p>
                    </div>
                ) : (
                    <div className="phc-mat-table">
                        {activeRecords.map(rec => {
                            const h = getRecordHelpers(rec);
                            const riskLevel = getLatestRiskLevel(rec);
                            const riskBadge = getRiskBadge(riskLevel);
                            const compliance = getAncCompliance(rec);
                            const isExpanded = expandedId === rec.id;
                            const latestVisit = rec.ancVisits?.length
                                ? [...rec.ancVisits].sort((a, b) => (b.visitNumber || 0) - (a.visitNumber || 0))[0]
                                : null;

                            return (
                                <div key={rec.id} className={`phc-mat-row ${riskLevel === 'HIGH' ? 'high-risk' : ''}`}>
                                    {/* Main row */}
                                    <div className="phc-mat-row-main" onClick={() => setExpandedId(isExpanded ? null : rec.id)}>
                                        <div className="phc-mat-row-left">
                                            <div className="patient-avatar" style={{ width: '36px', height: '36px', fontSize: '0.85rem', flexShrink: 0 }}>
                                                {rec.patientName?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{rec.patientName}</div>
                                                <div className="text-muted" style={{ fontSize: '0.72rem', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <span><MapPin size={10} /> {rec.patientVillage}</span>
                                                    <span>{rec.patientAge} yrs</span>
                                                    {rec.patientContact && <span>📞 {rec.patientContact}</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="phc-mat-row-center">
                                            {rec.status === 'antenatal' ? (
                                                <>
                                                    <span className="phc-mat-cell">
                                                        <span className="text-muted" style={{ fontSize: '0.65rem' }}>GA</span>
                                                        <strong>{h.ga?.weeks || 0}w {h.ga?.days || 0}d</strong>
                                                    </span>
                                                    <span className="phc-mat-cell">
                                                        <span className="text-muted" style={{ fontSize: '0.65rem' }}>Tri</span>
                                                        <strong>{h.trimester}</strong>
                                                    </span>
                                                    <span className="phc-mat-cell">
                                                        <span className="text-muted" style={{ fontSize: '0.65rem' }}>EDD</span>
                                                        <strong>{h.eddDate?.toLocaleDateString?.('en-IN', { day: 'numeric', month: 'short' }) || '—'}</strong>
                                                    </span>
                                                    <span className="phc-mat-cell">
                                                        <span className="text-muted" style={{ fontSize: '0.65rem' }}>ANC</span>
                                                        <strong style={{ color: compliance.actual < compliance.expected ? 'var(--alert-red)' : 'var(--green)' }}>
                                                            {compliance.actual}/{compliance.expected}
                                                        </strong>
                                                    </span>
                                                </>
                                            ) : rec.status === 'postnatal' ? (
                                                <span className="badge badge-green" style={{ fontSize: '0.72rem' }}>
                                                    <Baby size={12} /> Postnatal
                                                </span>
                                            ) : (
                                                <span className="badge" style={{ fontSize: '0.72rem', background: 'rgba(100,100,100,0.08)' }}>
                                                    {rec.status}
                                                </span>
                                            )}
                                        </div>

                                        <div className="phc-mat-row-right">
                                            <span className="phc-mat-risk-pill" style={{ background: riskBadge.bg, color: riskBadge.color }}>
                                                {riskBadge.icon} {riskBadge.label}
                                            </span>
                                            {rec.highRiskFactors?.length > 0 && (
                                                <Shield size={14} color="var(--alert-red)" />
                                            )}
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </div>
                                    </div>

                                    {/* Expanded detail */}
                                    {isExpanded && (
                                        <div className="phc-mat-detail">
                                            {/* Registration info */}
                                            <div className="phc-mat-detail-section">
                                                <div className="phc-mat-detail-title">
                                                    <Heart size={13} /> Registration Info
                                                </div>
                                                <div className="phc-mat-detail-grid">
                                                    <div><span className="text-muted">Blood Group</span><span>{rec.bloodGroup || '—'}</span></div>
                                                    <div><span className="text-muted">Gravida/Para</span><span>G{rec.gravida} P{rec.para}</span></div>
                                                    <div><span className="text-muted">LMP</span><span>{h.lmpDate?.toLocaleDateString?.('en-IN') || '—'}</span></div>
                                                    <div><span className="text-muted">EDD</span><span>{h.eddDate?.toLocaleDateString?.('en-IN') || '—'}</span></div>
                                                    <div><span className="text-muted">Days to EDD</span><span>{h.daysLeft > 0 ? h.daysLeft : 'Past due'}</span></div>
                                                    <div><span className="text-muted">Registered by</span><span>{rec.createdBy || '—'}</span></div>
                                                </div>
                                                {rec.highRiskFactors?.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                                                        <Shield size={12} color="var(--alert-red)" />
                                                        {rec.highRiskFactors.map(k => {
                                                            const f = HIGH_RISK_FACTORS.find(h => h.key === k);
                                                            return <span key={k} className="badge badge-red" style={{ fontSize: '0.65rem' }}>{f?.label || k}</span>;
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* ANC Visits */}
                                            {rec.ancVisits?.length > 0 && (
                                                <div className="phc-mat-detail-section">
                                                    <div className="phc-mat-detail-title">
                                                        <Stethoscope size={13} /> ANC Visits ({rec.ancVisits.length})
                                                    </div>
                                                    {[...rec.ancVisits].sort((a, b) => (b.visitNumber || 0) - (a.visitNumber || 0)).map((v, i) => {
                                                        const vRisk = getRiskBadge(v.riskLevel || '');
                                                        return (
                                                            <div key={i} className="phc-mat-visit-row">
                                                                <div className="phc-mat-visit-header">
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                        <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>ANC {v.visitNumber}</span>
                                                                        {v.riskLevel && (
                                                                            <span className="phc-mat-risk-pill" style={{ background: vRisk.bg, color: vRisk.color, fontSize: '0.62rem' }}>
                                                                                {vRisk.icon} {vRisk.label}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                                        {new Date(v.date).toLocaleDateString('en-IN')} • Wk {v.gestationalWeeks}
                                                                    </span>
                                                                </div>
                                                                <div className="phc-mat-detail-grid" style={{ fontSize: '0.72rem' }}>
                                                                    {v.bp && <div><span className="text-muted">BP</span><span>{v.bp}</span></div>}
                                                                    {v.vitals?.pulse && <div><span className="text-muted">Pulse</span><span>{v.vitals.pulse}</span></div>}
                                                                    {v.vitals?.temperature && <div><span className="text-muted">Temp</span><span>{v.vitals.temperature}°C</span></div>}
                                                                    {v.vitals?.spo2 && <div><span className="text-muted">SpO₂</span><span>{v.vitals.spo2}%</span></div>}
                                                                    {v.hemoglobin && <div><span className="text-muted">Hb</span><span>{v.hemoglobin}</span></div>}
                                                                    {v.weight && <div><span className="text-muted">Weight</span><span>{v.weight} kg</span></div>}
                                                                    {v.fetalHeartRate && <div><span className="text-muted">FHR</span><span>{v.fetalHeartRate}</span></div>}
                                                                </div>
                                                                {v.dangerSigns?.length > 0 && (
                                                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '4px' }}>
                                                                        <AlertCircle size={11} color="var(--alert-red)" />
                                                                        {v.dangerSigns.map((ds, idx) => {
                                                                            const sign = MATERNAL_DANGER_SIGNS.find(s => s.key === ds);
                                                                            return <span key={idx} className="badge badge-red" style={{ fontSize: '0.6rem' }}>{sign?.label || ds}</span>;
                                                                        })}
                                                                    </div>
                                                                )}
                                                                {v.riskReasons?.length > 0 && (
                                                                    <div style={{ marginTop: '4px', fontSize: '0.68rem', color: 'var(--text-muted)', paddingLeft: '0.5rem', borderLeft: `2px solid ${v.riskLevel === 'HIGH' ? 'var(--alert-red)' : 'var(--accent-saffron)'}` }}>
                                                                        {v.riskReasons.map((r, idx) => <div key={idx}>• {r}</div>)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Delivery Outcome */}
                                            {rec.deliveryOutcome && (
                                                <div className="phc-mat-detail-section">
                                                    <div className="phc-mat-detail-title">
                                                        <Baby size={13} /> Delivery Outcome
                                                    </div>
                                                    <div className="phc-mat-detail-grid">
                                                        <div><span className="text-muted">Date</span><span>{new Date(rec.deliveryOutcome.date).toLocaleDateString('en-IN')}</span></div>
                                                        <div><span className="text-muted">Type</span><span>{rec.deliveryOutcome.type}</span></div>
                                                        <div><span className="text-muted">Place</span><span>{rec.deliveryOutcome.place}</span></div>
                                                        <div><span className="text-muted">Baby</span><span>{rec.deliveryOutcome.babyGender} • {rec.deliveryOutcome.babyWeight} kg</span></div>
                                                        {rec.deliveryOutcome.apgarScore && <div><span className="text-muted">Apgar</span><span>{rec.deliveryOutcome.apgarScore}</span></div>}
                                                        {rec.deliveryOutcome.complications && <div><span className="text-muted">Complications</span><span style={{ color: 'var(--alert-red)' }}>{rec.deliveryOutcome.complications}</span></div>}
                                                    </div>
                                                </div>
                                            )}

                                            {/* PNC Visits */}
                                            {rec.pncVisits?.length > 0 && (
                                                <div className="phc-mat-detail-section">
                                                    <div className="phc-mat-detail-title">
                                                        <CheckCircle2 size={13} /> PNC Visits ({rec.pncVisits.length})
                                                    </div>
                                                    {rec.pncVisits.map((v, i) => (
                                                        <div key={i} className="phc-mat-visit-row">
                                                            <div className="phc-mat-visit-header">
                                                                <span className="badge" style={{ fontSize: '0.65rem', background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>{v.visitType}</span>
                                                                <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                                    {new Date(v.date).toLocaleDateString('en-IN')}
                                                                </span>
                                                            </div>
                                                            <div className="phc-mat-detail-grid" style={{ fontSize: '0.72rem' }}>
                                                                {v.motherBP && <div><span className="text-muted">Mother BP</span><span>{v.motherBP}</span></div>}
                                                                {v.motherTemp && <div><span className="text-muted">Mother Temp</span><span>{v.motherTemp}°C</span></div>}
                                                                {v.breastfeeding && <div><span className="text-muted">Breastfeeding</span><span>{v.breastfeeding}</span></div>}
                                                                {v.woundHealing && <div><span className="text-muted">Wound</span><span>{v.woundHealing}</span></div>}
                                                                {v.babyWeight && <div><span className="text-muted">Baby Weight</span><span>{v.babyWeight} kg</span></div>}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
