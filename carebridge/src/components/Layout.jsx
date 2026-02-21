// ============================================================
// Layout Component — App Shell with Sidebar + Header
// ============================================================

import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
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
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Determine page title based on route
    const getPageTitle = () => {
        const path = location.pathname;
        if (path === '/dashboard') return { en: 'Dashboard', mr: 'डॅशबोर्ड' };
        if (path === '/register') return { en: 'Patient Registration', mr: 'रुग्ण नोंदणी' };
        if (path === '/search') return { en: 'Patient Search', mr: 'रुग्ण शोधा' };
        if (path.startsWith('/patient/') && path.includes('/visit')) return { en: 'New Visit', mr: 'नवीन भेट' };
        if (path.startsWith('/patient/')) return { en: 'Patient Profile', mr: 'रुग्ण माहिती' };
        if (path === '/phc') return { en: 'PHC Reviews', mr: 'PHC पुनरावलोकन' };
        if (path.startsWith('/phc/review/')) return { en: 'Case Review', mr: 'प्रकरण पुनरावलोकन' };
        if (path.startsWith('/clarification/')) return { en: 'Respond to Clarification', mr: 'स्पष्टीकरण प्रतिसाद' };
        if (path === '/admin') return { en: 'Admin Dashboard', mr: 'प्रशासकीय डॅशबोर्ड' };
        if (path === '/admin/notices') return { en: 'Notices & Alerts', mr: 'सूचना व इशारे' };
        if (path === '/admin/performance') return { en: 'Performance Analytics', mr: 'कार्यप्रदर्शन विश्लेषण' };
        if (path === '/templates') return { en: 'Message Templates', mr: 'संदेश नमुने' };
        if (path === '/message-log') return { en: 'Message Log', mr: 'संदेश नोंद' };
        if (path === '/follow-ups') return { en: 'Follow-Ups', mr: 'पाठपुरावा' };
        if (path === '/maternity') return { en: 'Maternity Tracker', mr: 'माता सेवा' };
        if (path === '/vaccinations') return { en: 'Vaccination Tracker', mr: 'लसीकरण व्यवस्थापक' };
        if (path === '/phc/maternity') return { en: 'Maternal Overview', mr: 'माता आरोग्य विहंगावलोकन' };
        return { en: 'CareBridge', mr: 'केअरब्रिज' };
    };

    const pageTitle = getPageTitle();

    const getRoleLabel = () => {
        if (role === 'admin') return 'Administrator';
        if (role === 'phc') return 'PHC Doctor';
        return 'ASHA Worker';
    };

    return (
        <div className="app-layout">
            {/* Mobile overlay */}
            {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-brand">
                    <h1><Heart size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }} />CareBridge</h1>
                    <div className="brand-subtitle">Clinical Support System</div>
                </div>

                <nav className="sidebar-nav">
                    {role === 'admin' ? (
                        <>
                            <div className="sidebar-nav-section">Administration</div>
                            <NavLink to="/admin" end className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><LayoutDashboard size={18} /></span>
                                Dashboard
                            </NavLink>
                            <NavLink to="/admin/notices" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Bell size={18} /></span>
                                Notices & Alerts
                            </NavLink>
                            <NavLink to="/admin/performance" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><BarChart3 size={18} /></span>
                                Performance
                            </NavLink>
                        </>
                    ) : role === 'phc' ? (
                        <>
                            <div className="sidebar-nav-section">PHC Doctor Panel</div>
                            <NavLink to="/phc" end className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><ClipboardList size={18} /></span>
                                Pending Reviews
                            </NavLink>
                            <NavLink to="/search" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Search size={18} /></span>
                                Search Patients
                            </NavLink>

                            <div className="sidebar-nav-section" style={{ marginTop: '0.75rem' }}>Maternal Care</div>
                            <NavLink to="/phc/maternity" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Baby size={18} /></span>
                                Maternal Overview
                            </NavLink>
                        </>
                    ) : (
                        <>
                            <div className="sidebar-nav-section">ASHA Worker</div>
                            <NavLink to="/dashboard" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><LayoutDashboard size={18} /></span>
                                Dashboard
                            </NavLink>
                            <NavLink to="/register" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><UserPlus size={18} /></span>
                                Register Patient
                            </NavLink>
                            <NavLink to="/search" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Search size={18} /></span>
                                Search Patients
                            </NavLink>

                            <div className="sidebar-nav-section" style={{ marginTop: '0.75rem' }}>Health Programs</div>
                            <NavLink to="/maternity" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Baby size={18} /></span>
                                Maternity Tracker
                            </NavLink>
                            <NavLink to="/vaccinations" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><Syringe size={18} /></span>
                                Vaccinations
                            </NavLink>

                            <div className="sidebar-nav-section" style={{ marginTop: '0.75rem' }}>Messaging</div>
                            <NavLink to="/follow-ups" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><CalendarCheck size={18} /></span>
                                Follow-Ups
                            </NavLink>
                            <NavLink to="/templates" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><BookOpen size={18} /></span>
                                Templates
                            </NavLink>
                            <NavLink to="/message-log" className={({ isActive }) => `sidebar-nav-link ${isActive ? 'active' : ''}`} onClick={() => setSidebarOpen(false)}>
                                <span className="nav-icon"><FileText size={18} /></span>
                                Message Log
                            </NavLink>
                        </>
                    )}
                </nav>

                <div className="sidebar-footer">
                    <div style={{ marginBottom: '0.5rem' }}>
                        <strong>{userName}</strong>
                        <div style={{ fontSize: '0.75rem', opacity: 0.7, textTransform: 'uppercase' }}>
                            {getRoleLabel()}
                        </div>
                    </div>
                    <button className="btn btn-ghost" onClick={handleLogout} style={{ color: 'rgba(245,240,232,0.7)', padding: '4px 0', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <LogOut size={14} /> Sign Out
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
                            {pageTitle.en}
                            <span className="title-marathi">{pageTitle.mr}</span>
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
