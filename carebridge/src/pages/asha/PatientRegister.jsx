// ============================================================
// Patient Registration — ASHA Worker
// ============================================================

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { registerPatient } from '../../services/patientService';
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
            setError('Failed to register patient. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ maxWidth: '720px' }}>
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">
                        New Patient <span className="text-marathi text-muted" style={{ fontSize: '0.8rem' }}>(नवीन रुग्ण)</span>
                    </h2>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* Name */}
                    <div className="form-group">
                        <label className="form-label">
                            Patient Name <span className="label-marathi">रुग्णाचे नाव</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            className="form-input"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Enter patient's full name"
                            required
                        />
                    </div>

                    {/* Age + Gender */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                Age <span className="label-marathi">वय</span>
                            </label>
                            <input
                                type="number"
                                name="age"
                                className="form-input"
                                value={formData.age}
                                onChange={handleChange}
                                placeholder="Age in years"
                                min="0"
                                max="150"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Gender <span className="label-marathi">लिंग</span>
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
                                        {g}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* House Number + Village */}
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">
                                House Number <span className="label-marathi">घर क्रमांक</span>
                            </label>
                            <input
                                type="text"
                                name="houseNumber"
                                className="form-input"
                                value={formData.houseNumber}
                                onChange={handleChange}
                                placeholder="e.g. 42-A"
                                required
                            />
                            <div className="form-hint">
                                Same house number = same Family ID
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Village <span className="label-marathi">गाव</span>
                            </label>
                            <input
                                type="text"
                                name="village"
                                className="form-input"
                                value={formData.village}
                                onChange={handleChange}
                                placeholder="Enter village name"
                                required
                            />
                        </div>
                    </div>

                    {/* ABHA ID */}
                    <div className="form-group">
                        <label className="form-label">
                            ABHA ID <span className="label-marathi">ABHA आयडी</span>
                            <span className="text-muted" style={{ marginLeft: '0.5rem' }}>(Optional)</span>
                        </label>
                        <input
                            type="text"
                            name="abhaId"
                            className="form-input"
                            value={formData.abhaId}
                            onChange={handleChange}
                            placeholder="14-digit ABHA number"
                        />
                    </div>

                    {/* Contact Number */}
                    <div className="form-group">
                        <label className="form-label">
                            Contact Number <span className="label-marathi">संपर्क क्रमांक</span>
                        </label>
                        <input
                            type="tel"
                            name="contact"
                            className="form-input"
                            value={formData.contact}
                            onChange={handleChange}
                            placeholder="10-digit mobile number"
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
                            <strong>Family ID:</strong>{' '}
                            FAM-{formData.village.toLowerCase().replace(/\s+/g, '')}-{formData.houseNumber.toLowerCase().replace(/\s+/g, '')}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg"
                        disabled={loading}
                    >
                        <FilePlus size={18} />
                        {loading ? 'Registering...' : 'Register Patient'}
                    </button>
                </form>
            </div>
        </div>
    );
}
