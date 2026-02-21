// ============================================================
// Vaccination Tracker — Immunization Manager for ASHA Workers
// ============================================================

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getAllPatients } from '../../services/patientService';
import {
    getVaccinations,
    markVaccineGiven,
    autoScheduleChildVaccines,
    autoScheduleMaternalVaccines,
    getVaccineStatus,
    getDaysOverdue,
    buildVaccineReminderURL,
    CHILD_VACCINES,
    MATERNAL_VACCINES,
} from '../../services/vaccinationService';
import {
    Syringe,
    Search,
    X,
    ChevronRight,
    ArrowLeft,
    CheckCircle2,
    AlertCircle,
    Clock,
    Calendar,
    MessageSquare,
    Baby,
    User,
    Filter,
    Plus,
    Shield,
} from 'lucide-react';

export default function VaccinationTracker() {
    const { userName } = useAuth();

    // ── State ──
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [vaccinations, setVaccinations] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all'); // all | child | maternal
    const [filterStatus, setFilterStatus] = useState('all');     // all | due | overdue | completed | upcoming
    const [showGivenModal, setShowGivenModal] = useState(false);
    const [selectedVaccine, setSelectedVaccine] = useState(null);
    const [givenForm, setGivenForm] = useState({ givenDate: new Date().toISOString().split('T')[0], notes: '' });
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [scheduling, setScheduling] = useState(false);

    // ── Load patients ──
    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            const all = await getAllPatients();
            setPatients(all);
        } catch (err) {
            console.error('Error loading patients:', err);
            setError('Failed to load patients: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Load vaccinations when patient selected ──
    useEffect(() => {
        if (selectedPatient) {
            loadVaccinations(selectedPatient.id);
        }
    }, [selectedPatient]);

    const loadVaccinations = async (patientId) => {
        try {
            const vaxList = await getVaccinations(patientId);
            setVaccinations(vaxList);
        } catch (err) {
            console.error('Error loading vaccinations:', err);
            setError('Failed to load vaccination data: ' + err.message);
        }
    };

    // ── Helpers ──
    const clearMessages = () => { setSuccess(''); setError(''); };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'completed': return { bg: 'rgba(16,185,129,0.08)', color: '#16A34A', border: 'rgba(16,185,129,0.2)', icon: '✅' };
            case 'due': return { bg: 'rgba(245,158,11,0.08)', color: '#D97706', border: 'rgba(245,158,11,0.2)', icon: '🟡' };
            case 'overdue': return { bg: 'rgba(220,38,38,0.06)', color: '#DC2626', border: 'rgba(220,38,38,0.2)', icon: '🔴' };
            default: return { bg: 'rgba(100,100,100,0.04)', color: 'var(--text-muted)', border: 'var(--border-light)', icon: '⏳' };
        }
    };

    // ── Filtered patient list ──
    const filteredPatients = useMemo(() => {
        if (!searchTerm) return patients;
        const t = searchTerm.toLowerCase();
        return patients.filter(p =>
            p.name?.toLowerCase().includes(t) ||
            p.village?.toLowerCase().includes(t) ||
            p.patientId?.toLowerCase().includes(t)
        );
    }, [patients, searchTerm]);

    // ── Filtered vaccinations ──
    const filteredVaccinations = useMemo(() => {
        return vaccinations
            .map(v => ({ ...v, computedStatus: getVaccineStatus(v.scheduledDate, v.givenDate) }))
            .filter(v => {
                if (filterCategory !== 'all' && v.category !== filterCategory) return false;
                if (filterStatus !== 'all' && v.computedStatus !== filterStatus) return false;
                return true;
            });
    }, [vaccinations, filterCategory, filterStatus]);

    // ── Stat counts for current patient ──
    const stats = useMemo(() => {
        if (!vaccinations.length) return { total: 0, completed: 0, due: 0, overdue: 0, upcoming: 0 };
        let completed = 0, due = 0, overdue = 0, upcoming = 0;
        vaccinations.forEach(v => {
            const s = getVaccineStatus(v.scheduledDate, v.givenDate);
            if (s === 'completed') completed++;
            else if (s === 'due') due++;
            else if (s === 'overdue') overdue++;
            else upcoming++;
        });
        return { total: vaccinations.length, completed, due, overdue, upcoming };
    }, [vaccinations]);

    // ── Auto-schedule ──
    const handleAutoSchedule = async (type) => {
        clearMessages();
        setScheduling(true);
        try {
            let count = 0;
            if (type === 'child') {
                // Use patient age to compute approximate DOB
                const dob = new Date();
                dob.setFullYear(dob.getFullYear() - (selectedPatient.age || 0));
                count = await autoScheduleChildVaccines(selectedPatient.id, dob, userName);
            } else if (type === 'maternal') {
                count = await autoScheduleMaternalVaccines(selectedPatient.id, new Date(), userName);
            }
            if (count > 0) {
                setSuccess(`${count} vaccine(s) scheduled successfully!`);
                await loadVaccinations(selectedPatient.id);
            } else {
                setSuccess('All vaccines already scheduled.');
            }
        } catch (err) {
            setError('Failed to schedule: ' + err.message);
        } finally {
            setScheduling(false);
        }
    };

    // ── Mark as given ──
    const handleMarkGiven = async () => {
        if (!selectedVaccine) return;
        clearMessages();
        setSubmitting(true);
        try {
            await markVaccineGiven(selectedPatient.id, selectedVaccine.id, {
                givenDate: givenForm.givenDate,
                notes: givenForm.notes,
                updatedBy: userName,
            });
            setSuccess(`${selectedVaccine.vaccineName} (Dose ${selectedVaccine.doseNumber}) marked as given!`);
            setShowGivenModal(false);
            setSelectedVaccine(null);
            setGivenForm({ givenDate: new Date().toISOString().split('T')[0], notes: '' });
            await loadVaccinations(selectedPatient.id);
        } catch (err) {
            setError('Failed to update: ' + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    // ── Loading ──
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    // ── Patient list (no patient selected) ──
    if (!selectedPatient) {
        return (
            <div style={{ maxWidth: '800px' }}>
                <div className="card" style={{ marginBottom: '1.5rem' }}>
                    <div className="card-header">
                        <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Syringe size={22} /> Vaccination Tracker
                            <span className="text-marathi text-muted" style={{ fontSize: '0.8rem' }}>
                                (लसीकरण व्यवस्थापक)
                            </span>
                        </h2>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                        Select a patient to view and manage their vaccination schedule.
                    </p>

                    {/* Search */}
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input className="form-input" placeholder="Search by name, village, or patient ID..."
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                style={{ paddingLeft: '2.25rem' }} />
                            {searchTerm && (
                                <button className="btn btn-ghost" onClick={() => setSearchTerm('')}
                                    style={{ position: 'absolute', right: '4px', top: '50%', transform: 'translateY(-50%)', padding: '4px' }}>
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {filteredPatients.length === 0 ? (
                        <div className="empty-state"><p>No patients found</p></div>
                    ) : (
                        <div className="maternity-patient-list stagger-children">
                            {filteredPatients.map(p => (
                                <button key={p.id} className="maternity-patient-card" onClick={() => setSelectedPatient(p)}>
                                    <div className="patient-avatar" style={{ width: '40px', height: '40px', fontSize: '1rem' }}>
                                        {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            {p.age} yrs • {p.gender} • {p.village} • {p.patientId}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-muted" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Patient selected — Vaccination view ──
    return (
        <div style={{ maxWidth: '900px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <button className="btn btn-ghost" onClick={() => { setSelectedPatient(null); setVaccinations([]); clearMessages(); }}>
                    <ArrowLeft size={18} />
                </button>
                <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Syringe size={20} /> {selectedPatient.name}
                        <span className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 400 }}>
                            {selectedPatient.age} yrs • {selectedPatient.gender} • {selectedPatient.village}
                        </span>
                    </h2>
                </div>
            </div>

            {/* Messages */}
            {success && (
                <div className="warning-banner" style={{ background: 'var(--green-light)', borderColor: 'var(--green)', marginBottom: '1rem' }}>
                    <CheckCircle2 size={16} color="var(--green)" /> {success}
                </div>
            )}
            {error && (
                <div className="warning-banner" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} /> {error}
                </div>
            )}

            {/* Stat Badges */}
            <div className="vax-stat-row">
                <div className="vax-stat-pill" style={{ background: 'rgba(99,102,241,0.08)', color: '#6366F1' }}>
                    <Shield size={14} /> {stats.total} Total
                </div>
                <div className="vax-stat-pill" style={{ background: 'rgba(16,185,129,0.08)', color: '#16A34A' }}>
                    <CheckCircle2 size={14} /> {stats.completed} Done
                </div>
                <div className="vax-stat-pill" style={{ background: 'rgba(245,158,11,0.08)', color: '#D97706' }}>
                    <Clock size={14} /> {stats.due} Due
                </div>
                <div className="vax-stat-pill" style={{ background: 'rgba(220,38,38,0.06)', color: '#DC2626' }}>
                    <AlertCircle size={14} /> {stats.overdue} Overdue
                </div>
            </div>

            {/* Schedule Buttons */}
            {vaccinations.length === 0 && (
                <div className="card" style={{ textAlign: 'center', padding: '2rem', marginBottom: '1rem' }}>
                    <div className="empty-state">
                        <div className="empty-icon"><Syringe size={48} strokeWidth={1} /></div>
                        <p>No vaccines scheduled yet</p>
                        <p className="text-muted" style={{ fontSize: '0.8rem' }}>Auto-generate the vaccination schedule:</p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                            <button className="btn btn-primary" onClick={() => handleAutoSchedule('child')} disabled={scheduling}>
                                <Baby size={16} /> {scheduling ? 'Scheduling...' : 'Child Vaccines'}
                                <span className="text-marathi" style={{ fontSize: '0.7rem', marginLeft: '4px' }}>(बालक)</span>
                            </button>
                            {selectedPatient.gender?.toLowerCase() === 'female' && (
                                <button className="btn btn-secondary" onClick={() => handleAutoSchedule('maternal')} disabled={scheduling}
                                    style={{ borderColor: 'var(--accent-saffron)', color: 'var(--accent-saffron)' }}>
                                    <Syringe size={16} /> {scheduling ? 'Scheduling...' : 'Maternal Vaccines (TT)'}
                                    <span className="text-marathi" style={{ fontSize: '0.7rem', marginLeft: '4px' }}>(माता)</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Schedule more buttons when existing vaccines present */}
            {vaccinations.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => handleAutoSchedule('child')} disabled={scheduling}>
                        <Plus size={14} /> Add Child Schedule
                    </button>
                    {selectedPatient.gender?.toLowerCase() === 'female' && (
                        <button className="btn btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => handleAutoSchedule('maternal')} disabled={scheduling}>
                            <Plus size={14} /> Add Maternal Schedule
                        </button>
                    )}
                </div>
            )}

            {/* Filters */}
            {vaccinations.length > 0 && (
                <div className="card" style={{ marginBottom: '1rem' }}>
                    <div className="vax-filters">
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button className={`vax-filter-btn ${filterCategory === 'all' ? 'active' : ''}`} onClick={() => setFilterCategory('all')}>All</button>
                            <button className={`vax-filter-btn ${filterCategory === 'child' ? 'active' : ''}`} onClick={() => setFilterCategory('child')}>
                                <Baby size={12} /> Children
                            </button>
                            <button className={`vax-filter-btn ${filterCategory === 'maternal' ? 'active' : ''}`} onClick={() => setFilterCategory('maternal')}>
                                <User size={12} /> Maternal
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <button className={`vax-filter-btn ${filterStatus === 'all' ? 'active' : ''}`} onClick={() => setFilterStatus('all')}>All</button>
                            <button className={`vax-filter-btn ${filterStatus === 'overdue' ? 'active' : ''}`} onClick={() => setFilterStatus('overdue')}>🔴 Overdue</button>
                            <button className={`vax-filter-btn ${filterStatus === 'due' ? 'active' : ''}`} onClick={() => setFilterStatus('due')}>🟡 Due</button>
                            <button className={`vax-filter-btn ${filterStatus === 'completed' ? 'active' : ''}`} onClick={() => setFilterStatus('completed')}>✅ Done</button>
                            <button className={`vax-filter-btn ${filterStatus === 'upcoming' ? 'active' : ''}`} onClick={() => setFilterStatus('upcoming')}>⏳ Upcoming</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Vaccine Timeline */}
            {filteredVaccinations.length > 0 ? (
                <div className="vax-timeline">
                    {filteredVaccinations.map(vax => {
                        const style = getStatusStyle(vax.computedStatus);
                        const days = getDaysOverdue(vax.scheduledDate);
                        const schedDate = new Date(vax.scheduledDate);

                        return (
                            <div key={vax.id} className="vax-card" style={{ borderColor: style.border, background: style.bg }}>
                                <div className="vax-card-left">
                                    <div className="vax-card-icon" style={{ color: style.color }}>
                                        {style.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {vax.vaccineName}
                                            <span className="badge" style={{ fontSize: '0.6rem', background: 'rgba(100,100,100,0.08)' }}>
                                                Dose {vax.doseNumber}
                                            </span>
                                            <span className="badge" style={{ fontSize: '0.55rem', background: vax.category === 'child' ? 'rgba(99,102,241,0.1)' : 'rgba(255,136,0,0.1)', color: vax.category === 'child' ? '#6366F1' : '#FF8800' }}>
                                                {vax.category === 'child' ? 'Child' : 'Maternal'}
                                            </span>
                                        </div>
                                        <div className="text-muted" style={{ fontSize: '0.72rem', marginTop: '2px' }}>
                                            <Calendar size={10} /> Scheduled: {schedDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {vax.computedStatus === 'overdue' && (
                                                <span style={{ color: '#DC2626', fontWeight: 600, marginLeft: '6px' }}>
                                                    ({days} day{days !== 1 ? 's' : ''} overdue)
                                                </span>
                                            )}
                                            {vax.computedStatus === 'due' && (
                                                <span style={{ color: '#D97706', fontWeight: 600, marginLeft: '6px' }}>
                                                    (due {days === 0 ? 'today' : `in ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`})
                                                </span>
                                            )}
                                        </div>
                                        {vax.givenDate && (
                                            <div style={{ fontSize: '0.72rem', color: '#16A34A', marginTop: '2px' }}>
                                                ✅ Given: {new Date(vax.givenDate).toLocaleDateString('en-IN')}
                                                {vax.notes && <span className="text-muted"> — {vax.notes}</span>}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="vax-card-actions">
                                    {vax.computedStatus !== 'completed' && (
                                        <>
                                            <button className="btn btn-primary" style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                                                onClick={() => { setSelectedVaccine(vax); setShowGivenModal(true); setGivenForm({ givenDate: new Date().toISOString().split('T')[0], notes: '' }); }}>
                                                <CheckCircle2 size={12} /> Mark Given
                                            </button>
                                            {selectedPatient.contact && (
                                                <a href={buildVaccineReminderURL(selectedPatient.name, vax.vaccineName, vax.scheduledDate, selectedPatient.contact)}
                                                    target="_blank" rel="noopener noreferrer"
                                                    className="btn btn-secondary" style={{ fontSize: '0.72rem', padding: '4px 10px', textDecoration: 'none' }}>
                                                    <MessageSquare size={12} /> Remind
                                                </a>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : vaccinations.length > 0 ? (
                <div className="card"><div className="empty-state"><p>No vaccines match the selected filter</p></div></div>
            ) : null}

            {/* ── Mark as Given Modal ── */}
            {showGivenModal && selectedVaccine && (
                <div className="modal-overlay" onClick={() => setShowGivenModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
                        <div className="modal-header">
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1rem' }}>
                                <Syringe size={18} /> Mark Vaccine as Given
                            </h3>
                            <button className="btn btn-ghost" onClick={() => setShowGivenModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div style={{ padding: '1rem' }}>
                            <div style={{ background: 'rgba(99,102,241,0.06)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                                <div style={{ fontWeight: 700 }}>{selectedVaccine.vaccineName} — Dose {selectedVaccine.doseNumber}</div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    Scheduled: {new Date(selectedVaccine.scheduledDate).toLocaleDateString('en-IN')}
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">
                                    Date Given <span className="label-marathi">दिनांक</span>
                                </label>
                                <input type="date" className="form-input" required value={givenForm.givenDate}
                                    onChange={e => setGivenForm({ ...givenForm, givenDate: e.target.value })} />
                            </div>

                            <div className="form-group" style={{ marginBottom: '1rem' }}>
                                <label className="form-label">
                                    Notes (optional) <span className="label-marathi">टिपणी</span>
                                </label>
                                <textarea className="form-input" rows="2" placeholder="Any observations..."
                                    value={givenForm.notes} onChange={e => setGivenForm({ ...givenForm, notes: e.target.value })} />
                            </div>

                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                <button className="btn btn-secondary" onClick={() => setShowGivenModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleMarkGiven} disabled={submitting}>
                                    {submitting ? 'Saving...' : 'Confirm Given'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
