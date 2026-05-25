import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import SettingsModal from '../settings/SettingsModal';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settingsInitialTab, setSettingsInitialTab] = useState('profile');

    const handleOpenSettings = () => {
        setSettingsInitialTab('profile');
        setIsSettingsOpen(true);
    };

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
    }, []);

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
                className={`fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out lg:relative lg:inset-auto lg:translate-x-0 lg:flex lg:flex-shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <TopBar
                    onMenuClick={() => setSidebarOpen(true)}
                    onOpenSettings={handleOpenSettings}
                    onSignOut={handleSignOut}
                />

                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>

            {isSettingsOpen ? (
                <SettingsModal
                    isOpen
                    initialTab={settingsInitialTab}
                    onClose={() => {
                        setIsSettingsOpen(false);
                        setSettingsInitialTab('profile');
                    }}
                />
            ) : null}
        </div>
    );
}
