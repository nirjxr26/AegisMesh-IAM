import React, {
    useEffect,
    useMemo,
    useState,
} from 'react';

import {
    useQuery,
} from '@tanstack/react-query';

import {
    UserPlus,
} from 'lucide-react';

import {
    rbacAPI,
    userAPI,
} from '../../services/api';

import ReauthModal from '../../components/security/ReauthModal';

import { useReauth } from '../../hooks/useReauth';

const AVATAR_COLORS = {
    A: '#4f46e5',
    B: '#059669',
    C: '#0284c7',
    D: '#dc2626',
    E: '#7c3aed',
    F: '#0891b2',
    G: '#ea580c',
    H: '#2563eb',
    I: '#06b6d4',
    J: '#1d4ed8',
    K: '#9333ea',
    L: '#0d9488',
    M: '#ca8a04',
    N: '#16a34a',
    O: '#4338ca',
    P: '#6366f1',
    Q: '#6b21a8',
    R: '#7c2d12',
    S: '#166534',
    T: '#1e293b',
    U: '#374151',
    V: '#1e1b4b',
    W: '#0f172a',
    X: '#581c87',
    Y: '#be185d',
    Z: '#991b1b',
};

function getAvatarColor(firstName, lastName) {
    const initials =
        `${firstName?.[0] || ''}${lastName?.[0] || ''}`;

    const initial =
        initials.toUpperCase()[0];

    return (
        AVATAR_COLORS[initial] ||
        '#4f46e5'
    );
}

function getInitials(firstName, lastName) {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
}

function getStatusMeta(status) {
    if (status === 'ACTIVE') {
        return {
            label: 'Active',
            className:
                'bg-[#dcfce7] text-[#16a34a] before:bg-[#22c55e]',
        };
    }

    if (status === 'LOCKED') {
        return {
            label: 'Locked',
            className:
                'bg-[#fee2e2] text-[#dc2626] before:bg-[#ef4444]',
        };
    }

    if (status === 'INACTIVE') {
        return {
            label: 'Inactive',
            className:
                'bg-[#f1f5f9] text-[#64748b] before:bg-[#94a3b8]',
        };
    }

    return {
        label: 'Pending',
        className:
            'bg-[#fef9c3] text-[#ca8a04] before:bg-[#eab308]',
    };
}

export default function UsersList() {
    const {
        reauthModal,
        handleReauthClose,
        handleReauthSuccess,
    } = useReauth();

    const [search, setSearch] =
        useState('');

    const [
        debouncedSearch,
        setDebouncedSearch,
    ] = useState('');

    const [
        statusFilter,
        setStatusFilter,
    ] = useState('');

    const [mfaFilter, setMfaFilter] =
        useState('');

    const [roleFilter, setRoleFilter] =
        useState('');

    const [page, setPage] =
        useState(1);

    const limit = 20;

    useEffect(() => {
        const timer =
            globalThis.setTimeout(() => {
                setDebouncedSearch(
                    search
                );

                setPage(1);
            }, 300);

        return () => {
            globalThis.clearTimeout(
                timer
            );
        };
    }, [search]);

    const queryParams = {
        page,
        limit,
    };

    if (debouncedSearch) {
        queryParams.search =
            debouncedSearch;
    }

    if (statusFilter) {
        queryParams.status =
            statusFilter;
    }

    if (mfaFilter) {
        queryParams.mfaEnabled =
            mfaFilter === 'true';
    }

    if (roleFilter) {
        queryParams.roleId =
            roleFilter;
    }

    const {
        data: usersResponse,
    } = useQuery({
        queryKey: [
            'users',
            queryParams,
        ],

        queryFn: () =>
            userAPI
                .getUsers(
                    queryParams
                )
                .then(
                    (response) =>
                        response.data
                ),
    });

    const {
        data: rolesResponse,
    } = useQuery({
        queryKey: ['roles'],

        queryFn: () =>
            rbacAPI
                .getRoles({
                    limit: 100,
                })
                .then(
                    (response) =>
                        response.data
                ),
    });

    const users =
        usersResponse?.data || [];

    const roles = useMemo(() => {
        return (
            rolesResponse?.data ||
            []
        );
    }, [rolesResponse]);

    const pagination =
        usersResponse?.pagination || {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 1,
        };

    return (
        <>
            <div className="w-full space-y-6">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-[20px] font-semibold text-[#0f1623]">
                            Users
                        </h1>

                        <p className="mt-1 text-[13px] text-[#7a87a8]">
                            Manage all
                            AegisMesh
                            users,
                            their
                            status
                            and
                            access.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3730a3] sm:w-auto"
                    >
                        <UserPlus
                            size={
                                15
                            }
                        />

                        + Add
                        User
                    </button>
                </div>

                <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
                    <div className="mb-5 grid gap-4 md:grid-cols-4">
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                            className="rounded-xl border border-[#dbe3f0] px-4 py-2 text-sm outline-none transition-all focus:border-[#4f46e5]"
                        />

                        <select
                            value={
                                statusFilter
                            }
                            onChange={(
                                event
                            ) =>
                                setStatusFilter(
                                    event
                                        .target
                                        .value
                                )
                            }
                            className="rounded-xl border border-[#dbe3f0] px-4 py-2 text-sm outline-none transition-all focus:border-[#4f46e5]"
                        >
                            <option value="">
                                All
                                Status
                            </option>

                            <option value="ACTIVE">
                                Active
                            </option>

                            <option value="LOCKED">
                                Locked
                            </option>

                            <option value="INACTIVE">
                                Inactive
                            </option>
                        </select>

                        <select
                            value={
                                mfaFilter
                            }
                            onChange={(
                                event
                            ) =>
                                setMfaFilter(
                                    event
                                        .target
                                        .value
                                )
                            }
                            className="rounded-xl border border-[#dbe3f0] px-4 py-2 text-sm outline-none transition-all focus:border-[#4f46e5]"
                        >
                            <option value="">
                                MFA Status
                            </option>

                            <option value="true">
                                Enabled
                            </option>

                            <option value="false">
                                Disabled
                            </option>
                        </select>

                        <select
                            value={
                                roleFilter
                            }
                            onChange={(
                                event
                            ) =>
                                setRoleFilter(
                                    event
                                        .target
                                        .value
                                )
                            }
                            className="rounded-xl border border-[#dbe3f0] px-4 py-2 text-sm outline-none transition-all focus:border-[#4f46e5]"
                        >
                            <option value="">
                                All Roles
                            </option>

                            {roles.map(
                                (
                                    role
                                ) => (
                                    <option
                                        key={
                                            role.id
                                        }
                                        value={
                                            role.id
                                        }
                                    >
                                        {
                                            role.name
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="border-b border-[#e2e8f0]">
                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                                        User
                                    </th>

                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                                        Email
                                    </th>

                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                                        Status
                                    </th>

                                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748b]">
                                        MFA
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {users.map(
                                    (
                                        user
                                    ) => {
                                        const status =
                                            getStatusMeta(
                                                user.status
                                            );

                                        return (
                                            <tr
                                                key={
                                                    user.id
                                                }
                                                className="border-b border-[#f1f5f9] transition-colors hover:bg-[#f8fafc]"
                                            >
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                                                            style={{
                                                                backgroundColor:
                                                                    getAvatarColor(
                                                                        user.firstName,
                                                                        user.lastName
                                                                    ),
                                                            }}
                                                        >
                                                            {getInitials(
                                                                user.firstName,
                                                                user.lastName
                                                            )}
                                                        </div>

                                                        <div>
                                                            <p className="text-sm font-medium text-[#0f172a]">
                                                                {
                                                                    user.firstName
                                                                }{' '}
                                                                {
                                                                    user.lastName
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-4 text-sm text-[#475569]">
                                                    {
                                                        user.email
                                                    }
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span
                                                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium before:h-2 before:w-2 before:rounded-full ${status.className}`}
                                                    >
                                                        {
                                                            status.label
                                                        }
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4 text-sm text-[#475569]">
                                                    {user.mfaEnabled
                                                        ? 'Enabled'
                                                        : 'Disabled'}
                                                </td>
                                            </tr>
                                        );
                                    }
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                        <p className="text-sm text-[#64748b]">
                            Showing page{' '}
                            {
                                pagination.page
                            }{' '}
                            of{' '}
                            {
                                pagination.totalPages
                            }
                        </p>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={
                                    pagination.page <=
                                    1
                                }
                                onClick={() =>
                                    setPage(
                                        (
                                            previous
                                        ) =>
                                            previous -
                                            1
                                    )
                                }
                                className="rounded-lg border border-[#dbe3f0] px-3 py-2 text-sm transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Previous
                            </button>

                            <button
                                type="button"
                                disabled={
                                    pagination.page >=
                                    pagination.totalPages
                                }
                                onClick={() =>
                                    setPage(
                                        (
                                            previous
                                        ) =>
                                            previous +
                                            1
                                    )
                                }
                                className="rounded-lg border border-[#dbe3f0] px-3 py-2 text-sm transition-colors hover:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ReauthModal
                isOpen={
                    reauthModal.isOpen
                }
                onClose={
                    handleReauthClose
                }
                onSuccess={
                    handleReauthSuccess
                }
                action={
                    reauthModal.action
                }
                requiresMfa={
                    reauthModal.requiresMfa
                }
                actionLabel={
                    reauthModal.actionLabel
                }
            />
        </>
    );
}