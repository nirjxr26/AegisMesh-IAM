import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    AppWindow, Bell, Building2, Key, User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { settingsAPI } from '../../services/api';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getInitials } from '../../utils/formatters';
import { TabButton } from './tabs/shared';
import ProfileTab from './tabs/ProfileTab';
import NotificationsTab from './tabs/NotificationsTab';
import OrganizationTab from './tabs/OrganizationTab';
import ApiKeysTab from './tabs/ApiKeysTab';
import ConnectedAppsTab from './tabs/ConnectedAppsTab';

const TAB_DEFS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'organization', label: 'Organization', icon: Building2 },
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'connected-apps', label: 'Connected Apps', icon: AppWindow },
];

function normalizeTab(rawTab) {
    const value = String(rawTab || '').trim().toLowerCase();
    if (!value) return 'profile';
    if (value === 'preferences') return 'notifications';
    const available = TAB_DEFS.map((tab) => tab.id);
    if (available.includes(value)) return value;
    return 'profile';
}

export default function SettingsPage({ initialTabOverride = null }) {
    const { user, updateUser } = useAuth();
    const { legacyTab } = useParams();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const initialTab = useMemo(() => {
        if (initialTabOverride) return initialTabOverride;
        const queryTab = searchParams.get('tab');
        return normalizeTab(location.state?.activeTab || legacyTab || queryTab || 'profile');
    }, [legacyTab, location.state, searchParams, initialTabOverride]);

    const [activeTab, setActiveTab] = useState(initialTab);

    const { data: profileData } = useQuery({
        queryKey: ['settings-profile'],
        queryFn: () => settingsAPI.getProfile().then((res) => res.data?.data),
    });

    const effectiveUser = { ...user, ...profileData };

    const fullName = `${effectiveUser?.firstName || ''} ${effectiveUser?.lastName || ''}`.trim() || effectiveUser?.email || 'User';
    const roleLabel = effectiveUser?.role?.name
        || (typeof effectiveUser?.role === 'string' ? effectiveUser.role : null)
        || effectiveUser?.primaryRole?.name
        || 'Member';

    const tabs = TAB_DEFS.filter((tab) => tab.id !== 'organization' || user?.role === 'SuperAdmin');

    let activeContent = null;

    if (activeTab === 'profile') {
        activeContent = <ProfileTab user={effectiveUser} onProfileUpdated={(nextProfile) => updateUser(nextProfile)} />;
    } else if (activeTab === 'notifications') {
        activeContent = <NotificationsTab />;
    } else if (activeTab === 'organization' && user?.role === 'SuperAdmin') {
        activeContent = <OrganizationTab />;
    } else if (activeTab === 'api-keys') {
        activeContent = <ApiKeysTab />;
    } else if (activeTab === 'connected-apps') {
        activeContent = <ConnectedAppsTab />;
    }

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#f4f6fb]">
            <div className="w-full px-0 py-0">
                <div className="flex w-full min-h-[calc(100vh-64px)] flex-col gap-0 items-start md:flex-row">
                    <aside className="flex w-full shrink-0 flex-col overflow-hidden border-r border-[#e2e8f0] bg-white md:w-[240px] md:self-stretch md:sticky md:top-0">
                        <div
                            className="flex gap-0 overflow-x-auto px-0 py-0 md:flex-col"
                            style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
                        >
                            {tabs.map((tab) => (
                                <TabButton
                                    key={tab.id}
                                    tab={tab}
                                    active={activeTab === tab.id}
                                    onClick={setActiveTab}
                                />
                            ))}
                        </div>

                        <div className="mt-auto hidden border-t border-[#f1f5f9] px-[16px] pb-4 pt-4 md:block">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#6366f1] text-white text-[13px] font-bold flex items-center justify-center shrink-0">
                                    {getInitials(effectiveUser?.firstName, effectiveUser?.lastName)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[13px] font-bold text-[#0f172a] truncate">{fullName}</p>
                                    <span className="inline-flex items-center text-[10px] text-[#7c3aed] bg-[#ede9fe] px-[8px] py-[2px] rounded-full font-bold mt-1 uppercase tracking-tight">
                                        {roleLabel}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <div className="flex-1 min-w-0 w-full bg-white md:bg-[#f8fafc] md:p-8">
                        <div className="max-w-4xl mx-auto">
                            <div className="mb-6 w-full">
                                <h1 className="text-[22px] font-bold text-[#0f1623]">Settings</h1>
                                <p className="text-sm text-[#7a87a8] mt-1">Manage your account and system preferences.</p>
                            </div>
                            <div className="w-full">{activeContent}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

SettingsPage.propTypes = {
    initialTabOverride: PropTypes.string,
};
