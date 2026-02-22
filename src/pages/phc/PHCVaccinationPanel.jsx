// ============================================================
// PHC Vaccination Panel — Read-only Vaccination Oversight
// PHC doctors view only; no data entry
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import {
    getVillageVaccinationSummary,
} from '../../services/vaccinationService';
import {
    Syringe,
    ShieldCheck,
    AlertTriangle,
    Clock,
    ChevronDown,
    ChevronUp,
    Download,
    Search,
    X,
    Users,
    Calendar,
    Activity,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PHCVaccinationPanel() {
    const [data, setData] = useState({ villages: [], patients: [], totals: { totalChildren: 0, fullyVaccinated: 0, due: 0, overdue: 0 } });
    const [loading, setLoading] = useState(true);
    const [expandedVillage, setExpandedVillage] = useState(null);
    const [expandedPatient, setExpandedPatient] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterVillage, setFilterVillage] = useState('all');
    const { t } = useTranslation();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const result = await getVillageVaccinationSummary();
            setData(result);
        } catch (err) {
            console.error('Error loading vaccination summary:', err);
        } finally {
            setLoading(false);
        }
    };

    // ── Derived data ──
    const { totals, villages, patients } = data;
    const coveragePct = totals.totalChildren > 0
        ? Math.round((totals.fullyVaccinated / totals.totalChildren) * 100)
        : 0;

    // Missed immunization alerts: patients with overdue vaccines AND high NEWS2
    const missedAlerts = useMemo(() => {
        return patients.filter(p =>
            p.overdue > 0 && (p.latestNews2 >= 5 || p.latestRiskLevel === 'Red' || p.latestRiskLevel === 'Yellow')
        ).sort((a, b) => b.overdue - a.overdue);
    }, [patients]);

    // Filter patients by village + search
    const filteredPatients = useMemo(() => {
        return patients.filter(p => {
            if (filterVillage !== 'all' && p.village !== filterVillage) return false;
            if (searchTerm) {
                const t = searchTerm.toLowerCase();
                return p.name.toLowerCase().includes(t) || p.village.toLowerCase().includes(t);
            }
            return true;
        });
    }, [patients, filterVillage, searchTerm]);

    // ── CSV Export ──
    const handleExportCSV = () => {
        const rows = [['Village', 'Patient Name', 'Age', 'Gender', 'Vaccine', 'Dose', 'Scheduled Date', 'Status']];
        patients.forEach(p => {
            p.vaccines.forEach(v => {
                rows.push([
                    p.village,
                    p.name,
                    p.age,
                    p.gender,
                    v.vaccineName,
                    v.doseNumber,
                    v.scheduledDate ? new Date(v.scheduledDate).toLocaleDateString('en-IN') : '',
                    v.computedStatus,
                ]);
            });
        });
        const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `vaccination_summary_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <div className="loading-spinner" style={{ minHeight: '50vh' }}>
                <div><div className="spinner"></div><div className="loading-text">Loading vaccination data...</div></div>
            </div>
        );
    }

    return (
        <div>
            {/* ── Summary Stat Cards ── */}
            <div className="phc-mat-stats" style={{ marginBottom: '1.25rem' }}>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                        <Users size={22} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{totals.totalChildren}</div>
                        <div className="phc-mat-stat-label">{t('vaccination.childrenTracked')}</div>
                    </div>
                </div>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}>
                        <Clock size={22} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{totals.due}</div>
                        <div className="phc-mat-stat-label">{t('vaccination.totalDue')}</div>
                    </div>
                </div>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(220,38,38,0.08)', color: '#DC2626' }}>
                        <AlertTriangle size={22} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{totals.overdue}</div>
                        <div className="phc-mat-stat-label">{t('vaccination.totalOverdue')}</div>
                    </div>
                </div>
                <div className="phc-mat-stat-card">
                    <div className="phc-mat-stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#16A34A' }}>
                        <ShieldCheck size={22} />
                    </div>
                    <div>
                        <div className="phc-mat-stat-value">{coveragePct}%</div>
                        <div className="phc-mat-stat-label">{t('vaccination.coverage')}</div>
                    </div>
                </div>
            </div>

            {/* ── Missed Immunization Alerts ── */}
            {missedAlerts.length > 0 && (
                <div className="phc-mat-alert-section" style={{ marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem', fontWeight: 700, color: '#DC2626', fontSize: '0.88rem' }}>
                        <AlertTriangle size={16} />
                        {t('vaccination.missedAlerts', { count: missedAlerts.length })}
                    </div>
                    <div className="phc-mat-alert-list">
                        {missedAlerts.slice(0, 5).map(p => (
                            <div key={p.patientDocId} className="phc-mat-alert-item" onClick={() => { setExpandedPatient(expandedPatient === p.patientDocId ? null : p.patientDocId); setFilterVillage('all'); }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</span>
                                        <span className="text-muted" style={{ fontSize: '0.72rem', marginLeft: '6px' }}>
                                            {p.age} yrs • {p.village}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                        <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>
                                            {p.overdue} missed
                                        </span>
                                        {p.latestNews2 != null && (
                                            <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>
                                                <Activity size={10} /> NEWS2: {p.latestNews2}
                                            </span>
                                        )}
                                    </div>
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
                        <input className="form-input" placeholder="Search patient or village..."
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
                        {villages.map(v => <option key={v.village} value={v.village}>{v.village}</option>)}
                    </select>
                    <button className="btn btn-secondary" style={{ fontSize: '0.78rem', flexShrink: 0 }} onClick={handleExportCSV}>
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* ── Village Summary Table ── */}
            <div className="card" style={{ marginBottom: '1.25rem' }}>
                <div className="card-header">
                    <h3 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Syringe size={18} /> {t('vaccination.villageCoverage')}
                    </h3>
                </div>
                {villages.length === 0 ? (
                    <div className="empty-state"><p>No vaccination data available</p></div>
                ) : (
                    <div className="phc-vax-table">
                        {/* Header */}
                        <div className="phc-vax-header">
                            <div style={{ flex: '2' }}>Village</div>
                            <div style={{ flex: '1', textAlign: 'center' }}>Children</div>
                            <div style={{ flex: '1', textAlign: 'center' }}>Vaccinated</div>
                            <div style={{ flex: '1', textAlign: 'center' }}>Due</div>
                            <div style={{ flex: '1', textAlign: 'center' }}>Overdue</div>
                            <div style={{ width: '30px' }}></div>
                        </div>
                        {(filterVillage === 'all' ? villages : villages.filter(v => v.village === filterVillage)).map(v => (
                            <div key={v.village}>
                                <div className={`phc-vax-row ${v.overdue > 0 ? 'has-overdue' : ''}`}
                                    onClick={() => setExpandedVillage(expandedVillage === v.village ? null : v.village)}>
                                    <div style={{ flex: '2', fontWeight: 600, fontSize: '0.88rem' }}>{v.village}</div>
                                    <div style={{ flex: '1', textAlign: 'center' }}>{v.totalChildren}</div>
                                    <div style={{ flex: '1', textAlign: 'center', color: '#16A34A', fontWeight: 600 }}>{v.fullyVaccinated}</div>
                                    <div style={{ flex: '1', textAlign: 'center', color: '#D97706', fontWeight: 600 }}>{v.due}</div>
                                    <div style={{ flex: '1', textAlign: 'center', color: v.overdue > 0 ? '#DC2626' : 'inherit', fontWeight: v.overdue > 0 ? 700 : 400 }}>{v.overdue}</div>
                                    <div style={{ width: '30px', display: 'flex', justifyContent: 'center' }}>
                                        {expandedVillage === v.village ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </div>
                                {/* Expanded: patients in this village */}
                                {expandedVillage === v.village && (
                                    <div className="phc-vax-village-detail">
                                        {patients.filter(p => p.village === v.village).map(p => (
                                            <div key={p.patientDocId} className="phc-vax-patient-card">
                                                <div className="phc-vax-patient-header"
                                                    onClick={() => setExpandedPatient(expandedPatient === p.patientDocId ? null : p.patientDocId)}>
                                                    <div>
                                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{p.name}</span>
                                                        <span className="text-muted" style={{ fontSize: '0.72rem', marginLeft: '6px' }}>
                                                            {p.age} yrs • {p.gender}
                                                        </span>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                                        {p.completed > 0 && <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>{p.completed} ✓</span>}
                                                        {p.due > 0 && <span className="badge badge-yellow" style={{ fontSize: '0.6rem' }}>{p.due} due</span>}
                                                        {p.overdue > 0 && <span className="badge badge-red" style={{ fontSize: '0.6rem' }}>{p.overdue} late</span>}
                                                        {expandedPatient === p.patientDocId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                    </div>
                                                </div>
                                                {/* Vaccine timeline */}
                                                {expandedPatient === p.patientDocId && (
                                                    <div className="phc-vax-timeline">
                                                        {p.vaccines.map(v => {
                                                            const statusColor = v.computedStatus === 'completed' ? '#16A34A'
                                                                : v.computedStatus === 'overdue' ? '#DC2626'
                                                                    : v.computedStatus === 'due' ? '#D97706' : 'var(--text-muted)';
                                                            return (
                                                                <div key={v.id} className="phc-vax-timeline-item" style={{ borderLeftColor: statusColor }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <div>
                                                                            <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{v.vaccineName}</span>
                                                                            <span className="text-muted" style={{ fontSize: '0.68rem', marginLeft: '4px' }}>Dose {v.doseNumber}</span>
                                                                            {v.category === 'maternal' && (
                                                                                <span className="badge" style={{ fontSize: '0.55rem', marginLeft: '4px', background: 'rgba(255,136,0,0.1)', color: '#FF8800' }}>TT</span>
                                                                            )}
                                                                        </div>
                                                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: statusColor }}>
                                                                            {v.computedStatus === 'completed' ? '✅ Done' :
                                                                                v.computedStatus === 'overdue' ? `🔴 ${v.daysOverdue}d late` :
                                                                                    v.computedStatus === 'due' ? '🟡 Due' : '⏳ Upcoming'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-muted" style={{ fontSize: '0.68rem', marginTop: '2px' }}>
                                                                        <Calendar size={10} /> {v.scheduledDate ? new Date(v.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                                                        {v.givenDate && <span style={{ color: '#16A34A', marginLeft: '8px' }}>Given: {new Date(v.givenDate).toLocaleDateString('en-IN')}</span>}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Patient-Level Table (searchable) ── */}
            {searchTerm && (
                <div className="card">
                    <div className="card-header">
                        <h3 className="card-title">Search Results ({filteredPatients.length})</h3>
                    </div>
                    {filteredPatients.length === 0 ? (
                        <div className="empty-state"><p>No patients match "{searchTerm}"</p></div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {filteredPatients.slice(0, 20).map(p => (
                                <div key={p.patientDocId} className="phc-vax-patient-card">
                                    <div className="phc-vax-patient-header"
                                        onClick={() => setExpandedPatient(expandedPatient === p.patientDocId ? null : p.patientDocId)}>
                                        <div>
                                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                                            <span className="text-muted" style={{ fontSize: '0.72rem', marginLeft: '6px' }}>
                                                {p.age} yrs • {p.gender} • {p.village}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                                            {p.overdue > 0 && <span className="badge badge-red" style={{ fontSize: '0.6rem' }}>{p.overdue} late</span>}
                                            {p.due > 0 && <span className="badge badge-yellow" style={{ fontSize: '0.6rem' }}>{p.due} due</span>}
                                            {expandedPatient === p.patientDocId ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </div>
                                    </div>
                                    {expandedPatient === p.patientDocId && (
                                        <div className="phc-vax-timeline">
                                            {p.vaccines.map(v => {
                                                const statusColor = v.computedStatus === 'completed' ? '#16A34A'
                                                    : v.computedStatus === 'overdue' ? '#DC2626'
                                                        : v.computedStatus === 'due' ? '#D97706' : 'var(--text-muted)';
                                                return (
                                                    <div key={v.id} className="phc-vax-timeline-item" style={{ borderLeftColor: statusColor }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                            <span style={{ fontWeight: 600, fontSize: '0.8rem' }}>{v.vaccineName} D{v.doseNumber}</span>
                                                            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: statusColor }}>
                                                                {v.computedStatus === 'completed' ? '✅' : v.computedStatus === 'overdue' ? `🔴 ${v.daysOverdue}d` : v.computedStatus === 'due' ? '🟡' : '⏳'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
