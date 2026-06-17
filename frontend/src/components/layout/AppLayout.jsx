import { useCallback, useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const isDashboard = location.pathname === '/dashboard';

    const handleOpenSettings = useCallback(() => {
        navigate('/settings?tab=profile');
    }, [navigate]);

    useEffect(() => {
        globalThis.addEventListener(
            'iam:open-settings',
            handleOpenSettings
        );

        return () => {
            globalThis.removeEventListener(
                'iam:open-settings',
                handleOpenSettings
            );
        };
    }, [handleOpenSettings]);

    const handleSignOut = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (error) {
            console.error('Failed to sign out', error);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC] text-aws-text font-sans">
            {sidebarOpen && (
                <button
                    type="button"
                    aria-label="Close sidebar"
                    className="fixed inset-0 z-20 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div
                className={`fixed inset-y-0 left-0 z-30 transform transition-all duration-200 ease-in-out lg:relative lg:inset-auto lg:translate-x-0 lg:flex lg:flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'}`}
            >
                <Sidebar
                    collapsed={sidebarCollapsed}
                    onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                    onClose={() => setSidebarOpen(false)}
                />
            </div>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <TopBar
                    onMenuClick={() => setSidebarOpen(true)}
                    onOpenSettings={handleOpenSettings}
                    onSignOut={handleSignOut}
                />

                <main className={`flex-1 overflow-y-auto p-4 md:p-6 ${isDashboard ? 'dashboard-scrollbar-hidden' : ''}`}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
