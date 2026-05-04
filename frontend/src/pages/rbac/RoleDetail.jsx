import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api, { rbacAPI } from '../../services/api';
import {
    CalendarDays,
    CheckCircle2,
    ChevronLeft,
    Clock3,
    Info,
    Lock,
    Pencil,
    Shield,
    Trash2,
    UserX,
    Users,
    X,
    XCircle,
} from 'lucide-react';

export default function RoleDetail() {
    const { id: roleId } = useParams();
    const queryClient = useQueryClient();
    const [selectedPolicy, setSelectedPolicy] = useState('');
    const [selectedUserId, setSelectedUserId] = useState('');
    const [assigning, setAssigning] = useState(false);

    const { data: roleData, isLoading: roleLoading } = useQuery({
        queryKey: ['role', roleId],
        queryFn: () => rbacAPI.getRole(roleId),
        enabled: !!roleId,
    });

    const { data: policiesData } = useQuery({
        queryKey: ['policies'],
        queryFn: () => rbacAPI.getPolicies({ limit: 100 }),
    });

    const { data: allUsersData } = useQuery({
        queryKey: ['users-for-role'],
        queryFn: () => api.get('/users?limit=100'),
    });

    const attachMutation = useMutation({
        mutationFn: (policyId) => rbacAPI.attachPolicyToRole(roleId, policyId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['role', roleId] }),
    });

    const detachMutation = useMutation({
        mutationFn: (policyId) => rbacAPI.detachPolicyFromRole(roleId, policyId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['role', roleId] }),
    });

    const role = roleData?.data?.data;
    const policies = policiesData?.data?.data || [];
    const allUsers = allUsersData?.data?.data || [];
    const [expandedChips, setExpandedChips] = useState({});

    const formatRelative = (value) => {
        if (!value) return 'Unknown';
        return formatDate(value);
    };

    const formatDate = (value) => {
        if (!value) return 'Unknown';
        return new Date(value).toLocaleString();
    };

    if (roleLoading) return <div className="p-8 text-center text-slate-500 text-[13px]">Loading role details...</div>;
    if (!role) return <div className="p-8 text-center text-red-400">Role not found</div>;

    const attachedPolicyIds = new Set(role.rolePolicies?.map(rp => rp.policy.id));
    const availablePolicies = policies.filter(p => !attachedPolicyIds.has(p.id));
    const assignedUserIds = role.userRoles?.map((entry) => entry.user?.id).filter(Boolean) || [];

    const roleArn = `arn:aegismesh::account:role/${role.name}`;
    const toggleChip = (policyId, type) => {
        const key = `${policyId}:${type}`;
        setExpandedChips((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    async function handleAssignUser() {
        if (!selectedUserId) return;
        setAssigning(true);
        try {
            await api.post(`/users/${selectedUserId}/roles`, { roleId: role.id });
            toast.success('User assigned!');
            setSelectedUserId('');
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['role', roleId] }),
                queryClient.invalidateQueries({ queryKey: ['users-for-role'] }),
            ]);
        } catch (e) {
            toast.error(e.response?.data?.message || e.response?.data?.error?.message || 'Failed to assign user');
        } finally {
            setAssigning(false);
        }
    }

    async function handleRemoveUser(userId) {
        if (!window.confirm('Remove this role from the selected user?')) return;
        try {
            await api.delete(`/users/${userId}/roles/${role.id}`);
            toast.success('User removed from role');
            await queryClient.invalidateQueries({ queryKey: ['role', roleId] });
        } catch (e) {
            toast.error(e.response?.data?.message || e.response?.data?.error?.message || 'Failed to remove user');
        }
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Link
                    to="/dashboard/roles"
                    className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <ChevronLeft size={14} />
                    Back to Roles
                </Link>

                <div className="mb-6">
                    <div className="mb-1.5 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h1 className="text-[26px] font-extrabold tracking-[-0.03em] text-slate-900">{role.name}</h1>
                            <p className="mt-1 text-[14px] text-slate-500">{role.description || 'No description provided.'}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {role.isSystem && (
                                <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-700">
                                    <Lock size={12} className="mr-1.5" />
                                    System Role
                                </span>
                            )}

                            <button
                                type="button"
                                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <Pencil size={14} className="mr-1.5" />
                                Edit Role
                            </button>

                            <button
                                type="button"
                                disabled={role.isSystem}
                                className="inline-flex items-center rounded-xl border border-red-200 bg-white px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
                            >
                                <Trash2 size={14} className="mr-1.5" />
                                Delete Role
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-5">
                        <div className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
                            <Shield size={13} className="text-slate-400" />
                            Role ID:
                            <span className="font-mono text-[11px] text-slate-400">{role.id.slice(0, 8)}...</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
                            <CalendarDays size={13} className="text-slate-400" />
                            Created: {formatRelative(role.createdAt)}
                        </div>
                        <div className="inline-flex items-center gap-1.5 text-[12px] text-slate-500">
                            <Clock3 size={13} className="text-slate-400" />
                            Updated: {formatRelative(role.updatedAt)}
                        </div>
                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[11px] text-slate-500">
                            {roleArn}
                        </span>
                    </div>
                </div>

                <div className="my-6 border-t border-slate-200" />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                            <div className="inline-flex items-center">
                                <span className="mr-3 rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
                                    <Shield size={16} />
                                </span>
                                <h2 className="text-[15px] font-bold text-slate-900">Permissions</h2>
                            </div>
                            <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[12px] font-semibold text-indigo-700">
                                {role.rolePolicies.length} Policies
                            </span>
                        </div>

                        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                            <label className="mb-2 block text-[12px] font-semibold uppercase tracking-[0.05em] text-slate-700">
                                Attach Additional Policy
                            </label>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <select
                                    value={selectedPolicy}
                                    onChange={(e) => setSelectedPolicy(e.target.value)}
                                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                                >
                                    <option value="">Select a policy</option>
                                    {availablePolicies.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.effect})</option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={!selectedPolicy || attachMutation.isPending}
                                    onClick={() => attachMutation.mutate(selectedPolicy)}
                                    className="rounded-xl bg-indigo-600 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Attach
                                </button>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-50">
                            {role.rolePolicies.length === 0 ? (
                                <div className="py-12 text-center">
                                    <Shield size={32} className="mx-auto mb-3 text-slate-300" />
                                    <p className="text-[14px] font-medium text-slate-400">No policies attached</p>
                                    <p className="mt-1 text-[12px] text-slate-300">Attach a policy to grant permissions to this role</p>
                                </div>
                            ) : role.rolePolicies.map(({ policy }) => {
                                const actionsExpanded = expandedChips[`${policy.id}:actions`];
                                const resourcesExpanded = expandedChips[`${policy.id}:resources`];
                                const allow = policy.effect === 'ALLOW';

                                return (
                                    <div key={policy.id} className="flex items-start gap-3.5 px-6 py-4 transition-colors hover:bg-slate-50/50">
                                        <div className={`mt-0.5 inline-flex h-[34px] w-[34px] items-center justify-center rounded-[9px] ${allow ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                            {allow ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <Link to={`/dashboard/policies/${policy.id}`} className="cursor-pointer text-[13px] font-semibold text-indigo-500 hover:underline">
                                                    {policy.name}
                                                </Link>
                                                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold tracking-[0.05em] ${allow ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
                                                    {policy.effect}
                                                </span>
                                            </div>

                                            <p className="mt-1 text-[12px] text-slate-500">{policy.description || 'No description provided.'}</p>

                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => toggleChip(policy.id, 'actions')}
                                                    className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600"
                                                    title={actionsExpanded ? 'Hide actions list' : 'Show actions list'}
                                                >
                                                    ACTIONS: {policy.actions.length}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleChip(policy.id, 'resources')}
                                                    className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600"
                                                    title={resourcesExpanded ? 'Hide resources list' : 'Show resources list'}
                                                >
                                                    RESOURCES: {policy.resources.length}
                                                </button>
                                            </div>

                                            {actionsExpanded && (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {policy.actions.map((action) => (
                                                        <span key={action} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600">
                                                            {action}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}

                                            {resourcesExpanded && (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {policy.resources.map((resource) => (
                                                        <span key={resource} className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-600">
                                                            {resource}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            title="Detach policy"
                                            onClick={() => {
                                                if (window.confirm(`Detach ${policy.name}?`)) detachMutation.mutate(policy.id);
                                            }}
                                            className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] border border-slate-200 bg-white text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                                <div className="inline-flex items-center">
                                    <span className="mr-3 rounded-lg bg-purple-50 p-1.5 text-purple-600">
                                        <Users size={15} />
                                    </span>
                                    <h3 className="text-[14px] font-bold text-slate-900">Assigned Users</h3>
                                </div>
                                <span className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-[12px] font-semibold text-purple-700">
                                    {role.userRoles.length} Users
                                </span>
                            </div>

                            <div className="px-5 py-4">
                                <div style={{
                                    display: 'flex',
                                    gap: 10,
                                    marginBottom: 16,
                                    paddingBottom: 16,
                                    borderBottom: '1px solid #f1f5f9',
                                }}>
                                    <select
                                        value={selectedUserId}
                                        onChange={(e) => setSelectedUserId(e.target.value)}
                                        style={{
                                            flex: 1,
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 10,
                                            padding: '8px 12px',
                                            fontSize: 13,
                                            color: '#374151',
                                            background: '#fff',
                                        }}
                                    >
                                        <option value="">-- Select a user --</option>
                                        {allUsers
                                            .filter((u) => !assignedUserIds.includes(u.id))
                                            .map((u) => (
                                                <option key={u.id} value={u.id}>
                                                    {u.firstName} {u.lastName} ({u.email})
                                                </option>
                                            ))}
                                    </select>

                                    <button
                                        onClick={handleAssignUser}
                                        disabled={!selectedUserId || assigning}
                                        style={{
                                            background: '#6366f1',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: 10,
                                            padding: '8px 16px',
                                            fontSize: 13,
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            opacity: !selectedUserId ? 0.5 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            whiteSpace: 'nowrap',
                                        }}
                                    >
                                        {assigning ? 'Assigning...' : '+ Assign User'}
                                    </button>
                                </div>

                                {role.userRoles.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <UserX size={28} className="mx-auto mb-2 text-slate-300" />
                                        <p className="text-[13px] text-slate-400">No users assigned</p>
                                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
                                            <p className="inline-flex items-start gap-1.5 text-[11px] text-slate-400">
                                                <Info size={12} className="mt-0.5" />
                                                Users can also inherit this role via group membership
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <ul>
                                        {role.userRoles.map(({ user }) => {
                                            const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
                                            return (
                                                <li key={user.id} className="flex items-center gap-2.5 border-b border-slate-50 py-3 last:border-b-0">
                                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                                                        {initials || 'U'}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-[13px] font-medium text-slate-900">{user.firstName} {user.lastName}</p>
                                                        <p className="truncate text-[11px] text-slate-400">{user.email}</p>
                                                    </div>
                                                    <Link to={`/dashboard/users/${user.id}`} className="text-[11px] text-indigo-500 hover:underline">
                                                        View →
                                                    </Link>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveUser(user.id)}
                                                        className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                                                        title="Remove user from role"
                                                    >
                                                        <X size={11} />
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="border-b border-slate-100 px-5 py-4">
                                <h3 className="text-[14px] font-bold text-slate-900">Role Details</h3>
                            </div>
                            <div className="px-5 py-4">
                                <div className="flex items-center justify-between border-b border-slate-50 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Type</span>
                                    <span className="text-right text-[12px] font-medium text-slate-700">{role.isSystem ? 'System' : 'Custom'}</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-slate-50 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Policies</span>
                                    <span className="text-right text-[12px] font-medium text-slate-700">{role.rolePolicies.length} attached</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-slate-50 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Users</span>
                                    <span className="text-right text-[12px] font-medium text-slate-700">{role.userRoles.length} assigned</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-slate-50 py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Created</span>
                                    <span className="text-right text-[12px] font-medium text-slate-700">{formatDate(role.createdAt)}</span>
                                </div>
                                <div className="flex items-center justify-between py-2.5">
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Last Updated</span>
                                    <span className="text-right text-[12px] font-medium text-slate-700">{formatDate(role.updatedAt)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


