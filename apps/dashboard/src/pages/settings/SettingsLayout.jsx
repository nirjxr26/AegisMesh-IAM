import { Link, Outlet, useLocation } from 'react-router-dom';

export default function SettingsLayout() {
    const location = useLocation();

    // Determine active tab based on current path
    const getActiveTab = () => {
        const path = location.pathname;
        if (path.includes('/settings/sessions')) return 'sessions';
        if (path.includes('/settings/preferences')) return 'preferences';
        return 'profile'; // default
    };

    const activeTab = getActiveTab();

    const tabs = [
        { id: 'profile', label: 'Profile', icon: '👤', path: '/settings' },
        { id: 'sessions', label: 'Sessions', icon: '🖥️', path: '/settings/sessions' },
        { id: 'preferences', label: 'Preferences', icon: '🎨', path: '/settings/preferences' },
    ];

    return (
        <div className="bg-aws-dark text-aws-text font-sans min-h-[calc(100vh-64px)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar / Tabs Navigation */}
                    <div className="w-full md:w-64 shrink-0">
                        <div className="glass rounded-xl p-2 md:p-4 md:sticky md:top-24">
                            {/* Mobile Header Title */}
                            <h2 className="text-[#0f1623] font-bold px-2 py-3 hidden md:block mb-2 border-b border-aws-border">
                                Account Settings
                            </h2>

                            <nav className="flex md:flex-col gap-1 overflow-x-auto no-scrollbar">
                                {tabs.map((tab) => (
                                    <Link
                                        key={tab.id}
                                        to={tab.path}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                            ? 'bg-aws-orange/10 text-aws-orange border border-aws-orange/20'
                                            : 'text-aws-text-dim hover:text-[#0f1623] hover:bg-aws-navy-light border border-transparent'
                                            }`}
                                    >
                                        <span className="text-lg">{tab.icon}</span>
                                        {tab.label}
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 min-w-0">
                        <div className="animate-fade-in-up">
                            <Outlet />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


