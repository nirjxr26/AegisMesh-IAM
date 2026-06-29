import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    AlertTriangle, Clock3, FileText, KeyRound, Layers, LayoutDashboard,
    Mail, Monitor, ScrollText, ShieldAlert, ShieldCheck, UserPlus, Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auditAPI, authAPI, rbacAPI, userAPI } from '../services/api';
import SessionCard from '../components/users/SessionCard';
import UsersList from './users/UsersList';
import RolesList from './rbac/RolesList';
import PoliciesList from './rbac/PoliciesList';
import GroupsList from './rbac/GroupsList';
import { getSystemHealth, computeRoleDistribution, buildCsv, SectionHeader } from './dashboard/sections/shared';
import { StatsCards, SecurityAlerts, RecentActivity, UserChart, QuickActions } from './dashboard/sections';

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
        queryFn: () => auditAPI.getLogs({ page: 1, limit: 250, startDate: sevenDaysAgoIso }).then((res) => res.data),
        staleTime: 20 * 1000,
    });

    const alertsQuery = useQuery({
        queryKey: ['overview-security-alerts'],
        queryFn: () => auditAPI.getSecurityAlerts().then((res) => res.data),
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

    const totalUsers = usersSummary.total ?? users.length;
    const activeSessions = sessions.length;
    const totalPolicyAssignments = roles.reduce((sum, role) => sum + (role._count?.rolePolicies || 0), 0);

    const countWeeklyActions = (matchers) => weeklyLogs.filter((log) => {
        const action = (log.action || '').toUpperCase();
        return matchers.some((matcher) => {
            if (typeof matcher === 'string') return action.includes(matcher);
            return matcher(action);
        });
    }).length;

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

    const overprivilegedRolesCount = roles.filter((role) =>
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
    const systemHealth = getSystemHealth(criticalAlertsCount, totalAlerts);

    const postureChecks = [
        { label: 'MFA Coverage', icon: ShieldCheck, value: `${mfaCoverage}%`, status: mfaCoverage < 80 ? 'critical' : 'good' },
        { label: 'Inactive Users', icon: Clock3, value: `${inactiveUsersCount}`, status: inactiveUsersCount > 0 ? 'warning' : 'good' },
        { label: 'Overprivileged Roles', icon: ShieldAlert, value: `${overprivilegedRolesCount}`, status: overprivilegedRolesCount > 0 ? 'critical' : 'good' },
        { label: 'Unverified Emails', icon: Mail, value: `${unverifiedUsersCount}`, status: unverifiedUsersCount > 0 ? 'warning' : 'good' },
    ];

    const topActiveUsers = useMemo(() => {
        const bucket = new Map();
        weeklyLogs.forEach((log) => {
            const email = log.user?.email;
            if (!email) return;
            const key = log.user?.id || email;
            const existing = bucket.get(key) || {
                id: key, email, name: `${log.user?.firstName || ''} ${log.user?.lastName || ''}`.trim() || email,
                count: 0, lastActiveAt: log.createdAt,
            };
            existing.count += 1;
            if (new Date(log.createdAt).getTime() > new Date(existing.lastActiveAt).getTime()) existing.lastActiveAt = log.createdAt;
            bucket.set(key, existing);
        });
        return Array.from(bucket.values()).sort((a, b) => b.count - a.count).slice(0, 5);
    }, [weeklyLogs]);

    const roleDistribution = computeRoleDistribution(users);

    const handleExportUserReport = () => {
        const columns = ['Name', 'Email', 'Status', 'MFA', 'Email Verified', 'Roles'];
        const rows = users.map((u) => {
            const name = `${u.firstName || ''} ${u.lastName || ''}`.trim();
            const rolesLabel = (u.roles || []).map((r) => r.name).join('; ');
            return [name || 'N/A', u.email || 'N/A', u.status || 'UNKNOWN', u.mfaEnabled ? 'Enabled' : 'Disabled', u.emailVerified ? 'Verified' : 'Unverified', rolesLabel || 'None'];
        });
        const csv = buildCsv(columns, rows);
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

    const lastIncident = alerts[0]?.lastSeen || alerts[0]?.firstSeen;

    const metricCards = [
        { title: 'Total Users', value: totalUsers, delta: metricDeltas.users, icon: Users, iconClass: 'bg-[#4f46e5]/10 text-[#4f46e5]' },
        { title: 'Active Sessions', value: activeSessions, delta: metricDeltas.sessions, icon: Monitor, iconClass: 'bg-[#0284c7]/10 text-[#0284c7]' },
        { title: 'Policies Attached', value: totalPolicyAssignments, delta: metricDeltas.policyAssignments, icon: FileText, iconClass: 'bg-[#16a34a]/10 text-[#16a34a]' },
        { title: 'Security Alerts', value: totalAlerts, delta: metricDeltas.alerts, icon: AlertTriangle, iconClass: totalAlerts > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600' },
    ];

    const accessSummaryRows = [
        { label: 'Users', count: totalUsers, icon: Users, section: 'users' },
        { label: 'Roles', count: roles.length, icon: KeyRound, section: 'roles' },
        { label: 'Policies', count: policies.length, icon: FileText, section: 'policies' },
        { label: 'Groups', count: groups.length, icon: Layers, section: 'groups' },
    ];

    const quickActions = [
        { label: 'Invite New User', icon: UserPlus, onClick: () => navigate('/dashboard/users/new') },
        { label: 'Create Role', icon: KeyRound, onClick: () => onSelectSection('roles') },
        { label: 'Attach Policy', icon: FileText, onClick: () => onSelectSection('policies') },
        { label: 'View Audit Logs', icon: ScrollText, onClick: () => navigate('/dashboard/audit-logs') },
        { label: 'Manage MFA Settings', icon: ShieldCheck, onClick: () => navigate('/dashboard/security', { state: { activeTab: 'mfa' } }) },
        { label: 'Export User Report', icon: LayoutDashboard, onClick: handleExportUserReport },
    ];

    return (
        <div className="animate-in space-y-6">
            <SectionHeader title="AegisMesh Console" description="IAM command center with live health, security posture, and access activity." />

            <StatsCards systemHealth={systemHealth} metricCards={metricCards} activeSessions={activeSessions} totalAlerts={totalAlerts} latestPolicyTimestamp={latestPolicyTimestamp} lastIncident={lastIncident} />
            <SecurityAlerts postureChecks={postureChecks} />
            <RecentActivity recentLogs={recentLogs} recentLogsQuery={recentLogsQuery} accessSummaryRows={accessSummaryRows} onSelectSection={onSelectSection} roleDistribution={roleDistribution} />
            <UserChart user={user} fullName={fullName} initials={initials} roleBadge={roleBadge} sessions={sessions} topActiveUsers={topActiveUsers} weeklyLogsQuery={weeklyLogsQuery} />
            <QuickActions actions={quickActions} />
        </div>
    );
}

function SessionsSection({ sessions, sessionsLoading, revokingSession, onRevoke }) {
    return (
        <div className="animate-in">
            <SectionHeader title="Sessions" description="Track devices and revoke active sessions when needed." />
            {(() => {
                if (sessionsLoading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-aws-orange border-t-transparent rounded-full animate-spin"></div></div>;
                if (sessions.length === 0) return <div className="card-glass text-center"><p className="text-aws-text-dim">No active sessions found.</p></div>;
                return (
                    <div className="grid gap-3">
                        {sessions.map((session, index) => (
                            <SessionCard key={session.id} session={session} isCurrent={index === 0} onRevoke={onRevoke} isRevoking={revokingSession === session.id} />
                        ))}
                    </div>
                );
            })()}
        </div>
    );
}

function SecuritySection({ user, sessions }) {
    const navigate = useNavigate();
    return (
        <div className="animate-in max-w-3xl">
            <SectionHeader title="Security" description="Manage MFA, password posture, and session safety controls." />
            <div className="space-y-6">
                <div className="card-glass">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-aws-text flex items-center gap-2">Two-Factor Authentication</h3>
                            <p className="text-sm text-aws-text-dim mt-1">Add an extra layer of security with TOTP-based MFA.</p>
                        </div>
                        <button type="button" onClick={() => navigate('/dashboard/security', { state: { activeTab: 'mfa' } })} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${user?.mfaEnabled ? 'bg-aws-navy-light text-aws-text border border-aws-border hover:border-aws-orange/30' : 'btn-accent-glow'}`}>
                            {user?.mfaEnabled ? 'Manage' : 'Enable'}
                        </button>
                    </div>
                </div>
                <div className="card-glass">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-aws-text flex items-center gap-2">Password</h3>
                            <p className="text-sm text-aws-text-dim mt-1">Last changed: {user?.passwordChangedAt ? new Date(user.passwordChangedAt).toLocaleDateString() : 'Never'}</p>
                        </div>
                        <button type="button" onClick={() => navigate('/dashboard/security', { state: { activeTab: 'password' } })} className="px-4 py-2 rounded-lg text-sm font-medium bg-aws-navy-light text-aws-text border border-aws-border hover:border-aws-orange/30 transition-all">Change</button>
                    </div>
                </div>
                <div className="card-glass">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-aws-text flex items-center gap-2">Active Sessions</h3>
                            <p className="text-sm text-aws-text-dim mt-1">{sessions.length} active session(s)</p>
                        </div>
                        <button type="button" onClick={() => navigate('/settings/sessions')} className="px-4 py-2 rounded-lg text-sm font-medium bg-aws-navy-light text-aws-text border border-aws-border hover:border-aws-orange/30 transition-all">Open Controls</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function UsersSection() { return <UsersList />; }
function RolesSection() { return <RolesList />; }
function PoliciesSection() { return <PoliciesList />; }
function GroupsSection() { return <GroupsList />; }
function LogsSection() { return null; }
function AnalyticsSection() { return null; }

const userShape = PropTypes.shape({
    email: PropTypes.string,
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    emailVerified: PropTypes.bool,
    mfaEnabled: PropTypes.bool,
    createdAt: PropTypes.string,
    passwordChangedAt: PropTypes.string,
    role: PropTypes.oneOfType([PropTypes.string, PropTypes.shape({ name: PropTypes.string })]),
    primaryRole: PropTypes.shape({ name: PropTypes.string }),
    roles: PropTypes.arrayOf(PropTypes.shape({ name: PropTypes.string })),
});

const sessionShape = PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    createdAt: PropTypes.string,
});

OverviewSection.propTypes = {
    user: userShape,
    roleBadge: PropTypes.string,
    fullName: PropTypes.string,
    initials: PropTypes.string,
    sessions: PropTypes.arrayOf(sessionShape),
    onSelectSection: PropTypes.func.isRequired,
};

SessionsSection.propTypes = {
    sessions: PropTypes.arrayOf(sessionShape),
    sessionsLoading: PropTypes.bool,
    revokingSession: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    onRevoke: PropTypes.func.isRequired,
};

SecuritySection.propTypes = {
    user: userShape,
    sessions: PropTypes.arrayOf(sessionShape),
};

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
        const timer = globalThis.setTimeout(() => { fetchSessions(); }, 0);
        return () => globalThis.clearTimeout(timer);
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
        if (Array.isArray(user?.roles) && user.roles.length > 0) return user.roles[0]?.name || 'AegisMesh User';
        return 'AegisMesh User';
    }, [user]);

    const renderSectionContent = () => ({
        overview: <OverviewSection user={user} roleBadge={roleBadge} fullName={fullName} initials={initials} sessions={sessions} onSelectSection={setActiveSection} />,
        sessions: <SessionsSection sessions={sessions} sessionsLoading={sessionsLoading} revokingSession={revokingSession} onRevoke={handleRevokeSession} />,
        security: <SecuritySection user={user} sessions={sessions} />,
        users: <UsersSection />,
        roles: <RolesSection />,
        policies: <PoliciesSection />,
        groups: <GroupsSection />,
    })[activeSection] || (
        <OverviewSection user={user} roleBadge={roleBadge} fullName={fullName} initials={initials} sessions={sessions} onSelectSection={setActiveSection} />
    );

    return <div>{renderSectionContent()}</div>;
}
