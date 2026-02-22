// ============================================================
// Patient Search — Find existing patients
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { searchPatients } from '../../services/patientService';
import { useTranslation } from 'react-i18next';
import { Search, Home, MapPin } from 'lucide-react';
import { SkeletonSearchResults } from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import Pagination from '../../components/Pagination';

export default function PatientSearch() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState('name');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [resultPage, setResultPage] = useState(1);
    const RESULTS_PER_PAGE = 8;
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const { t } = useTranslation();
    const debounceRef = useRef(null);

    const runSearch = useCallback(async (term, field) => {
        if (!term.trim()) return;
        setLoading(true);
        setSearched(true);
        try {
            // PHC/admin users search all patients; ASHA workers search only their own
            const scopeUserId = role === 'asha' ? user.uid : null;
            const data = await searchPatients(term.trim(), field, scopeUserId);
            setResults(data);
            setResultPage(1);
        } catch (err) {
            console.error('Error searching patients:', err);
        } finally {
            setLoading(false);
        }
    }, [user, role]);

    // Debounce: auto-search 400ms after the user stops typing
    useEffect(() => {
        if (!searchTerm.trim()) { setResults([]); setSearched(false); return; }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => runSearch(searchTerm, searchField), 400);
        return () => clearTimeout(debounceRef.current);
    }, [searchTerm, searchField, runSearch]);

    const handleSearch = async (e) => {
        e.preventDefault();
        clearTimeout(debounceRef.current);
        runSearch(searchTerm, searchField);
    };

    const getInitial = (name) => {
        return name ? name.charAt(0).toUpperCase() : '?';
    };

    return (
        <div style={{ maxWidth: '800px' }}>
            {/* Search Form */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <form onSubmit={handleSearch}>
                    <div className="form-group" style={{ marginBottom: '1rem' }}>
                        <label className="form-label">
                            {t('patient.searchBy')}
                        </label>
                        <div className="radio-group">
                            {[
                                { value: 'name', label: t('patientSearch.name') },
                                { value: 'patientId', label: t('patientSearch.patientId') },
                                { value: 'houseNumber', label: t('patientSearch.houseNo') },
                                { value: 'familyId', label: t('patientSearch.familyId') },
                            ].map((opt) => (
                                <label key={opt.value} className={`radio-option ${searchField === opt.value ? 'selected' : ''}`}>
                                    <input
                                        type="radio"
                                        name="searchField"
                                        value={opt.value}
                                        checked={searchField === opt.value}
                                        onChange={(e) => setSearchField(e.target.value)}
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <div className="search-bar" style={{ flex: 1 }}>
                            <span className="search-icon"><Search size={18} /></span>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('patientSearch.searchByPlaceholder', { field: searchField })}
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? t('common.loading') : t('common.search')}
                        </button>
                    </div>
                </form>
            </div>

            {/* Results */}
            {loading && <SkeletonSearchResults count={3} />}

            {!loading && searched && results.length === 0 && (
                <div className="card">
                    <EmptyState
                        icon={<Search size={32} strokeWidth={1.5} />}
                        title={t('patient.noPatients')}
                        description={t('patientSearch.tryDifferentTerm', 'Try searching by a different name, ID, or house number.')}
                    />
                </div>
            )}

            {!loading && results.length > 0 && (
                <>
                    <div className="cards-grid stagger-children">
                        {results.slice((resultPage - 1) * RESULTS_PER_PAGE, resultPage * RESULTS_PER_PAGE).map((patient) => (
                            <div
                                key={patient.id}
                                className="card card-clickable"
                                onClick={() => navigate(`/patient/${patient.id}`)}
                                style={{ padding: '1rem 1.25rem' }}
                            >
                                <div className="patient-card">
                                    <div className="patient-avatar">
                                        {getInitial(patient.name)}
                                    </div>
                                    <div className="patient-info">
                                        <div className="patient-name">{patient.name}</div>
                                        <div className="patient-meta">
                                            <span>{t('patientSearch.age')} {patient.age}</span>
                                            <span>{patient.gender}</span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Home size={12} /> {patient.houseNumber}</span>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><MapPin size={12} /> {patient.village}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                                            {patient.patientId}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    {results.length > RESULTS_PER_PAGE && (
                        <>
                            <p className="pagination-info">
                                Showing {(resultPage - 1) * RESULTS_PER_PAGE + 1}–{Math.min(resultPage * RESULTS_PER_PAGE, results.length)} of {results.length} results
                            </p>
                            <Pagination
                                page={resultPage}
                                totalPages={Math.ceil(results.length / RESULTS_PER_PAGE)}
                                onPageChange={setResultPage}
                            />
                        </>
                    )}
                </>
            )}
        </div>
    );
}
