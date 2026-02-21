// ============================================================
// Patient Search — Find existing patients
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchPatients } from '../../services/patientService';
import { useTranslation } from 'react-i18next';
import { Search, Home, MapPin } from 'lucide-react';

export default function PatientSearch() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchField, setSearchField] = useState('name');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        setLoading(true);
        setSearched(true);
        try {
            const data = await searchPatients(searchTerm.trim(), searchField);
            setResults(data);
        } catch (err) {
            console.error('Error searching patients:', err);
        } finally {
            setLoading(false);
        }
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
            {loading && (
                <div className="loading-spinner">
                    <div>
                        <div className="spinner"></div>
                        <div className="loading-text">{t('messageLog.searchingPatients')}</div>
                    </div>
                </div>
            )}

            {!loading && searched && results.length === 0 && (
                <div className="card">
                    <div className="empty-state">
                        <div className="empty-icon"><Search size={48} strokeWidth={1} /></div>
                        <p>{t('patient.noPatients')}</p>
                    </div>
                </div>
            )}

            {!loading && results.length > 0 && (
                <div className="cards-grid stagger-children">
                    {results.map((patient) => (
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
            )}
        </div>
    );
}
