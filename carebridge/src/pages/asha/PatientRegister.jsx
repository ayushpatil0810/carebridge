// ============================================================
// Patient Registration — ASHA Worker
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { registerPatient } from '../../services/patientService';
import { useTranslation } from 'react-i18next';
import { FilePlus, AlertTriangle } from 'lucide-react';

export default function PatientRegister() {
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: 'Male',
        houseNumber: '',
        village: '',
        abhaId: '',
        contact: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const patient = await registerPatient({
                ...formData,
                createdBy: user?.uid || '',
            });
            navigate(`/patient/${patient.id}`);
        } catch (err) {
            console.error('Error registering patient:', err);
            setError(t('patientRegister.failedRegister'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '720px' }}>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">
                        {t('patient.newPatient')}
                    </h2>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Name */}
                    <div className="form-group">
                        <label className="form-label">
                            {t('patient.name')}
                        </label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={t('patientRegister.enterFullName')}
                            required
                        />
                    </div>

                    {/* Age + Gender */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                {t('patient.age')}
                            </label>
                            <input
                                type="number"
                                name="age"
                                className="form-input"
                                value={formData.age}
                                onChange={handleChange}
                                placeholder={t('patientRegister.ageInYears')}
                                min="0"
                                max="150"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                {t('patient.gender')}
                            </label>
                            <div className="radio-group">
                                {['Male', 'Female', 'Other'].map((g) => (
                                    <label key={g} className={`radio-option ${formData.gender === g ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="gender"
                                            value={g}
                                            checked={formData.gender === g}
                                            onChange={handleChange}
                                        />
                                        {t(`patient.${g.toLowerCase()}`)}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* House Number + Village */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                {t('patient.houseNumber')}
                            </label>
                            <input
                                type="text"
                                name="houseNumber"
                                className="form-input"
                                value={formData.houseNumber}
                                onChange={handleChange}
                                placeholder={t('patientRegister.houseNumberExample')}
                                required
                            />
                            <div className="form-hint">
                                {t('patientRegister.sameHouseHint')}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                {t('patient.village')}
                            </label>
                            <input
                                type="text"
                                name="village"
                                className="form-input"
                                value={formData.village}
                                onChange={handleChange}
                                placeholder={t('patientRegister.enterVillage')}
                                required
                            />
                        </div>
                    </div>

                    {/* ABHA ID */}
                    <div className="form-group">
                        <label className="form-label">
                            {t('patient.abhaId')}
                            <span className="text-muted" style={{ marginLeft: '0.5rem' }}>{t('patientRegister.optional')}</span>
                        </label>
                        <input
                            type="text"
                            name="abhaId"
                            className="form-input"
                            value={formData.abhaId}
                            onChange={handleChange}
                            placeholder={t('patientRegister.abhaDigits')}
                        />
                    </div>

                    {/* Contact Number */}
                    <div className="form-group">
                        <label className="form-label">
                            {t('patient.contactNumber')}
                        </label>
                        <input
                            type="tel"
                            name="contact"
                            className="form-input"
                            value={formData.contact}
                            onChange={handleChange}
                            placeholder={t('patientRegister.mobileNumber')}
                        />
                    </div>

                    {error && (
                        <div className="warning-banner" style={{ marginBottom: '1rem' }}>
                            <span className="warning-icon"><AlertTriangle size={18} /></span>
                            {error}
                        </div>
                    )}

                    {/* Preview */}
                    {formData.houseNumber && formData.village && (
                        <div style={{
                            background: 'var(--accent-saffron-light)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.75rem 1rem',
                            fontSize: '0.85rem',
                            marginBottom: '1.25rem',
                        }}>
                            <strong>{t('patientRegister.familyIdPreview')}</strong>{' '}
                            FAM-{formData.village.toLowerCase().replace(/\s+/g, '')}-{formData.houseNumber.toLowerCase().replace(/\s+/g, '')}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={loading}
                    >
                        <FilePlus size={18} />
                        {loading ? t('patient.registering') : t('patient.register')}
                    </button>
                </form>
            </div>
        </div>
    );
}
