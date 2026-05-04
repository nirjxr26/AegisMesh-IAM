import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Users, UserCheck, Lock, Mail, Search, X, ChevronLeft, ChevronRight, UserPlus, Eye, Pencil, Trash2, ChevronDown
} from 'lucide-react';
import { userAPI, rbacAPI } from '../../services/api';
import toast from 'react-hot-toast';
import ReauthModal from '../../components/security/ReauthModal';
import { useReauth } from '../../hooks/useReauth';
import BulkActionBar from '../../components/users/BulkActionBar';

import LockConfirmDialog from '../../components/users/LockConfirmDialog';
import VerifyEmailConfirmDialog from '../../components/users/VerifyEmailConfirmDialog';

// Consistent avatar color system based on initial hash
const AVATAR_COLORS = {
    'A': '#4f46e5', 'B': '#059669', 'C': '#0284c7', 'D': '#dc2626',
    'E': '#7c3aed', 'F': '#0891b2', 'G': '#ea580c', 'H': '#2563eb',
    'I': '#06b6d4', 'J': '#1d4ed8', 'K': '#9333ea', 'L': '#0d9488',
    'M': '#ca8a04', 'N': '#16a34a', 'O': '#4338ca', 'P': '#6366f1',
    'Q': '#6b21a8', 'R': '#7c2d12', 'S': '#166534', 'T': '#1e293b',
    'U': '#374151', 'V': '#1e1b4b', 'W': '#0f172a', 'X': '#581c87',
    'Y': '#be185d', 'Z': '#991b1b'
};

const getAvatarColor = (firstName, lastName) => {
    const initial = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase()[0];
    return AVATAR_COLORS[initial] || '#4f46e5';
};

const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
};

const isReauthCancelled = (error) => error?.message === 'Re-authentication cancelled';
const getErrorCode = (error) => error?.response?.data?.code || error?.response?.data?.error?.code;

export default function UsersList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { withReauth, reauthModal, handleReauthSuccess, handleReauthClose } = useReauth();

    // Filters and Pagination State
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [mfaFilter, setMfaFilter] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [roleSearch, setRoleSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [dialogConfig, setDialogConfig] = useState(null);
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [createUserFormKey, setCreateUserFormKey] = useState(0);
    const [newUserErrors, setNewUserErrors] = useState({});
    const clearSelectedUsers = () => setSelectedUsers(new Set());

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1); // Reset to page 1 on search change
            setSelectedUsers(new Set());
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    // Construct query params
    const queryParams = {
        page,
        limit,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
        ...(mfaFilter && { mfaEnabled: mfaFilter === 'true' }),
        ...(roleFilter && { roleId: roleFilter }),
    };

    // Queries
    const { data: usersResponse, isLoading, isError, error } = useQuery({
        queryKey: ['users', queryParams],
        queryFn: () => userAPI.getUsers(queryParams).then(res => res.data),
    });

    const { data: rolesResponse } = useQuery({
        queryKey: ['roles'],
        queryFn: () => rbacAPI.getRoles({ limit: 100 }).then(res => res.data),
    });

    // Mutations
    const statusMutation = useMutation({
        mutationFn: ({ id, status }) => userAPI.updateStatus(id, status),
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries(['users']);
            toast.success(`Account ${variables.status.toLowerCase()} successfully`);
            setDialogConfig(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.error?.message || 'Failed to update status');
        }
    });

    const verifyMutation = useMutation({
        mutationFn: (id) => userAPI.verifyEmail(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            toast.success('Email verified successfully');
            setDialogConfig(null);
        },
        onError: (err) => {
            toast.error(err.response?.data?.error?.message || 'Failed to verify email');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: ({ id, credentials = {} }) => userAPI.deleteUser(id, credentials),
        onSuccess: () => {
            queryClient.invalidateQueries(['users']);
            toast.success('User deleted permanently');
            setDialogConfig(null);
        },
        onError: (err) => {
            if (getErrorCode(err) === 'REAUTH_REQUIRED') {
                return;
            }
            toast.error(err.response?.data?.error?.message || 'Failed to delete user');
        }
    });

    const createUserMutation = useMutation({
        mutationFn: (payload) => userAPI.createUser(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            toast.success('User created successfully');
            setIsCreateUserOpen(false);
            setCreateUserFormKey((prev) => prev + 1);
            setNewUserErrors({});
        },
        onError: (err) => {
            toast.error(err.response?.data?.error?.message || err.response?.data?.error || 'Failed to create user');
        },
    });

    const users = usersResponse?.data || [];
    const selectedArray = [...selectedUsers];
    const allSelected = selectedUsers.size === users.length && users.length > 0;
    const someSelected = selectedUsers.size > 0 && selectedUsers.size < users.length;
    const pagination = usersResponse?.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 };

    // We assume backend might send stats or we derive simple ones if not provided
    const stats = usersResponse?.stats || {
        total: pagination.total,
        active: users.filter(u => u.status === 'ACTIVE').length, // Fallback if no real stats
        locked: users.filter(u => u.status === 'LOCKED').length,
        unverified: users.filter(u => !u.emailVerified).length,
    };
    const roles = useMemo(() => rolesResponse?.data ?? [], [rolesResponse]);
    const visibleRoles = useMemo(() => {
        const query = roleSearch.trim().toLowerCase();
        if (!query) {
            return roles;
        }

        return roles.filter((role) => role.name?.toLowerCase().includes(query));
    }, [roleSearch, roles]);

    // Handlers
    const handleResetFilters = () => {
        setSearch('');
        setDebouncedSearch('');
        setStatusFilter('');
        setMfaFilter('');
        setRoleFilter('');
        setRoleSearch('');
        setPage(1);
        clearSelectedUsers();
    };

    const handleRowClick = (id) => {
        navigate(`/dashboard/users/${id}`);
    };

    const handleDeleteUser = async (user) => {
        if (!window.confirm(`Delete user "${user.firstName} ${user.lastName}"?`)) {
            return;
        }

        try {
            await withReauth(
                (credentials) => deleteMutation.mutateAsync({ id: user.id, credentials }),
                `deleting ${user.firstName} ${user.lastName}`
            );
        } catch (error) {
            if (isReauthCancelled(error)) {
                return;
            }
        }
    };

    const handleOpenCreateUser = () => {
        setNewUserErrors({});
        setCreateUserFormKey((prev) => prev + 1);
        setIsCreateUserOpen(true);
    };

    const handleCloseCreateUser = () => {
        if (createUserMutation.isPending) {
            return;
        }

        setIsCreateUserOpen(false);
        setNewUserErrors({});
    };

    const handleCreateUser = (event) => {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const payload = {
            firstName: String(formData.get('firstName') || '').trim(),
            lastName: String(formData.get('lastName') || '').trim(),
            email: String(formData.get('email') || '').trim(),
            password: String(formData.get('password') || ''),
            status: String(formData.get('status') || 'ACTIVE'),
            roleIds: formData.getAll('roleIds').map((value) => String(value)),
            sendWelcomeEmail: formData.get('sendWelcomeEmail') === 'on',
        };

        const nextErrors = {};
        if (!payload.firstName) nextErrors.firstName = 'First name is required';
        if (!payload.lastName) nextErrors.lastName = 'Last name is required';
        if (!payload.email) nextErrors.email = 'Email is required';
        if (!payload.password) {
            nextErrors.password = 'Temporary password is required';
        } else if (payload.password.length < 8) {
            nextErrors.password = 'Password must be at least 8 characters';
        }

        setNewUserErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) {
            return;
        }

        createUserMutation.mutate(payload);
    };

    return (
        <>
            <div className="w-full space-y-6">
                {/* Page Header */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-[20px] font-semibold text-[#0f1623]">Users</h1>
                        <p className="text-[13px] text-[#7a87a8] mt-1">Manage all AegisMesh users, their status and access.</p>
                    </div>
                    <button
                        onClick={handleOpenCreateUser}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3730a3] sm:w-auto"
                    >
                        <UserPlus size={15} />
                        + Add User
                    </button>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Total Users */}
                    <div className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#4f46e5]/10">
                            <Users size={20} className="text-[#4f46e5]" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#0f1623]">{stats.total || 0}</div>
                            <div className="text-xs text-[#7a87a8] mt-0.5">Total Users</div>
                        </div>
                    </div>

                    {/* Active */}
                    <div className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#16a34a]/10">
                            <UserCheck size={20} className="text-[#16a34a]" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#0f1623]">{stats.active || 0}</div>
                            <div className="text-xs text-[#7a87a8] mt-0.5">Active</div>
                        </div>
                    </div>

                    {/* Locked */}
                    <div className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#dc2626]/10">
                            <Lock size={20} className="text-[#dc2626]" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#0f1623]">{stats.locked || 0}</div>
                            <div className="text-xs text-[#7a87a8] mt-0.5">Locked</div>
                        </div>
                    </div>

                    {/* Pending Verify */}
                    <div className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#d97706]/10">
                            <Mail size={20} className="text-[#d97706]" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#0f1623]">{stats.unverified || 0}</div>
                            <div className="text-xs text-[#7a87a8] mt-0.5">Pending Verify</div>
                        </div>
                    </div>
                </div>

                {/* Search + Filter Toolbar */}
                <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#d0d7e8] bg-white px-5 py-4 shadow-sm sm:flex-row">
                    {/* Search Input */}
                    <div className="relative min-w-0 w-full sm:flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm pl-9 focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none text-[#0f1623] placeholder-[#b8c2d8]"
                        />
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
                        {/* Status Filter */}
                        <div className="relative flex-1 sm:flex-none">
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                    clearSelectedUsers();
                                }}
                                className="w-full appearance-none rounded-xl border border-[#d0d7e8] bg-[#f4f6fb] px-4 py-2.5 pr-8 text-sm text-[#3a4560] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 sm:w-auto"
                            >
                                <option value="">Status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="LOCKED">Locked</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                        </div>

                        {/* MFA Filter */}
                        <div className="relative flex-1 sm:flex-none">
                            <select
                                value={mfaFilter}
                                onChange={(e) => {
                                    setMfaFilter(e.target.value);
                                    setPage(1);
                                    clearSelectedUsers();
                                }}
                                className="w-full appearance-none rounded-xl border border-[#d0d7e8] bg-[#f4f6fb] px-4 py-2.5 pr-8 text-sm text-[#3a4560] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 sm:w-auto"
                            >
                                <option value="">MFA</option>
                                <option value="true">Enabled</option>
                                <option value="false">Disabled</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                        </div>

                        {/* Role Filter */}
                        <div className="relative flex-1 sm:flex-none sm:min-w-[210px]">
                            <input
                                type="text"
                                value={roleSearch}
                                onChange={(e) => setRoleSearch(e.target.value)}
                                placeholder="Search roles"
                                className="mb-2 w-full rounded-xl border border-[#d0d7e8] bg-white px-3 py-2 text-xs text-[#3a4560] placeholder-[#9aa4bb] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                            />
                            <select
                                value={roleFilter}
                                onChange={(e) => {
                                    setRoleFilter(e.target.value);
                                    setPage(1);
                                    clearSelectedUsers();
                                }}
                                className="w-full appearance-none rounded-xl border border-[#d0d7e8] bg-[#f4f6fb] px-4 py-2.5 pr-8 text-sm text-[#3a4560] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 sm:w-auto"
                            >
                                <option value="">Role</option>
                                {visibleRoles.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                        </div>

                        {/* Reset Button */}
                        {(search || statusFilter || mfaFilter || roleFilter) && (
                            <button
                                onClick={handleResetFilters}
                                className="flex min-h-11 items-center justify-center gap-1 px-2 text-sm font-medium text-[#7a87a8] transition-colors hover:text-[#0f1623] sm:min-h-0"
                            >
                                <X size={14} /> Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Users Table */}
                <div className="w-full bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm text-[13px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-3 py-16">
                            <div className="w-8 h-8 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[#7a87a8] text-sm">Loading users...</p>
                        </div>
                    ) : isError ? (
                        <div className="flex items-center justify-center h-64 text-red-500 py-16">
                            <p className="text-sm">{error?.message || 'Failed to load users'}</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                            <div className="bg-[#f4f6fb] rounded-2xl p-4 inline-flex">
                                <Users size={32} className="text-[#7a87a8]" />
                            </div>
                            <h3 className="text-[15px] font-semibold text-[#0f1623]">No users found</h3>
                            <p className="text-[13px] text-[#7a87a8]">Try adjusting your search or filters</p>
                            <button
                                onClick={handleResetFilters}
                                className="mt-2 bg-[#4f46e5] hover:bg-[#3730a3] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                                <table className="min-w-[800px] w-full border-collapse text-[13px]">
                                <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
                                    <tr className="h-14 border-b border-[#e2e8f0]">
                                        <th className="w-10 px-3 h-14" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                ref={(element) => {
                                                    if (element) {
                                                        element.indeterminate = someSelected;
                                                    }
                                                }}
                                                onChange={(event) => {
                                                    if (event.target.checked) {
                                                        setSelectedUsers(new Set(users.map((user) => user.id)));
                                                        return;
                                                    }

                                                    setSelectedUsers(new Set());
                                                }}
                                                className="w-[14px] h-[14px] rounded-[3px] border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                style={{ margin: 'auto', display: 'block' }}
                                            />
                                        </th>
                                        <th className="px-4 h-14 text-left text-[11px] font-semibold tracking-[0.05em] uppercase text-[#94a3b8] whitespace-nowrap" style={{ verticalAlign: 'middle' }}>USER</th>
                                        <th className="px-4 h-14 text-center text-[11px] font-semibold tracking-[0.05em] uppercase text-[#94a3b8] whitespace-nowrap" style={{ verticalAlign: 'middle' }}>EMAIL</th>
                                        <th className="px-4 h-14 text-center text-[11px] font-semibold tracking-[0.05em] uppercase text-[#94a3b8] whitespace-nowrap" style={{ verticalAlign: 'middle' }}>STATUS</th>
                                        <th className="px-4 h-14 text-center text-[11px] font-semibold tracking-[0.05em] uppercase text-[#94a3b8] whitespace-nowrap" style={{ verticalAlign: 'middle' }}>MFA</th>
                                        <th className="px-4 h-14 text-center text-[11px] font-semibold tracking-[0.05em] uppercase text-[#94a3b8] whitespace-nowrap" style={{ verticalAlign: 'middle' }}>ROLES</th>
                                        <th className="hidden px-4 h-14 text-center text-[11px] font-semibold tracking-[0.05em] uppercase text-[#94a3b8] whitespace-nowrap xl:table-cell" style={{ verticalAlign: 'middle' }}>LAST ACTIVE</th>
                                        <th className="hidden px-4 h-14 text-center text-[11px] font-semibold tracking-[0.05em] uppercase text-[#94a3b8] whitespace-nowrap lg:table-cell" style={{ verticalAlign: 'middle' }}>JOINED</th>
                                        <th className="px-4 h-14 text-center text-[11px] font-semibold tracking-[0.05em] uppercase text-[#94a3b8] whitespace-nowrap" style={{ verticalAlign: 'middle' }}>ACTIONS</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {users.map((u, index) => {
                                        const roleList = u.userRoles?.map(r => r.role) || [];
                                        const avatarColor = getAvatarColor(u.firstName, u.lastName);
                                        const initials = getInitials(u.firstName, u.lastName);
                                        const truncatedId = u.id.substring(0, 8);

                                        return (
                                            <tr
                                                key={u.id}
                                                className={`h-14 border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors duration-100 ${
                                                    selectedUsers.has(u.id) ? 'bg-[#eef2ff]' : ''
                                                } ${index === users.length - 1 ? 'border-b-0' : ''}`}
                                            >
                                                <td className="w-10 px-3 h-14" style={{ textAlign: 'center', verticalAlign: 'middle' }} onClick={(event) => event.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUsers.has(u.id)}
                                                        onChange={() => {
                                                            setSelectedUsers((current) => {
                                                                const next = new Set(current);
                                                                if (next.has(u.id)) {
                                                                    next.delete(u.id);
                                                                } else {
                                                                    next.add(u.id);
                                                                }
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-[14px] h-[14px] rounded-[3px] border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                        style={{ margin: 'auto', display: 'block' }}
                                                    />
                                                </td>

                                                <td className="px-4 h-14" style={{ verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div
                                                            className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                                                            style={{ backgroundColor: avatarColor }}
                                                        >
                                                            {initials}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-[13px] font-semibold text-[#0f172a] leading-[1.3] whitespace-nowrap">{u.firstName} {u.lastName}</p>
                                                            <p className="text-[11px] font-mono text-[#94a3b8] mt-px whitespace-nowrap">{truncatedId}...</p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 h-14" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <div className="mx-auto max-w-[180px]">
                                                        <p className="text-[12px] text-[#475569] font-mono truncate whitespace-nowrap">{u.email}</p>
                                                        <p className={`text-[10px] font-medium mt-0.5 ${u.emailVerified ? 'text-[#16a34a]' : 'text-[#d97706]'}`}>
                                                            {u.emailVerified ? 'Verified' : 'Unverified'}
                                                        </p>
                                                    </div>
                                                </td>

                                                <td className="px-4 h-14" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                        <span className={`inline-flex items-center gap-1 rounded-[20px] px-2 py-[2px] text-[11px] font-semibold leading-none before:content-[''] before:inline-block before:w-[5px] before:h-[5px] before:rounded-full ${
                                                            u.status === 'ACTIVE'
                                                                ? 'bg-[#dcfce7] text-[#16a34a] before:bg-[#22c55e]'
                                                                : u.status === 'LOCKED'
                                                                ? 'bg-[#fee2e2] text-[#dc2626] before:bg-[#ef4444]'
                                                                : u.status === 'INACTIVE'
                                                                ? 'bg-[#f1f5f9] text-[#64748b] before:bg-[#94a3b8]'
                                                                : 'bg-[#fef9c3] text-[#ca8a04] before:bg-[#eab308]'
                                                        }`}>
                                                            {u.status === 'ACTIVE' ? 'Active' : u.status === 'LOCKED' ? 'Locked' : 'Pending'}
                                                        </span>
                                                    </div>
                                                </td>

                                                <td className="px-4 h-14" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <p className={`text-[12px] ${u.mfaEnabled ? 'font-semibold text-[#16a34a]' : 'text-[#94a3b8]'}`}>
                                                        {u.mfaEnabled ? 'Enabled' : 'Off'}
                                                    </p>
                                                </td>

                                                <td className="px-4 h-14" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                        {roleList.length > 0 ? (
                                                            <span className="inline-block bg-[#ede9fe] text-[#7c3aed] text-[11px] font-medium px-[7px] py-[2px] rounded-[4px] whitespace-nowrap">
                                                                {roleList[0].name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[11px] text-[#cbd5e1]">—</span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="hidden px-4 h-14 xl:table-cell" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <p className={`text-[12px] whitespace-nowrap ${u.lastLoginAt ? 'text-[#64748b]' : 'text-[#cbd5e1]'}`}>
                                                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never'}
                                                    </p>
                                                </td>

                                                <td className="hidden px-4 h-14 lg:table-cell" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <p className="text-[12px] text-[#64748b] whitespace-nowrap">
                                                        {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                    </p>
                                                </td>

                                                <td className="px-4 h-14" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                                        <button
                                                            onClick={() => handleRowClick(u.id)}
                                                            className="w-[26px] h-[26px] rounded-[6px] border border-[#e2e8f0] bg-white text-[#94a3b8] flex items-center justify-center cursor-pointer transition-all duration-150 hover:border-[#6366f1] hover:text-[#6366f1] hover:bg-[#eef2ff]"
                                                            title="View"
                                                        >
                                                            <Eye size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => navigate(`/dashboard/users/${u.id}/edit`)}
                                                            className="w-[26px] h-[26px] rounded-[6px] border border-[#e2e8f0] bg-white text-[#94a3b8] flex items-center justify-center cursor-pointer transition-all duration-150 hover:border-[#6366f1] hover:text-[#6366f1] hover:bg-[#eef2ff]"
                                                            title="Edit"
                                                        >
                                                            <Pencil size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u)}
                                                            className="w-[26px] h-[26px] rounded-[6px] border border-[#e2e8f0] bg-white text-[#94a3b8] flex items-center justify-center cursor-pointer transition-all duration-150 hover:border-[#fca5a5] hover:text-[#ef4444] hover:bg-[#fef2f2]"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Pagination Bar */}
                    {users.length > 0 && (
                        <div className="px-6 py-4 border-t border-[#f0f2f8] flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-[#7a87a8]">
                                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total} users
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        setPage(page - 1);
                                        clearSelectedUsers();
                                    }}
                                    disabled={page === 1}
                                    className="border border-[#d0d7e8] text-[#7a87a8] hover:bg-[#f4f6fb] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg p-1.5 transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="bg-[#4f46e5] text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
                                    {page}
                                </span>
                                <button
                                    onClick={() => {
                                        setPage(page + 1);
                                        clearSelectedUsers();
                                    }}
                                    disabled={page >= pagination.totalPages}
                                    className="border border-[#d0d7e8] text-[#7a87a8] hover:bg-[#f4f6fb] disabled:opacity-50 disabled:cursor-not-allowed rounded-lg p-1.5 transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-sm text-[#7a87a8]">
                                Per page
                                <div className="relative">
                                    <select
                                        value={limit}
                                        onChange={(e) => {
                                            setLimit(Number(e.target.value));
                                            setPage(1);
                                            clearSelectedUsers();
                                        }}
                                        className="appearance-none bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl px-3 py-1.5 text-sm text-[#3a4560] pr-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                                    >
                                        <option value="10">10</option>
                                        <option value="20">20</option>
                                        <option value="50">50</option>
                                        <option value="100">100</option>
                                    </select>
                                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>

            {isCreateUserOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f1623]/45 backdrop-blur-sm p-0 sm:items-center sm:p-4"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            handleCloseCreateUser();
                        }
                    }}
                >
                    <div className="mx-4 flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:mx-0 sm:max-w-4xl sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="px-5 py-3 border-b border-[#f0f2f8] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center">
                                    <UserPlus size={16} />
                                </div>
                                <div>
                                    <h2 className="text-[16px] font-semibold text-[#0f1623]">Create User</h2>
                                    <p className="text-[11px] text-[#7a87a8]">Add a new AegisMesh user and assign initial access roles.</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseCreateUser}
                                className="text-[#7a87a8] hover:text-[#0f1623] p-1.5 rounded-lg hover:bg-[#f4f6fb] transition-colors"
                                aria-label="Close create user modal"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form key={createUserFormKey} onSubmit={handleCreateUser} className="flex flex-col">
                            <div className="px-5 py-3 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-[#3a4560] mb-1 block">First Name</label>
                                        <input
                                            name="firstName"
                                            className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-xs text-[#0f1623] focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none"
                                        />
                                        {newUserErrors.firstName ? <p className="text-xs text-[#dc2626] mt-1">{newUserErrors.firstName}</p> : null}
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-[#3a4560] mb-1 block">Last Name</label>
                                        <input
                                            name="lastName"
                                            className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-xs text-[#0f1623] focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none"
                                        />
                                        {newUserErrors.lastName ? <p className="text-xs text-[#dc2626] mt-1">{newUserErrors.lastName}</p> : null}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-[#3a4560] mb-1 block">Email</label>
                                        <input
                                            name="email"
                                            type="email"
                                            className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-xs text-[#0f1623] focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none"
                                        />
                                        {newUserErrors.email ? <p className="text-xs text-[#dc2626] mt-1">{newUserErrors.email}</p> : null}
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-[#3a4560] mb-1 block">Temporary Password</label>
                                        <input
                                            name="password"
                                            type="password"
                                            className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-xs text-[#0f1623] focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none"
                                        />
                                        {newUserErrors.password ? <p className="text-xs text-[#dc2626] mt-1">{newUserErrors.password}</p> : null}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-[#3a4560] mb-1 block">Status</label>
                                    <select
                                        name="status"
                                        defaultValue="ACTIVE"
                                        className="w-full border border-[#d0d7e8] rounded-xl px-3 py-2 text-xs text-[#0f1623] focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none"
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive</option>
                                        <option value="LOCKED">Locked</option>
                                    </select>
                                </div>

                                <div>
                                    <p className="text-xs font-medium text-[#3a4560] mb-1.5">Assign Roles</p>
                                    {roles.length === 0 ? (
                                        <p className="text-xs text-[#7a87a8]">No roles found.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {roles.map((role) => (
                                                <label key={role.id} className="flex items-start gap-2 border border-[#e3e8f4] rounded-lg px-2.5 py-1.5">
                                                    <input type="checkbox" name="roleIds" value={role.id} className="mt-1" />
                                                    <span className="min-w-0">
                                                        <span className="block text-xs font-medium text-[#0f1623] truncate">{role.name}</span>
                                                        <span className="block text-[10px] text-[#7a87a8] truncate">{role.description || 'No description'}</span>
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <label className="flex items-center gap-2 text-xs text-[#3a4560]">
                                    <input type="checkbox" name="sendWelcomeEmail" />
                                    Send welcome email
                                </label>
                            </div>

                            <div className="flex flex-col-reverse gap-2.5 border-t border-[#f0f2f8] px-5 py-2.5 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={handleCloseCreateUser}
                                    className="border border-[#d0d7e8] text-[#3a4560] hover:bg-[#f4f6fb] rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createUserMutation.isPending}
                                    className="bg-[#4f46e5] hover:bg-[#3730a3] text-white rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            ) : null}

            {selectedUsers.size > 0 ? (
                <BulkActionBar
                    selectedUsers={selectedArray}
                    users={users}
                    onSuccess={() => {
                        setSelectedUsers(new Set());
                        queryClient.invalidateQueries({ queryKey: ['users'] });
                    }}
                    onClear={() => setSelectedUsers(new Set())}
                />
            ) : null}

        {/* Dialogs */}
        {dialogConfig?.type === 'lock' && (
                <LockConfirmDialog
                    user={dialogConfig.user}
                    onConfirm={() => statusMutation.mutate({ id: dialogConfig.user.id, status: 'LOCKED' })}
                    onCancel={() => setDialogConfig(null)}
                />
            )}

            {dialogConfig?.type === 'verify' && (
                <VerifyEmailConfirmDialog
                    user={dialogConfig.user}
                    onConfirm={() => verifyMutation.mutate(dialogConfig.user.id)}
                    onCancel={() => setDialogConfig(null)}
                />
            )}

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


