import { createElement, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle,
    ArrowRight,
    BarChart2,
    CheckCircle2,
    ChevronDown,
    Clock3,
    FileText,
    KeyRound,
    Layers,
    LayoutDashboard,
    Mail,
    Monitor,
    PanelLeftClose,
    PanelLeftOpen,
    ScrollText,
    ShieldAlert,
    ShieldCheck,
    UserPlus,
    Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auditAPI, authAPI, rbacAPI, userAPI } from '../services/api';
import SessionCard from '../components/users/SessionCard';
import UsersList from './users/UsersList';
import RolesList from './rbac/RolesList';
import PoliciesList from './rbac/PoliciesList';
import GroupsList from './rbac/GroupsList';

function NavItem({
    icon: Icon,
    label,
    value,
    href,
    activeSection,
    onSelect,
    collapsed,
    forceActive = false,
}) {
    const navigate = useNavigate();
    const isActive = forceActive || activeSection === value;
    const iconElement = createElement(Icon, { size: collapsed ? 18 : 17 });

    const handleClick = () => {
        if (href) {
            navigate(href);
        } else {
            onSelect(value);
        }
    };

    if (collapsed) {
        return (
            <button
                onClick={handleClick}
                title={label}
                className={`w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all duration-150 ${isActive
                    ? 'bg-[#4f46e5]/25 text-[#c7d2fe]'
                    : 'text-[#93a4c3] hover:text-[#e2e8f0] hover:bg-[#1f2937]'
                    }`}
            >
                {iconElement}
            </button>
        );
    }

    return (
        <button
            onClick={handleClick}
            className={`w-full flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl text-xs cursor-pointer transition-all duration-150 border ${isActive
                ? 'bg-[#4f46e5]/25 text-[#c7d2fe] border-[#6366f1]/50 font-semibold'
                : 'text-[#b6c2d9] hover:text-[#f8fafc] hover:bg-[#1f2937] border-transparent font-medium'
                }`}
        >
            {iconElement}
            <span>{label}</span>
        </button>
    );
}

function SectionToggle({ label, expanded, active, onToggle }) {
    return (
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-4 py-2 cursor-pointer select-none group"
        >
            <span className={`text-[9px] font-semibold tracking-widest uppercase transition-colors ${active ? 'text-[#a5b4fc]' : 'text-[#7b8ba8] group-hover:text-[#cbd5e1]'}`}>
                {label}
            </span>
            <ChevronDown
                size={14}
                className={`text-[#64748b] transition-transform duration-150 ${expanded ? 'rotate-180' : ''}`}
            />
        </button>
    );
}

function SectionHeader({ title, description }) {
    return (
        <div className="mb-6">
            <h1 className="text-xl font-semibold text-aws-text">{title}</h1>
            <p className="text-sm text-[#7a87a8] mt-0.5">{description}</p>
        </div>
    );
}

function toTitleCaseAction(action = '') {
    return action
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatRelativeTime(value) {
    if (!value) return 'N/A';

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 'N/A';

    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mo ago`;

    const years = Math.floor(months / 12);
    return `${years} yr ago`;
}

function formatDate(value) {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function getStatusChip(status) {
    if (status === 'critical') {
        return {
            label: 'Critical',
            className: 'bg-red-50 text-red-600 border border-red-200',
        };
    }

    if (status === 'warning') {
        return {
            label: 'Warning',
            className: 'bg-amber-50 text-amber-600 border border-amber-200',
        };
    }

    return {
        label: 'Good',
        className: 'bg-emerald-50 text-emerald-600 border border-emerald-200',
    };
}

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

function OverviewSection({ user, roleBadge, fullName, initials, sessions, onSelectSection }) {
    const navigate = useNavigate();
    const [timeAnchors] = useState(() => {
        const now = Date.now();
        return {
            sevenDaysAgoIso: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
            thirtyDaysAgoMs: now - 30 * 24 * 60 * 60 * 1000,
        };
    });
    const { sevenDaysAgoIso, thirtyDaysAgoMs } = timeAnchors;

    const usersQuery = useQuery({
        queryKey: ['overview-users'],
        queryFn: () => userAPI.getUsers({ page: 1, limit: 500 }).then((res) => res.data),
        staleTime: 30 * 1000,
    });

    const rolesQuery = useQuery({
        queryKey: ['overview-roles'],
        queryFn: () => rbacAPI.getRoles({ page: 1, limit: 200 }).then((res) => res.data),
        staleTime: 30 * 1000,
    });

    const policiesQuery = useQuery({
        queryKey: ['overview-policies'],
        queryFn: () => rbacAPI.getPolicies({}).then((res) => res.data),
        staleTime: 30 * 1000,
    });

    const groupsQuery = useQuery({
        queryKey: ['overview-groups'],
        queryFn: () => rbacAPI.getGroups().then((res) => res.data),
        staleTime: 30 * 1000,
    });

    const recentLogsQuery = useQuery({
        queryKey: ['overview-recent-logs'],
        queryFn: () => auditAPI.getLogs({ page: 1, limit: 8 }).then((res) => res.data),
        staleTime: 20 * 1000,
    });

    const weeklyLogsQuery = useQuery({
        queryKey: ['overview-weekly-logs', sevenDaysAgoIso],
        queryFn: () =>
            auditAPI
                .getLogs({ page: 1, limit: 250, startDate: sevenDaysAgoIso })
                .then((res) => res.data),
        staleTime: 20 * 1000,
    });

    const alertsQuery = useQuery({
        queryKey: ['overview-security-alerts'],
        queryFn: () => auditAPI.getSecurityAlerts().then((res) => res.data),
        staleTime: 30 * 1000,
    });

    const roleIds = useMemo(() => {
        return (rolesQuery.data?.data || []).map((role) => role.id);
    }, [rolesQuery.data]);

    const roleDetailsQuery = useQuery({
        queryKey: ['overview-role-details', roleIds.join(',')],
        enabled: roleIds.length > 0,
        queryFn: async () => {
            const responses = await Promise.all(
                roleIds.map((id) =>
                    rbacAPI
                        .getRole(id)
                        .then((res) => res.data?.data)
                        .catch(() => null)
                )
            );
            return responses.filter(Boolean);
        },
        staleTime: 30 * 1000,
    });

    const users = usersQuery.data?.data ?? EMPTY_ARRAY;
    const usersSummary = usersQuery.data?.summary ?? EMPTY_OBJECT;
    const roles = rolesQuery.data?.data ?? EMPTY_ARRAY;
    const policies = policiesQuery.data?.data ?? EMPTY_ARRAY;
    const groups = groupsQuery.data?.data ?? EMPTY_ARRAY;
    const recentLogs = recentLogsQuery.data?.data ?? EMPTY_ARRAY;
    const weeklyLogs = weeklyLogsQuery.data?.data ?? EMPTY_ARRAY;
    const alerts = alertsQuery.data?.data?.alerts ?? EMPTY_ARRAY;
    const totalAlerts = alertsQuery.data?.data?.totalAlerts || 0;
    const roleDetails = roleDetailsQuery.data ?? EMPTY_ARRAY;

    const totalUsers = usersSummary.total ?? users.length;
    const activeSessions = sessions.length;
    const totalPolicyAssignments = roles.reduce((sum, role) => sum + (role._count?.rolePolicies || 0), 0);

    const countWeeklyActions = (matchers) => {
        return weeklyLogs.filter((log) => {
            const action = (log.action || '').toUpperCase();
            return matchers.some((matcher) => {
                if (typeof matcher === 'string') return action.includes(matcher);
                return matcher(action);
            });
        }).length;
    };

    const metricDeltas = {
        users: countWeeklyActions(['REGISTER', 'USER_CREATED']),
        sessions: countWeeklyActions([(action) => action.includes('LOGIN') && !action.includes('FAILED')]),
        policyAssignments: countWeeklyActions([(action) => action.includes('POLICY') && action.includes('ATTACH')]),
        alerts: countWeeklyActions(['PERMISSION_DENIED', 'ACCOUNT_LOCKED', 'RATE_LIMIT_EXCEEDED', 'LOGIN_FAILED']),
    };

    const mfaEnabledCount = users.filter((u) => u.mfaEnabled).length;
    const mfaCoverage = totalUsers > 0 ? Math.round((mfaEnabledCount / totalUsers) * 100) : 0;

    const inactiveUsersCount = users.filter((u) => {
        if (!u.lastLoginAt) return true;
        return new Date(u.lastLoginAt).getTime() < thirtyDaysAgoMs;
    }).length;

    const unverifiedUsersCount = usersSummary.unverified ?? users.filter((u) => !u.emailVerified).length;

    const overprivilegedRolesCount = roleDetails.filter((role) =>
        (role.rolePolicies || []).some(({ policy }) => {
            const actions = policy?.actions || [];
            const resources = policy?.resources || [];

            const wildcardAction = actions.some((a) => typeof a === 'string' && (a === '*' || a.includes('*')));
            const wildcardResource = resources.some((r) => typeof r === 'string' && (r === '*' || r.includes('*')));

            return wildcardAction || wildcardResource;
        })
    ).length;

    const latestPolicyTimestamp = policies.reduce((latest, policy) => {
        const ts = new Date(policy.updatedAt || policy.createdAt || 0).getTime();
        if (!Number.isNaN(ts) && ts > latest) return ts;
        return latest;
    }, 0);

    const criticalAlertsCount = alerts.filter((alert) => ['CRITICAL', 'HIGH'].includes(alert.severity)).length;

    const systemHealth =
        criticalAlertsCount > 0
            ? {
                label: 'Critical Security Events Detected',
                dotClass: 'bg-red-500',
                textClass: 'text-red-600',
            }
            : totalAlerts > 0
                ? {
                    label: 'Monitoring Warnings',
                    dotClass: 'bg-amber-500',
                    textClass: 'text-amber-600',
                }
                : {
                    label: 'All Systems Operational',
                    dotClass: 'bg-emerald-500',
                    textClass: 'text-emerald-600',
                };

    const postureChecks = [
        {
            label: 'MFA Coverage',
            icon: ShieldCheck,
            value: `${mfaCoverage}%`,
            status: mfaCoverage < 80 ? 'critical' : 'good',
        },
        {
            label: 'Inactive Users',
            icon: Clock3,
            value: `${inactiveUsersCount}`,
            status: inactiveUsersCount > 0 ? 'warning' : 'good',
        },
        {
            label: 'Overprivileged Roles',
            icon: ShieldAlert,
            value: `${overprivilegedRolesCount}`,
            status: overprivilegedRolesCount > 0 ? 'critical' : 'good',
        },
        {
            label: 'Unverified Emails',
            icon: Mail,
            value: `${unverifiedUsersCount}`,
            status: unverifiedUsersCount > 0 ? 'warning' : 'good',
        },
    ];

    const topActiveUsers = useMemo(() => {
        const bucket = new Map();

        weeklyLogs.forEach((log) => {
            const email = log.user?.email;
            if (!email) return;

            const key = log.user?.id || email;
            const existing = bucket.get(key) || {
                id: key,
                email,
                name: `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim() || email,
                count: 0,
                lastActiveAt: log.createdAt,
            };

            existing.count += 1;
            if (new Date(log.createdAt).getTime() > new Date(existing.lastActiveAt).getTime()) {
                existing.lastActiveAt = log.createdAt;
            }

            bucket.set(key, existing);
        });

        return Array.from(bucket.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }, [weeklyLogs]);

    const roleDistribution = (() => {
        let superAdmin = 0;
        let readOnly = 0;
        let custom = 0;

        users.forEach((u) => {
            const roleNames = (u.roles || []).map((role) => (role.name || '').toLowerCase());

            if (roleNames.some((n) => n.includes('superadmin') || n.includes('super admin'))) {
                superAdmin += 1;
                return;
            }

            if (roleNames.some((n) => n.includes('readonly') || n.includes('read only'))) {
                readOnly += 1;
                return;
            }

            custom += 1;
        });

        const total = superAdmin + readOnly + custom || 1;

        return {
            superAdmin,
            readOnly,
            custom,
            superAdminPct: Math.round((superAdmin / total) * 100),
            readOnlyPct: Math.round((readOnly / total) * 100),
            customPct: Math.round((custom / total) * 100),
        };
    })();

    const handleExportUserReport = () => {
        const columns = ['Name', 'Email', 'Status', 'MFA', 'Email Verified', 'Roles'];

        const rows = users.map((u) => {
            const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
            const rolesLabel = (u.roles || []).map((r) => r.name).join('; ');
            return [
                name || 'N/A',
                u.email || 'N/A',
                u.status || 'UNKNOWN',
                u.mfaEnabled ? 'Enabled' : 'Disabled',
                u.emailVerified ? 'Verified' : 'Unverified',
                rolesLabel || 'None',
            ];
        });

        const csv = [columns, ...rows]
            .map((line) => line.map((item) => `"${String(item).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'iam-user-report.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    const metricCards = [
        {
            title: 'Total Users',
            value: totalUsers,
            delta: metricDeltas.users,
            icon: Users,
            iconClass: 'bg-[#4f46e5]/10 text-[#4f46e5]',
        },
        {
            title: 'Active Sessions',
            value: activeSessions,
            delta: metricDeltas.sessions,
            icon: Monitor,
            iconClass: 'bg-[#0284c7]/10 text-[#0284c7]',
        },
        {
            title: 'Policies Attached',
            value: totalPolicyAssignments,
            delta: metricDeltas.policyAssignments,
            icon: FileText,
            iconClass: 'bg-[#16a34a]/10 text-[#16a34a]',
        },
        {
            title: 'Security Alerts',
            value: totalAlerts,
            delta: metricDeltas.alerts,
            icon: AlertTriangle,
            iconClass: totalAlerts > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600',
        },
    ];

    const accessSummaryRows = [
        { label: 'Users', count: totalUsers, icon: Users, section: 'users' },
        { label: 'Roles', count: roles.length, icon: KeyRound, section: 'roles' },
        { label: 'Policies', count: policies.length, icon: FileText, section: 'policies' },
        { label: 'Groups', count: groups.length, icon: Layers, section: 'groups' },
    ];

    const quickActions = [
        {
            label: 'Invite New User',
            icon: UserPlus,
            onClick: () => navigate('/dashboard/users/new'),
        },
        {
            label: 'Create Role',
            icon: KeyRound,
            onClick: () => onSelectSection('roles'),
        },
        {
            label: 'Attach Policy',
            icon: FileText,
            onClick: () => onSelectSection('policies'),
        },
        {
            label: 'View Audit Logs',
            icon: ScrollText,
            onClick: () => navigate('/dashboard/audit-logs'),
        },
        {
            label: 'Manage MFA Settings',
            icon: ShieldCheck,
            onClick: () => navigate('/dashboard/security', { state: { activeTab: 'mfa' } }),
        },
        {
            label: 'Export User Report',
            icon: LayoutDashboard,
            onClick: handleExportUserReport,
        },
    ];

    return (
        <div className="animate-in space-y-6">
            <SectionHeader
                title="AegisMesh Console"
                description="IAM command center with live health, security posture, and access activity."
            />

            <div className="w-full bg-white border border-[#d0d7e8] rounded-2xl px-6 py-4 shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${systemHealth.dotClass}`}></span>
                    <span className={`text-sm font-semibold ${systemHealth.textClass}`}>{systemHealth.label}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-[#3a4560] xl:justify-end">
                    <div className="min-w-[160px] flex-1 rounded-xl border border-[#edf0f7] bg-[#f8f9fd] px-3 py-2 sm:flex-none">
                        Last policy eval: {latestPolicyTimestamp ? formatRelativeTime(latestPolicyTimestamp) : 'N/A'}
                    </div>
                    <div className="min-w-[160px] flex-1 rounded-xl border border-[#edf0f7] bg-[#f8f9fd] px-3 py-2 sm:flex-none">
                        Active sessions: {activeSessions}
                    </div>
                    <div className="min-w-[160px] flex-1 rounded-xl border border-[#edf0f7] bg-[#f8f9fd] px-3 py-2 sm:flex-none">
                        Uptime: {totalAlerts > 0 ? 'Degraded' : 'Stable'}
                    </div>
                    <div className="min-w-[160px] flex-1 rounded-xl border border-[#edf0f7] bg-[#f8f9fd] px-3 py-2 sm:flex-none">
                        {totalAlerts > 0
                            ? `Last incident: ${formatRelativeTime(alerts[0]?.lastSeen || alerts[0]?.firstSeen)}`
                            : 'No incidents in last 24h'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {metricCards.map((card) => {
                    const Icon = card.icon;

                    return (
                        <div key={card.title} className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold tracking-wide uppercase text-[#7a87a8]">{card.title}</p>
                                <div className={`rounded-xl p-2 ${card.iconClass}`}>
                                    <Icon size={16} />
                                </div>
                            </div>
                            <p className="text-3xl font-semibold text-[#0f1623] leading-none">{card.value}</p>
                            <p className="text-xs text-[#7a87a8] mt-2">+{card.delta} this week</p>
                        </div>
                    );
                })}
            </div>

            <div className="bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-[16px] font-semibold text-[#0f1623]">Security Posture</h2>
                        <p className="text-xs text-[#7a87a8] mt-1">
                            Live checks for MFA adoption, inactive identities, privilege risks, and email trust.
                        </p>
                    </div>
                    <ShieldCheck size={18} className="text-[#4f46e5]" />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {postureChecks.map((check) => {
                        const chip = getStatusChip(check.status);
                        const Icon = check.icon;

                        return (
                            <div key={check.label} className="border border-[#e5eaf3] rounded-xl p-3 bg-[#f8f9fd]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-white border border-[#e3e7f1] text-[#4f46e5]">
                                            <Icon size={14} />
                                        </div>
                                        <p className="text-xs font-semibold text-[#3a4560]">{check.label}</p>
                                    </div>
                                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${chip.className}`}>
                                        {chip.label}
                                    </span>
                                </div>
                                <p className="text-sm font-semibold text-[#0f1623] mt-2">{check.value}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-[16px] font-semibold text-[#0f1623]">Recent Activity</h2>
                    </div>

                    <div className="space-y-3">
                        {recentLogsQuery.isLoading ? (
                            <p className="text-sm text-[#7a87a8]">Loading activity...</p>
                        ) : recentLogs.length === 0 ? (
                            <p className="text-sm text-[#7a87a8]">No recent activity found.</p>
                        ) : (
                            recentLogs.map((log) => {
                                const isSuccess = (log.result || '').toUpperCase() === 'SUCCESS';
                                const isFailure = ['FAILURE', 'ERROR', 'BLOCKED'].includes((log.result || '').toUpperCase());
                                const dotClass = isSuccess
                                    ? 'bg-emerald-500'
                                    : isFailure
                                        ? 'bg-red-500'
                                        : 'bg-amber-500';

                                return (
                                    <div key={log.id} className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`}></span>
                                                <p className="text-sm font-medium text-[#0f1623] truncate">
                                                    {toTitleCaseAction(log.action)}
                                                </p>
                                            </div>
                                            <p className="text-xs text-[#7a87a8] mt-0.5 truncate">
                                                {log.user?.email || 'System'}
                                            </p>
                                        </div>
                                        <p className="text-xs text-[#7a87a8] shrink-0">{formatRelativeTime(log.createdAt)}</p>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/audit-logs')}
                        className="mt-4 text-sm text-[#4f46e5] font-medium hover:text-[#3730a3] transition-colors inline-flex items-center gap-1"
                    >
                        View All Logs
                        <ArrowRight size={14} />
                    </button>
                </div>

                <div className="bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm">
                    <h2 className="text-[16px] font-semibold text-[#0f1623] mb-4">Access Control Summary</h2>

                    <div className="space-y-2">
                        {accessSummaryRows.map((item) => {
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.label}
                                    className="flex items-center justify-between p-3 border border-[#edf0f7] rounded-xl bg-[#f8f9fd]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#4f46e5]/10 rounded-lg p-2 text-[#4f46e5]">
                                            <Icon size={14} />
                                        </div>
                                        <p className="text-sm font-medium text-[#0f1623]">{item.label}</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-semibold text-[#3a4560] bg-white border border-[#d0d7e8] px-2 py-0.5 rounded-full">
                                            {item.count}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => onSelectSection(item.section)}
                                            className="text-xs text-[#4f46e5] hover:text-[#3730a3] font-medium inline-flex items-center gap-1"
                                        >
                                            Manage
                                            <ArrowRight size={12} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-5">
                        <p className="text-xs font-semibold tracking-wide uppercase text-[#7a87a8] mb-2">Role Distribution</p>
                        <div className="h-2 rounded-full bg-[#e6eaf4] overflow-hidden flex">
                            <div className="bg-[#4f46e5]" style={{ width: `${roleDistribution.superAdminPct}%` }}></div>
                            <div className="bg-[#0284c7]" style={{ width: `${roleDistribution.readOnlyPct}%` }}></div>
                            <div className="bg-[#94a3b8]" style={{ width: `${roleDistribution.customPct}%` }}></div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] text-[#7a87a8]">
                            <div>
                                <span className="font-semibold text-[#0f1623]">{roleDistribution.superAdmin}</span> SuperAdmin
                            </div>
                            <div>
                                <span className="font-semibold text-[#0f1623]">{roleDistribution.readOnly}</span> ReadOnly
                            </div>
                            <div>
                                <span className="font-semibold text-[#0f1623]">{roleDistribution.custom}</span> Custom
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                <div className="bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm">
                    <h2 className="text-[16px] font-semibold text-[#0f1623] mb-4">Current User Profile</h2>

                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-full bg-[#4f46e5] text-white font-bold flex items-center justify-center text-sm">
                            {initials}
                        </div>

                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0f1623] truncate">{fullName}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="inline-flex items-center rounded-full bg-[#4f46e5]/10 px-2 py-0.5 text-xs font-semibold text-[#4f46e5]">
                                    {roleBadge}
                                </span>
                                {user?.emailVerified ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                                        <CheckCircle2 size={12} />
                                        Verified
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
                                        <AlertTriangle size={12} />
                                        Unverified
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-[#7a87a8]">Email</span>
                            <span className="text-[#3a4560] truncate max-w-[65%] text-right">{user?.email || 'N/A'}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#7a87a8]">MFA</span>
                            <span className={`font-medium ${user?.mfaEnabled ? 'text-emerald-600' : 'text-red-600'}`}>
                                {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        {!user?.mfaEnabled && (
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/security', { state: { activeTab: 'mfa' } })}
                                className="text-xs text-[#4f46e5] hover:text-[#3730a3] font-medium inline-flex items-center gap-1"
                            >
                                Enable Now
                                <ArrowRight size={12} />
                            </button>
                        )}
                        <div className="flex items-center justify-between">
                            <span className="text-[#7a87a8]">Last login</span>
                            <span className="text-[#3a4560] text-right">{formatDate(sessions[0]?.createdAt)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#7a87a8]">Account created</span>
                            <span className="text-[#3a4560] text-right">{formatDate(user?.createdAt)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm">
                    <h2 className="text-[16px] font-semibold text-[#0f1623] mb-4">Top Active Users (This Week)</h2>
                    {weeklyLogsQuery.isLoading ? (
                        <p className="text-sm text-[#7a87a8]">Loading active users...</p>
                    ) : topActiveUsers.length === 0 ? (
                        <p className="text-sm text-[#7a87a8]">No user activity in the selected window.</p>
                    ) : (
                        <div className="space-y-3">
                            {topActiveUsers.map((activeUser) => {
                                const initialsText = (activeUser.name || activeUser.email)
                                    .split(' ')
                                    .map((chunk) => chunk[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase();

                                return (
                                    <div key={activeUser.id} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-[#4f46e5]/10 text-[#4f46e5] text-[11px] font-semibold flex items-center justify-center">
                                                {initialsText}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-[#0f1623] truncate">{activeUser.name}</p>
                                                <p className="text-xs text-[#7a87a8] truncate">{activeUser.email}</p>
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <span className="inline-flex items-center rounded-full bg-[#f4f6fb] border border-[#d0d7e8] px-2 py-0.5 text-xs font-semibold text-[#3a4560]">
                                                {activeUser.count} evts
                                            </span>
                                            <p className="text-[11px] text-[#7a87a8] mt-1">
                                                {formatRelativeTime(activeUser.lastActiveAt)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm">
                    <h2 className="text-[16px] font-semibold text-[#0f1623] mb-4">Quick Actions</h2>
                    <div className="space-y-2">
                        {quickActions.map((action) => {
                            const Icon = action.icon;

                            return (
                                <button
                                    key={action.label}
                                    type="button"
                                    onClick={action.onClick}
                                    className="w-full flex items-center justify-between p-3 rounded-xl border border-[#edf0f7] bg-[#f8f9fd] hover:bg-[#eef2ff] transition-colors"
                                >
                                    <span className="inline-flex items-center gap-2 text-sm font-medium text-[#0f1623]">
                                        <Icon size={14} className="text-[#4f46e5]" />
                                        {action.label}
                                    </span>
                                    <ArrowRight size={14} className="text-[#7a87a8]" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

function SessionsSection({ sessions, sessionsLoading, revokingSession, onRevoke }) {
    return (
        <div className="animate-in">
            <SectionHeader
                title="Sessions"
                description="Track devices and revoke active sessions when needed."
            />

            {sessionsLoading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-aws-orange border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : sessions.length === 0 ? (
                <div className="card-glass text-center">
                    <p className="text-aws-text-dim">No active sessions found.</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {sessions.map((session, index) => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            isCurrent={index === 0}
                            onRevoke={onRevoke}
                            isRevoking={revokingSession === session.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function SecuritySection({ user, sessions }) {
    const navigate = useNavigate();

    return (
        <div className="animate-in max-w-3xl">
            <SectionHeader
                title="Security"
                description="Manage MFA, password posture, and session safety controls."
            />

            <div className="space-y-6">
                <div className="card-glass">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-aws-text flex items-center gap-2">
                                Two-Factor Authentication
                            </h3>
                            <p className="text-sm text-aws-text-dim mt-1">
                                Add an extra layer of security with TOTP-based MFA.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/security', { state: { activeTab: 'mfa' } })}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${user?.mfaEnabled
                                ? 'bg-aws-navy-light text-aws-text border border-aws-border hover:border-aws-orange/30'
                                : 'btn-accent-glow'
                                }`}
                        >
                            {user?.mfaEnabled ? 'Manage' : 'Enable'}
                        </button>
                    </div>
                </div>

                <div className="card-glass">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-aws-text flex items-center gap-2">
                                Password
                            </h3>
                            <p className="text-sm text-aws-text-dim mt-1">
                                Last changed: {user?.passwordChangedAt
                                    ? new Date(user.passwordChangedAt).toLocaleDateString()
                                    : 'Never'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/dashboard/security', { state: { activeTab: 'password' } })}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-aws-navy-light text-aws-text border border-aws-border hover:border-aws-orange/30 transition-all"
                        >
                            Change
                        </button>
                    </div>
                </div>

                <div className="card-glass">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-aws-text flex items-center gap-2">
                                Active Sessions
                            </h3>
                            <p className="text-sm text-aws-text-dim mt-1">
                                {sessions.length} active session(s)
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate('/settings/sessions')}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-aws-navy-light text-aws-text border border-aws-border hover:border-aws-orange/30 transition-all"
                        >
                            Open Controls
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function UsersSection() {
    return <UsersList />;
}

function RolesSection() {
    return <RolesList />;
}

function PoliciesSection() {
    return <PoliciesList />;
}

function GroupsSection() {
    return <GroupsList />;
}

function LogsSection() {
    // Navigation to /dashboard/audit-logs handles content directly
    return null;
}

function AnalyticsSection() {
    // Navigation to /dashboard/audit-logs/stats handles content directly
    return null;
}

export default function Dashboard() {
    const { user } = useAuth();

    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [revokingSession, setRevokingSession] = useState(null);
    const [activeSection, setActiveSection] = useState('overview');

    async function fetchSessions() {
        try {
            const { data } = await authAPI.getSessions();
            setSessions(data.data);
        } catch (err) {
            console.error('Failed to fetch sessions', err);
        } finally {
            setSessionsLoading(false);
        }
    }

    useEffect(() => {
        const timer = window.setTimeout(() => {
            fetchSessions();
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    const handleRevokeSession = async (sessionId) => {
        setRevokingSession(sessionId);
        try {
            await authAPI.revokeSession(sessionId);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        } catch (err) {
            console.error('Failed to revoke session', err);
        } finally {
            setRevokingSession(null);
        }
    };

    const initials = useMemo(() => {
        const first = user?.firstName?.[0] || '';
        const last = user?.lastName?.[0] || '';
        return `${first}${last}`.toUpperCase() || 'U';
    }, [user]);

    const fullName = useMemo(() => {
        return `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'AegisMesh User';
    }, [user]);

    const roleBadge = useMemo(() => {
        if (user?.role?.name) return user.role.name;
        if (typeof user?.role === 'string') return user.role;
        if (user?.primaryRole?.name) return user.primaryRole.name;
        if (Array.isArray(user?.roles) && user.roles.length > 0) {
            return user.roles[0]?.name || 'AegisMesh User';
        }
        return 'AegisMesh User';
    }, [user]);

    const renderSectionContent = () => {
        switch (activeSection) {
            case 'overview':
                return (
                    <OverviewSection
                        user={user}
                        roleBadge={roleBadge}
                        fullName={fullName}
                        initials={initials}
                        sessions={sessions}
                        onSelectSection={setActiveSection}
                    />
                );
            case 'sessions':
                return (
                    <SessionsSection
                        sessions={sessions}
                        sessionsLoading={sessionsLoading}
                        revokingSession={revokingSession}
                        onRevoke={handleRevokeSession}
                    />
                );
            case 'security':
                return <SecuritySection user={user} sessions={sessions} />;
            case 'users':
                return <UsersSection />;
            case 'roles':
                return <RolesSection />;
            case 'policies':
                return <PoliciesSection />;
            case 'groups':
                return <GroupsSection />;
            default:
                return (
                    <OverviewSection
                        user={user}
                        roleBadge={roleBadge}
                        fullName={fullName}
                        initials={initials}
                        sessions={sessions}
                        onSelectSection={setActiveSection}
                    />
                );
        }
    };

    return <div>{renderSectionContent()}</div>;
}



