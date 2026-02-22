// ============================================================
// Patient Registration — ASHA Worker
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { registerPatient } from '../../services/patientService';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../contexts/ToastContext';
import { FilePlus, AlertTriangle } from 'lucide-react';

// Validate a single field and return an error string or ''
function validateField(name, value) {
    switch (name) {
        case 'name':
            if (!value.trim()) return 'Full name is required.';
            if (value.trim().length < 2) return 'Name must be at least 2 characters.';
            break;
        case 'age':
            if (value === '' || value === null) return 'Age is required.';
            if (Number(value) < 0 || Number(value) > 150) return 'Enter a valid age (0–150).';
            break;
        case 'houseNumber':
            if (!value.trim()) return 'House number is required.';
            break;
        case 'village':
            if (!value.trim()) return 'Village name is required.';
            break;
        case 'contact':
            if (value && !/^\d{10}$/.test(value.replace(/\s/g, '')))
                return 'Enter a valid 10-digit mobile number.';
            break;
        case 'abhaId':
            if (value && !/^\d{14}$/.test(value.replace(/\s/g, '')))
                return 'ABHA ID must be 14 digits.';
            break;
        default:
            break;
    }
    return '';
}

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
    const [fieldErrors, setFieldErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { user } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { toast } = useToast();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error as user types if field was already touched
        if (touched[name]) {
            const err = validateField(name, value);
            setFieldErrors(prev => ({ ...prev, [name]: err }));
        }
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setTouched(prev => ({ ...prev, [name]: true }));
        const err = validateField(name, value);
        setFieldErrors(prev => ({ ...prev, [name]: err }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate all required fields on submit
        const requiredFields = ['name', 'age', 'houseNumber', 'village'];
        const allErrors = {};
        requiredFields.forEach(f => {
            const err = validateField(f, formData[f]);
            if (err) allErrors[f] = err;
        });
        // Also validate optional fields if filled
        ['contact', 'abhaId'].forEach(f => {
            const err = validateField(f, formData[f]);
            if (err) allErrors[f] = err;
        });

        setFieldErrors(allErrors);
        setTouched({ name: true, age: true, houseNumber: true, village: true, contact: true, abhaId: true });

        if (Object.keys(allErrors).length > 0) return;

        setLoading(true);
        try {
            const patient = await registerPatient({
                ...formData,
                createdBy: user?.uid || '',
            });
            toast.success(t('patientRegister.registered', 'Patient registered successfully!'));
            navigate(`/patient/${patient.id}`);
        } catch (err) {
            console.error('Error registering patient:', err);
            const msg = t('patientRegister.failedRegister');
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = (name) => {
        const base = 'form-input';
        if (!touched[name]) return base;
        if (fieldErrors[name]) return `${base} input-error`;
        if (formData[name]) return `${base} input-valid`;
        return base;
    };

    return (
        <div style={{ maxWidth: '720px' }}>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">
                        {t('patient.newPatient')}
                    </h2>
                </div>

                <form onSubmit={handleSubmit} noValidate>
                    {/* Name */}
                    <div className="form-group">
                        <label className="form-label">
                            {t('patient.name')}
                        </label>
                        <input
                            type="text"
                            name="name"
                            className={inputClass('name')}
                            value={formData.name}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder={t('patientRegister.enterFullName')}
                        />
                        {touched.name && fieldErrors.name && (
                            <div className="field-error-msg">
                                <AlertTriangle size={11} /> {fieldErrors.name}
                            </div>
                        )}
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
                                className={inputClass('age')}
                                value={formData.age}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder={t('patientRegister.ageInYears')}
                                min="0"
                                max="150"
                            />
                            {touched.age && fieldErrors.age && (
                                <div className="field-error-msg">
                                    <AlertTriangle size={11} /> {fieldErrors.age}
                                </div>
                            )}
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
                                className={inputClass('houseNumber')}
                                value={formData.houseNumber}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder={t('patientRegister.houseNumberExample')}
                            />
                            {touched.houseNumber && fieldErrors.houseNumber ? (
                                <div className="field-error-msg">
                                    <AlertTriangle size={11} /> {fieldErrors.houseNumber}
                                </div>
                            ) : (
                                <div className="form-hint">
                                    {t('patientRegister.sameHouseHint')}
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                {t('patient.village')}
                            </label>
                            <input
                                type="text"
                                name="village"
                                className={inputClass('village')}
                                value={formData.village}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                placeholder={t('patientRegister.enterVillage')}
                            />
                            {touched.village && fieldErrors.village && (
                                <div className="field-error-msg">
                                    <AlertTriangle size={11} /> {fieldErrors.village}
                                </div>
                            )}
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
                            className={inputClass('abhaId')}
                            value={formData.abhaId}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder={t('patientRegister.abhaDigits')}
                        />
                        {touched.abhaId && fieldErrors.abhaId && (
                            <div className="field-error-msg">
                                <AlertTriangle size={11} /> {fieldErrors.abhaId}
                            </div>
                        )}
                    </div>

                    {/* Contact Number */}
                    <div className="form-group">
                        <label className="form-label">
                            {t('patient.contactNumber')}
                        </label>
                        <input
                            type="tel"
                            name="contact"
                            className={inputClass('contact')}
                            value={formData.contact}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            placeholder={t('patientRegister.mobileNumber')}
                        />
                        {touched.contact && fieldErrors.contact && (
                            <div className="field-error-msg">
                                <AlertTriangle size={11} /> {fieldErrors.contact}
                            </div>
                        )}
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
