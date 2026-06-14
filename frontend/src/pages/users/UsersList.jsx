import React from 'react';

import {
    useQuery,
} from '@tanstack/react-query';

import {
    ChevronDown,
    Eye,
    Mail,
    Pencil,
    Search,
    ShieldCheck,
    UserPlus,
    Users,
} from 'lucide-react';

import { useNavigate, Link } from 'react-router-dom';

import {
    rbacAPI,
    userAPI,
} from '../../services/api';

import ReauthModal from '../../components/security/ReauthModal';

import { useReauth } from '../../hooks/useReauth';
import { getAvatarColor, getInitials, getStatusMeta } from '../../utils/formatters';
import { useEntityList } from '../../hooks/useEntityList';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';

export default function UsersList() {
    const navigate = useNavigate();
    const {
        reauthModal,
        handleReauthClose,
        handleReauthSuccess,
    } = useReauth();

    const {
        data: users,
        pagination,
        isLoading,
        isError,
        search,
        setSearch,
        filters,
        setFilters,
        setPage,
    } = useEntityList({
        entityKey: 'users',
        fetchFn: userAPI.getUsers,
        perPage: 20,
    });

    const statusFilter = filters.status || '';
    const mfaFilter = filters.mfaEnabled === undefined ? '' : String(filters.mfaEnabled);
    const roleFilter = filters.roleId || '';

    const {
        data: rolesResponse,
    } = useQuery({
        queryKey: ['roles-for-filter'],
        queryFn: () => rbacAPI.getRoles({ limit: 100 }).then((res) => res.data),
    });

    const roles = rolesResponse?.data || [];

    const handleStatusFilterChange = (e) => {
        setFilters(prev => ({ ...prev, status: e.target.value }));
    };

    const handleMfaFilterChange = (e) => {
        const val = e.target.value;
        setFilters(prev => ({ ...prev, mfaEnabled: val === '' ? undefined : val === 'true' }));
    };

    const handleRoleFilterChange = (e) => {
        setFilters(prev => ({ ...prev, roleId: e.target.value }));
    };

    return (
        <>
            <div className="w-full">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-[20px] font-semibold text-[#0f1623]">Users</h1>
                        <p className="mt-1 text-[13px] text-[#7a87a8]">
                            Manage access and permissions for all organization members.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/users/new')}
                        className="flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3730a3]"
                    >
                        <UserPlus size={16} />
                        + New User
                    </button>
                </div>

                <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#d0d7e8] bg-white px-5 py-4 shadow-sm lg:flex-nowrap">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                        <label htmlFor="user-search" className="sr-only">Search users</label>
                        <input
                            id="user-search"
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-[#d0d7e8] py-2.5 pl-9 pr-4 text-sm text-[#0f1623] outline-none placeholder:text-[#7a87a8] focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25"
                        />
                    </div>

                    <div className="relative">
                        <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                        <select
                            id="status-filter"
                            value={statusFilter}
                            onChange={handleStatusFilterChange}
                            className="cursor-pointer appearance-none rounded-xl border border-[#d0d7e8] bg-[#f4f6fb] px-4 py-2.5 pr-8 text-sm text-[#3a4560] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                        >
                            <option value="">All Statuses</option>
                            <option value="ACTIVE">Active</option>
                            <option value="LOCKED">Locked</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                    </div>

                    <div className="relative">
                        <label htmlFor="mfa-filter" className="sr-only">Filter by MFA status</label>
                        <select
                            id="mfa-filter"
                            value={mfaFilter}
                            onChange={handleMfaFilterChange}
                            className="cursor-pointer appearance-none rounded-xl border border-[#d0d7e8] bg-[#f4f6fb] px-4 py-2.5 pr-8 text-sm text-[#3a4560] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                        >
                            <option value="">MFA: All</option>
                            <option value="true">MFA: On</option>
                            <option value="false">MFA: Off</option>
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                    </div>

                    <div className="relative">
                        <label htmlFor="role-filter" className="sr-only">Filter by role</label>
                        <select
                            id="role-filter"
                            value={roleFilter}
                            onChange={handleRoleFilterChange}
                            className="cursor-pointer appearance-none rounded-xl border border-[#d0d7e8] bg-[#f4f6fb] px-4 py-2.5 pr-8 text-sm text-[#3a4560] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                        >
                            <option value="">All Roles</option>
                            {roles.map((role) => (
                                <option key={role.id} value={role.id}>{role.name}</option>
                            ))}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                    </div>
                </div>

                {isLoading ? (
                    <LoadingState message="Loading users..." />
                ) : isError ? (
                    <div className="py-16 text-center text-sm text-red-500">Failed to load users. Please refresh.</div>
                ) : users.length === 0 ? (
                    <EmptyState
                        icon={Users}
                        title="No users found"
                        description="Try adjusting your search or filters."
                    />
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {users.map((user) => {
                                const status = getStatusMeta(user.status);
                                const isMfaProtected = user.mfaEnabled;
                                
                                return (
                                    <div
                                        key={user.id}
                                        className="group bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#4f46e5]/30 transition-all duration-200 flex flex-col h-full"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div 
                                                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                                                style={{ backgroundColor: getAvatarColor(user.firstName, user.lastName) }}
                                            >
                                                {getInitials(user.firstName, user.lastName)}
                                            </div>
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    to={`/dashboard/users/${user.id}`}
                                                    className="p-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f0f9ff] hover:text-[#0ea5e9] hover:border-[#0ea5e9] transition-all"
                                                    title="View Profile"
                                                >
                                                    <Eye size={14} />
                                                </Link>
                                                <Link
                                                    to={`/dashboard/users/${user.id}/edit`}
                                                    className="p-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#eef2ff] hover:text-[#6366f1] hover:border-[#6366f1] transition-all"
                                                    title="Edit User"
                                                >
                                                    <Pencil size={14} />
                                                </Link>
                                            </div>
                                        </div>

                                        <div className="mb-4 flex-1">
                                            <h3 className="text-[15px] font-bold text-[#0f172a] truncate">
                                                {user.firstName} {user.lastName}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-1 text-[#64748b]">
                                                <Mail size={12} className="shrink-0" />
                                                <p className="text-[12px] truncate">{user.email}</p>
                                            </div>
                                            
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${status.className}`}>
                                                    {status.label}
                                                </span>
                                                {user.primaryRole && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#eef2ff] text-[#4f46e5] uppercase tracking-wider">
                                                        <ShieldCheck size={10} />
                                                        {user.primaryRole.name}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-tight">Security</span>
                                                <span className={`text-[12px] font-semibold ${isMfaProtected ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {isMfaProtected ? 'MFA Protected' : 'MFA Off'}
                                                </span>
                                            </div>
                                            <Link
                                                to={`/dashboard/users/${user.id}`}
                                                className="text-[12px] font-bold text-[#4f46e5] hover:text-[#3730a3] transition-colors"
                                            >
                                                View Details →
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-8 flex items-center justify-between">
                            <p className="text-sm text-[#64748b]">
                                Showing page <span className="font-semibold text-[#0f1623]">{pagination.page}</span> of <span className="font-semibold text-[#0f1623]">{pagination.totalPages}</span>
                            </p>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={pagination.page <= 1}
                                    onClick={() => setPage((prev) => prev - 1)}
                                    className="rounded-xl border border-[#d0d7e8] px-4 py-2 text-sm font-medium text-[#3a4560] transition-all hover:bg-[#f4f6fb] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>

                                <button
                                    type="button"
                                    disabled={pagination.page >= pagination.totalPages}
                                    onClick={() => setPage((prev) => prev + 1)}
                                    className="rounded-xl border border-[#d0d7e8] px-4 py-2 text-sm font-medium text-[#3a4560] transition-all hover:bg-[#f4f6fb] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            <ReauthModal
                isOpen={reauthModal.isOpen}
                onClose={handleReauthClose}
                onSuccess={handleReauthSuccess}
                action={reauthModal.action}
                requiresMfa={reauthModal.requiresMfa}
                actionLabel={reauthModal.actionLabel}
            />
        </>
    );
}
