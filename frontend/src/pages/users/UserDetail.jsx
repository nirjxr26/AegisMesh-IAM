import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    ArrowLeft, Edit, AlertCircle, Shield, Globe, ShieldCheck,
    Smartphone, History, LayoutDashboard, Fingerprint, Lock, ShieldX, Users
} from 'lucide-react';
import { userAPI, rbacAPI, auditAPI } from '../../services/api';
import toast from 'react-hot-toast';

import UserAvatar from '../../components/users/UserAvatar';
import UserStatusBadge from '../../components/users/UserStatusBadge';
import PermissionChecker from '../../components/users/PermissionChecker';
import SessionCard from '../../components/users/SessionCard';

// Utility: normalize various API response shapes into a plain array
const ensureArray = (res) => {
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    return [];
};

function OverviewTab({ user, groups, userId }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-[#0f1623] mb-4 border-b border-[#d0d7e8] pb-2">User Details</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                        <div>
                            <dt className="text-xs text-[#7a87a8] font-medium uppercase mb-1">First Name</dt>
                            <dd className="text-sm text-slate-200">{user.firstName}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-[#7a87a8] font-medium uppercase mb-1">Last Name</dt>
                            <dd className="text-sm text-slate-200">{user.lastName}</dd>
                        </div>
                        <div className="col-span-2">
                            <dt className="text-xs text-[#7a87a8] font-medium uppercase mb-1">Email Address</dt>
                            <dd className="text-sm text-slate-200">{user.email}</dd>
                        </div>
                    </dl>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-[#0f1623] mb-4 border-b border-[#d0d7e8] pb-2">Assigned Groups</h3>
                    {groups.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {groups.map(g => (
                                <div key={g.id} className="bg-[#ffffff] border border-[#d0d7e8] px-3 py-1.5 rounded-lg text-sm text-[#3a4560] flex items-center gap-2">
                                    <Users size={14} className="text-[#4f46e5]" />
                                    {g.name}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[#7a87a8] text-sm italic">User is not assigned to any groups.</p>
                    )}
                </div>
            </div>
            <div>
                <PermissionChecker userId={userId} />
            </div>
        </div>
    );
}

OverviewTab.propTypes = {
    user: PropTypes.shape({
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        email: PropTypes.string,
    }).isRequired,
    groups: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
    })).isRequired,
    userId: PropTypes.string.isRequired,
};

function RolesTab({ roles, permissions }) {
    return (
        <div className="animate-fade-in-up space-y-8">
            <div>
                <h3 className="text-lg font-bold text-[#0f1623] mb-4 flex items-center gap-2 border-b border-[#d0d7e8] pb-2">
                    <ShieldCheck className="text-green-400" /> Assigned Roles
                </h3>
                {roles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roles.map(r => (
                            <div key={r.id} className="bg-[#ffffff] border border-[#d0d7e8] rounded-lg p-4">
                                <h4 className="font-bold text-slate-200 mb-1">{r.name}</h4>
                                <p className="text-xs text-[#7a87a8] line-clamp-2">{r.description || 'No description provided.'}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-lg p-6 text-center text-[#7a87a8]">
                        No roles are directly assigned to this user.
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-lg font-bold text-[#0f1623] mb-4 flex items-center gap-2 border-b border-[#d0d7e8] pb-2">
                    <Lock className="text-[#4f46e5]" /> Direct Permissions
                </h3>
                {permissions.length > 0 ? (
                    <div className="bg-[#ffffff] border border-[#d0d7e8] rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-[#f4f6fb]">
                                <tr>
                                    <th className="px-4 py-2 font-medium text-[#3a4560] text-left">Action</th>
                                    <th className="px-4 py-2 font-medium text-[#3a4560] text-center">Resource</th>
                                    <th className="px-4 py-2 font-medium text-[#3a4560] text-center">Effect</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {permissions.map((p) => (
                                    <tr key={`${p.action}-${p.resource}`}>
                                        <td className="px-4 py-2 text-[#3a4560] font-mono text-xs text-left">{p.action}</td>
                                        <td className="px-4 py-2 text-[#7a87a8] font-mono text-xs text-center">{p.resource}</td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${p.effect === 'ALLOW' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {p.effect}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-lg p-6 text-center text-[#7a87a8] text-sm">
                        No direct permissions found. Access is managed via Groups or Roles.
                    </div>
                )}
            </div>
        </div>
    );
}

RolesTab.propTypes = {
    roles: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
    })).isRequired,
    permissions: PropTypes.arrayOf(PropTypes.shape({
        action: PropTypes.string.isRequired,
        resource: PropTypes.string.isRequired,
        effect: PropTypes.string.isRequired,
    })).isRequired,
};

function SecurityTab({ user, sessions, sessionsLoading, onRevokeAll, onRevoke, revokingId }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
            <div className="space-y-6">
                <div className="bg-[#ffffff] border border-[#d0d7e8] rounded-xl p-6">
                    <h3 className="text-lg font-bold text-[#0f1623] mb-4">MFA Status</h3>
                    <div className="flex items-center gap-4 border-t border-[#d0d7e8] pt-4">
                        {user.mfaEnabled ? (
                            <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center shrink-0">
                                <ShieldCheck size={24} />
                            </div>
                        ) : (
                            <div className="w-12 h-12 bg-[#f4f6fb] text-[#7a87a8] rounded-full flex items-center justify-center shrink-0 border border-[#d0d7e8]">
                                <ShieldX size={24} />
                            </div>
                        )}
                        <div>
                            <h4 className={`text-lg font-medium ${user.mfaEnabled ? 'text-green-400' : 'text-[#7a87a8]'}`}>
                                {user.mfaEnabled ? 'Verified & Enabled' : 'MFA Not Configured'}
                            </h4>
                            <p className="text-sm text-[#7a87a8] mt-1">Multi-factor authentication adds an extra layer of security.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-4 border-b border-[#d0d7e8] pb-2">
                    <h3 className="text-lg font-bold text-[#0f1623]">Active Sessions</h3>
                    {(sessions.length > 0) && (
                        <button
                            onClick={onRevokeAll}
                            className="text-xs font-semibold uppercase text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded transition-colors"
                        >
                            Revoke All
                        </button>
                    )}
                </div>
                <div className="space-y-3">
                    {sessionsLoading ? (
                        <p className="text-[#7a87a8] text-sm text-center py-4">Loading sessions...</p>
                    ) : sessions.length > 0 ? (
                        sessions.map((session) => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                isCurrent={false}
                                onRevoke={onRevoke}
                                isRevoking={revokingId === session.id}
                            />
                        ))
                    ) : (
                        <div className="bg-[#ffffff] border border-[#d0d7e8] rounded-xl p-8 text-center">
                            <p className="text-[#7a87a8]">User has no active sessions.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

SecurityTab.propTypes = {
    user: PropTypes.shape({
        mfaEnabled: PropTypes.bool,
    }).isRequired,
    sessions: PropTypes.arrayOf(PropTypes.object).isRequired,
    sessionsLoading: PropTypes.bool,
    onRevokeAll: PropTypes.func.isRequired,
    onRevoke: PropTypes.func.isRequired,
    revokingId: PropTypes.string,
};

function AuditTab({ auditLogs, auditLoading }) {
    return (
        <div className="animate-fade-in-up">
            <h3 className="text-lg font-bold text-[#0f1623] mb-4 border-b border-[#d0d7e8] pb-2">Activity Feed</h3>
            {auditLoading ? (
                <p className="text-[#7a87a8] py-4 text-center">Loading activity feed...</p>
            ) : auditLogs.length > 0 ? (
                <div className="space-y-4">
                    {auditLogs.map(log => (
                        <div key={log.id} className="flex gap-4 p-4 bg-[#ffffff] border border-[#d0d7e8] rounded-lg">
                            <div className="text-[#7a87a8] mt-0.5"><History size={16} /></div>
                            <div>
                                <div className="text-sm font-medium text-slate-200">
                                    {log.action} <span className="text-[#7a87a8]">on</span> {log.resource}
                                </div>
                                <div className="text-xs text-[#7a87a8] mt-1 flex gap-3">
                                    <span>{new Date(log.createdAt).toLocaleString()}</span>
                                    <span>IP: {log.ipAddress}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-[#ffffff] border border-[#d0d7e8] rounded-xl p-8 text-center text-[#7a87a8] text-sm">
                    No activity records found for this user.
                </div>
            )}
        </div>
    );
}

AuditTab.propTypes = {
    auditLogs: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        action: PropTypes.string.isRequired,
        resource: PropTypes.string.isRequired,
        createdAt: PropTypes.string.isRequired,
        ipAddress: PropTypes.string,
    })).isRequired,
    auditLoading: PropTypes.bool,
};

export default function UserDetail() {
    const { id: userId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('overview');
    const [revokingId, setRevokingId] = useState(null);
    const [showRevokeAll, setShowRevokeAll] = useState(false);

    useEffect(() => {
        if (!userId) {
            navigate('/dashboard/users');
        }
    }, [navigate, userId]);

    // Queries
    const { data: userRes, isLoading: userLoading, error: userError, refetch: refetchUser } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => userAPI.getUser(userId),
        enabled: !!userId,
    });

    const { data: rolesRes } = useQuery({
        queryKey: ['user-roles', userId],
        queryFn: () => rbacAPI.getUserRoles(userId).then(res => res.data).catch(() => ({ data: [] })),
        enabled: activeTab === 'roles' && !!userId,
    });

    const { data: groupRes } = useQuery({
        queryKey: ['user-groups', userId],
        queryFn: () => rbacAPI.getUserGroups(userId).then(res => res.data).catch(() => ({ data: [] })),
        enabled: activeTab === 'overview' && !!userId,
    });

    const { data: permissionsRes } = useQuery({
        queryKey: ['user-permissions', userId],
        queryFn: () => rbacAPI.getUserPermissions(userId).then(res => res.data).catch(() => ({ data: [] })),
        enabled: activeTab === 'roles' && !!userId,
    });

    const { data: sessionsRes, isLoading: sessionsLoading } = useQuery({
        queryKey: ['user-sessions', userId],
        queryFn: () => userAPI.getUserSessions(userId).then(res => res.data).catch(() => ({ data: [] })),
        enabled: activeTab === 'security' && !!userId,
    });

    const { data: auditRes, isLoading: auditLoading } = useQuery({
        queryKey: ['user-audit', userId],
        queryFn: () => auditAPI.getLogs({ userId, limit: 10 }).then(res => res.data).catch(() => ({ data: [] })),
        enabled: activeTab === 'audit' && !!userId,
    });

    // Mutations
    const revokeSessionMutation = useMutation({
        mutationFn: (sessionId) => userAPI.revokeSession(userId, sessionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-sessions', userId] });
            toast.success('Session revoked');
            setRevokingId(null);
        },
        onError: () => {
            toast.error('Failed to revoke session');
            setRevokingId(null);
        }
    });

    const revokeAllSessionsMutation = useMutation({
        mutationFn: () => userAPI.revokeAllSessions(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['user-sessions', userId] });
            toast.success('All sessions revoked');
            setShowRevokeAll(false);
        },
        onError: (err) => {
            toast.error(err.response?.data?.error?.message || 'Failed to revoke sessions');
            setShowRevokeAll(false);
        }
    });

    const user = (
        userRes?.data?.data?.user ??
        userRes?.data?.data ??
        userRes?.data?.user ??
        userRes?.data ??
        null
    );

    const roles = ensureArray(rolesRes);
    const groups = ensureArray(groupRes);
    const permissions = ensureArray(permissionsRes);
    const sessions = ensureArray(sessionsRes);
    const auditLogs = ensureArray(auditRes);

    if (!userId) return null;

    if (userLoading) {
        return (
            <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center text-[#7a87a8]">
                <Globe className="animate-spin mb-4" size={32} />
                <p className="ml-3">Loading user details...</p>
            </div>
        );
    }

    if (userError || !user) {
        return (
            <div className="min-h-screen bg-[#f4f6fb] p-6 flex flex-col items-center justify-center text-[#7a87a8]">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-[#0f1623] mb-2">{userError ? 'Failed to load user' : 'User Not Found'}</h2>
                <button
                    onClick={() => userError ? refetchUser() : navigate('/dashboard/users')}
                    className="mt-2 px-4 py-2 rounded-lg text-sm border border-[#d0d7e8] text-[#3a4560] hover:bg-[#eef1f8]"
                >
                    {userError ? 'Retry' : 'Return to Directory'}
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={16} /> },
        { id: 'roles', label: 'Roles & Permissions', icon: <Shield size={16} /> },
        { id: 'security', label: 'Security & Auth', icon: <Fingerprint size={16} /> },
        { id: 'audit', label: 'Audit History', icon: <History size={16} /> },
    ];

    return (
        <div className="min-h-screen bg-[#f4f6fb] text-slate-200 font-sans p-6 pb-20">
            <div className="max-w-[1200px] mx-auto space-y-6">

                <button
                    onClick={() => navigate('/dashboard/users')}
                    className="flex items-center gap-2 text-sm text-[#7a87a8] hover:text-[#0f1623] transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Users
                </button>

                <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl overflow-hidden shadow-sm flex flex-col md:flex-row">
                    <div className="p-6 md:p-8 flex-1 flex flex-col sm:flex-row items-center sm:items-start gap-6 relative max-w-2xl bg-[#f4f6fb]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px]"></div>
                        <UserAvatar user={user} size="lg" />
                        <div className="text-center sm:text-left z-10">
                            <h1 className="text-2xl font-bold text-[#0f1623] mb-1">
                                {user.firstName} {user.lastName}
                            </h1>
                            <div className="text-[#7a87a8] mb-3 flex items-center justify-center sm:justify-start gap-2">
                                {user.email}
                                {user.emailVerified && <span className="bg-green-500/20 text-green-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide">Verified</span>}
                            </div>
                            <div className="flex items-center justify-center sm:justify-start gap-3">
                                <UserStatusBadge status={user.status} />
                                <span className="text-xs text-[#7a87a8] border border-[#d0d7e8] px-2 py-0.5 rounded-full font-mono bg-[#f4f6fb]">
                                    ID: {String(user?.id || 'N/A').split('-')[0]}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 md:p-8 flex-1 border-t md:border-t-0 md:border-l border-[#d0d7e8] bg-[#f4f6fb] flex flex-col justify-center">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <h4 className="text-[11px] uppercase tracking-wider text-[#7a87a8] font-semibold mb-1">Failed Logins</h4>
                                <div className={`text-2xl font-bold ${user.failedLoginCount > 3 ? 'text-red-400' : 'text-slate-200'}`}>
                                    {user.failedLoginCount || 0}
                                </div>
                            </div>
                            <div>
                                <h4 className="text-[11px] uppercase tracking-wider text-[#7a87a8] font-semibold mb-1">Last Active</h4>
                                <div className="text-sm font-medium text-[#3a4560] mt-1">
                                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                                </div>
                            </div>
                            <div className="col-span-2">
                                <h4 className="text-[11px] uppercase tracking-wider text-[#7a87a8] font-semibold mb-1">Member Since</h4>
                                <div className="text-sm font-medium text-[#3a4560]">
                                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate(`/dashboard/users/${userId}/edit`)}
                            className="w-full flex items-center justify-center gap-2 bg-[#dde2f0] hover:bg-[#d0d7e8] text-[#0f1623] py-2 rounded-lg font-medium text-sm transition-colors border border-[#b8c2d8]"
                        >
                            <Edit size={16} /> Edit Profile
                        </button>
                    </div>
                </div>

                <div className="flex overflow-x-auto no-scrollbar gap-2 bg-[#ffffff] p-1.5 rounded-xl border border-[#d0d7e8]">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-[#f4f6fb] text-[#0f1623] shadow-sm border border-[#d0d7e8]'
                                : 'text-[#7a87a8] hover:text-[#0f1623] hover:bg-[#eef1f8] border border-transparent'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="bg-[#eef1f8] border border-[#d0d7e8] rounded-xl p-6 min-h-[400px]">
                    {activeTab === 'overview' && <OverviewTab user={user} groups={groups} userId={userId} />}
                    {activeTab === 'roles' && <RolesTab roles={roles} permissions={permissions} />}
                    {activeTab === 'security' && (
                        <SecurityTab
                            user={user}
                            sessions={sessions}
                            sessionsLoading={sessionsLoading}
                            onRevokeAll={() => setShowRevokeAll(true)}
                            onRevoke={(id) => { setRevokingId(id); revokeSessionMutation.mutate(id); }}
                            revokingId={revokingId}
                        />
                    )}
                    {activeTab === 'audit' && <AuditTab auditLogs={auditLogs} auditLoading={auditLoading} />}
                </div>
            </div>

            {showRevokeAll && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in-up">
                    <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-[#0f1623] mb-2 flex items-center gap-2">
                                <ShieldX className="text-red-500 w-5 h-5" /> Revoke All Sessions
                            </h3>
                            <p className="text-[#3a4560]">
                                Are you sure you want to revoke all active sessions for <strong>{user.email}</strong>? They will be immediately logged out of all devices.
                            </p>
                        </div>
                        <div className="p-4 border-t border-[#d0d7e8] flex justify-end gap-3 bg-[#f4f6fb]">
                            <button onClick={() => setShowRevokeAll(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-[#3a4560] hover:text-[#0f1623] bg-[#dde2f0] hover:bg-[#d0d7e8] transition-colors">
                                Cancel
                            </button>
                            <button onClick={() => revokeAllSessionsMutation.mutate()} className="px-4 py-2 rounded-lg text-sm font-medium text-[#0f1623] bg-red-600 hover:bg-red-700 transition-colors">
                                Revoke All
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}


