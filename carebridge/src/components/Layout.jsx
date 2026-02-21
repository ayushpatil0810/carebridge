// ============================================================
// Layout Component — App Shell with Sidebar + Header
// ============================================================

import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './LanguageSelector';
import {
    LayoutDashboard,
    UserPlus,
    Search,
    ClipboardList,
    LogOut,
    Heart,
    Menu,
    MapPin,
    BarChart3,
    MessageCircleQuestion,
    Bell,
    Users,
    Building2,
    Shield,
    MessageSquare,
    FileText,
    CalendarCheck,
    BookOpen,
    Baby,
    Stethoscope,
    Syringe,
} from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
    const { userName, role, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Determine page title based on route
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/dashboard') return t('pages.dashboard');
        if (path === '/register') return t('pages.patientRegistration');
        if (path === '/search') return t('pages.patientSearch');
        if (path.startsWith('/patient/') && path.includes('/visit')) return t('pages.newVisit');
        if (path.startsWith('/patient/')) return t('pages.patientProfile');
        if (path === '/phc') return t('pages.phcReviews');
        if (path.startsWith('/phc/review/')) return t('pages.caseReview');
        if (path.startsWith('/clarification/')) return t('pages.respondClarification');
        if (path === '/admin') return t('pages.adminDashboard');
        if (path === '/admin/notices') return t('pages.noticesAlerts');
        if (path === '/admin/performance') return t('pages.performancePage');
        if (path === '/admin/vaccinations') return t('pages.vaccinationGovernance');
        if (path === '/templates') return t('pages.messageTemplates');
        if (path === '/message-log') return t('pages.messageLogPage');
        if (path === '/follow-ups') return t('pages.followUpsPage');
        if (path === '/maternity') return t('pages.maternityTrackerPage');
        if (path === '/vaccinations') return t('pages.vaccinationTracker');
        if (path === '/phc/maternity') return t('pages.maternalOverviewPage');
        if (path === '/phc/vaccinations') return t('pages.vaccinationMonitoringPage');
        return t('app.name');
    };

    const pageTitle = getPageTitle();

    const getRoleLabel = () => {
        if (role === 'admin') return t('roles.admin');
        if (role === 'phc') return t('roles.phc');
        return t('roles.asha');
    };

    return (
        <div className="app-layout">
            {/* Mobile overlay */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <h1><Heart size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />{t('app.name')}</h1>
                    <div className="brand-subtitle">{t('app.subtitle')}</div>
                </div>

                <nav className="sidebar-nav">
                    {role === 'admin' ? (
                        <>
                            <div className="sidebar-nav-section">{t('sidebar.administration')}</div>
                            <NavLink to="/admin" end className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><LayoutDashboard size={18} /></span>
                                {t('sidebar.dashboard')}
                            </NavLink>
                            <NavLink to="/admin/notices" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Bell size={18} /></span>
                                {t('sidebar.noticesAlerts')}
                            </NavLink>
                            <NavLink to="/admin/performance" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><BarChart3 size={18} /></span>
                                {t('sidebar.performance')}
                            </NavLink>
                            <NavLink to="/admin/vaccinations" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Syringe size={18} /></span>
                                {t('sidebar.vaccination')}
                            </NavLink>
                        </>
                    ) : role === 'phc' ? (
                        <>
                            <div className="sidebar-nav-section">{t('sidebar.phcDoctorPanel')}</div>
                            <NavLink to="/phc" end className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><ClipboardList size={18} /></span>
                                {t('sidebar.pendingReviews')}
                            </NavLink>
                            <NavLink to="/search" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Search size={18} /></span>
                                {t('sidebar.searchPatients')}
                            </NavLink>

                            <div className="sidebar-nav-section" style={{ marginTop: '0.75rem' }}>{t('sidebar.healthPrograms')}</div>
                            <NavLink to="/phc/maternity" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Baby size={18} /></span>
                                {t('sidebar.maternalOverview')}
                            </NavLink>
                            <NavLink to="/phc/vaccinations" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Syringe size={18} /></span>
                                {t('sidebar.vaccinationMonitoring')}
                            </NavLink>
                        </>
                    ) : (
                        <>
                            <div className="sidebar-nav-section">{t('sidebar.ashaWorker')}</div>
                            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><LayoutDashboard size={18} /></span>
                                {t('sidebar.dashboard')}
                            </NavLink>
                            <NavLink to="/register" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><UserPlus size={18} /></span>
                                {t('sidebar.registerPatient')}
                            </NavLink>
                            <NavLink to="/search" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Search size={18} /></span>
                                {t('sidebar.searchPatients')}
                            </NavLink>

                            <div className="sidebar-nav-section" style={{ marginTop: '0.75rem' }}>{t('sidebar.healthPrograms')}</div>
                            <NavLink to="/maternity" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Baby size={18} /></span>
                                {t('sidebar.maternityTracker')}
                            </NavLink>
                            <NavLink to="/vaccinations" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Syringe size={18} /></span>
                                {t('sidebar.vaccinations')}
                            </NavLink>

                            <div className="sidebar-nav-section" style={{ marginTop: '0.75rem' }}>{t('sidebar.messaging')}</div>
                            <NavLink to="/follow-ups" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><CalendarCheck size={18} /></span>
                                {t('sidebar.followUps')}
                            </NavLink>
                            <NavLink to="/templates" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><BookOpen size={18} /></span>
                                {t('sidebar.templates')}
                            </NavLink>
                            <NavLink to="/message-log" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><FileText size={18} /></span>
                                {t('sidebar.messageLog')}
                            </NavLink>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <LanguageSelector />
                    <div style={{ marginBottom: '0.5rem', marginTop: '0.5rem' }}>
                        <strong>{userName}</strong>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase' }}>
                            {getRoleLabel()}
                        </div>
                    </div>
                    <button className="btn btn-ghost" onClick={handleLogout} style={{ color: 'rgba(245,240,232,0.7)', padding: '4px 0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LogOut size={14} /> {t('app.signOut')}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                <header className="top-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <button className="btn btn-ghost mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            <Menu size={20} />
                        </button>
                        <div className="top-header-title">
                            {pageTitle}
                        </div>
                    </div>
                    <div className="top-header-actions">
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                    </div>
                </header>

                <div className="warli-divider"></div>

                <div className="page-container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
