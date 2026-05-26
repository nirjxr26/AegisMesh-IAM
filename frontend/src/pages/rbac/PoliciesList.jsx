import React, {
    useMemo,
    useState,
} from 'react';

import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';

import {
    Link,
    useNavigate,
} from 'react-router-dom';

import {
    ChevronDown,
    Eye,
    FileText,
    Pencil,
    Plus,
    Search,
    Trash2,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { rbacAPI } from '../../services/api';

const EMPTY_POLICIES = [];

export default function PoliciesList() {
    const navigate =
        useNavigate();

    const queryClient =
        useQueryClient();

    const [search, setSearch] =
        useState('');

    const [
        effectFilter,
        setEffectFilter,
    ] = useState('');

    const [
        typeFilter,
        setTypeFilter,
    ] = useState('');

    const [page, setPage] =
        useState(1);

    const perPage = 20;

    const {
        data: policiesData,
        isLoading,
        isError,
    } = useQuery({
        queryKey: [
            'policies',
            search,
            effectFilter,
        ],

        queryFn: () =>
            rbacAPI.getPolicies(
                {
                    search,
                    effect:
                        effectFilter,
                }
            ),
    });

    const deleteMutation =
        useMutation({
            mutationFn: (
                id
            ) =>
                rbacAPI.deletePolicy(
                    id
                ),

            onSuccess: () => {
                queryClient.invalidateQueries(
                    [
                        'policies',
                    ]
                );

                toast.success(
                    'Policy deleted'
                );
            },

            onError: (
                error
            ) => {
                toast.error(
                    error.response
                        ?.data
                        ?.error ||
                        'Failed to delete policy'
                );
            },
        });

    const policies =
        policiesData?.data
            ?.data ??
        EMPTY_POLICIES;

    const filteredPolicies =
        useMemo(() => {
            if (
                !typeFilter
            ) {
                return policies;
            }

            if (
                typeFilter ===
                'SYSTEM'
            ) {
                return policies.filter(
                    (
                        policy
                    ) =>
                        policy.isSystem
                );
            }

            return policies.filter(
                (
                    policy
                ) =>
                    !policy.isSystem
            );
        }, [
            policies,
            typeFilter,
        ]);

    const total =
        filteredPolicies.length;

    const totalPages =
        Math.max(
            1,
            Math.ceil(
                total /
                    perPage
            )
        );

    const safePage =
        Math.min(
            page,
            totalPages
        );

    const startIndex =
        (safePage - 1) *
        perPage;

    const endIndex =
        Math.min(
            startIndex +
                perPage,
            total
        );

    const visiblePolicies =
        filteredPolicies.slice(
            startIndex,
            endIndex
        );

    function handleDelete(
        policy
    ) {
        if (
            policy.isSystem
        ) {
            return;
        }

        const confirmed =
            globalThis.confirm(
                `Are you sure you want to delete "${policy.name}"?`
            );

        if (confirmed) {
            deleteMutation.mutate(
                policy.id
            );
        }
    }

    let content = null;

    if (isLoading) {
        content = (
            <div className="py-16 text-center text-sm text-[#7a87a8]">
                Loading
                policies...
            </div>
        );
    } else if (
        isError
    ) {
        content = (
            <div className="py-16 text-center text-sm text-red-500">
                Failed to
                load
                policies.
            </div>
        );
    } else if (
        visiblePolicies.length ===
        0
    ) {
        content = (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
                <div className="inline-flex rounded-2xl bg-[#f4f6fb] p-4">
                    <FileText
                        size={28}
                        className="text-[#7a87a8]"
                    />
                </div>

                <p className="text-[15px] font-semibold text-[#0f1623]">
                    No
                    policies
                    found
                </p>

                <p className="text-[13px] text-[#7a87a8]">
                    Try
                    different
                    filters.
                </p>
            </div>
        );
    } else {
        content = (
            <table className="w-full table-fixed border-collapse">
                <colgroup>
                    <col
                        style={{
                            width:
                                '40%',
                        }}
                    />

                    <col
                        style={{
                            width:
                                '15%',
                        }}
                    />

                    <col
                        style={{
                            width:
                                '15%',
                        }}
                    />

                    <col
                        style={{
                            width:
                                '15%',
                        }}
                    />

                    <col
                        style={{
                            width:
                                '15%',
                        }}
                    />
                </colgroup>

                <thead>
                    <tr className="h-10 border-b border-[#e2e8f0] bg-[#f8fafc]">
                        <th className="h-10 whitespace-nowrap px-4 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
                            POLICY
                        </th>

                        <th className="h-10 whitespace-nowrap px-4 text-center align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
                            TYPE
                        </th>

                        <th className="h-10 whitespace-nowrap px-4 text-center align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
                            EFFECT
                        </th>

                        <th className="h-10 whitespace-nowrap px-4 text-center align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
                            SCOPE
                        </th>

                        <th className="h-10 whitespace-nowrap px-4 text-center align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8]">
                            ACTIONS
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {visiblePolicies.map(
                        (
                            policy
                        ) => (
                            <tr
                                key={
                                    policy.id
                                }
                                className="h-16 border-b border-[#f1f5f9] transition-colors duration-100 hover:bg-[#f8fafc]"
                            >
                                <td className="h-16 overflow-hidden px-4 align-middle">
                                    <div className="flex h-16 min-w-0 items-center gap-3">
                                        <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px] bg-[#ede9fe] text-[#7c3aed]">
                                            <FileText
                                                size={
                                                    15
                                                }
                                            />
                                        </div>

                                        <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
                                            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-semibold text-[#0f172a]">
                                                {
                                                    policy.name
                                                }
                                            </p>

                                            <p className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] text-[#94a3b8]">
                                                {policy.description ||
                                                    'No description provided'}
                                            </p>
                                        </div>
                                    </div>
                                </td>

                                <td className="h-16 overflow-hidden px-4 text-center align-middle">
                                    <span
                                        className={`inline-flex items-center justify-center rounded-[20px] px-2.5 py-[3px] text-[11px] font-medium whitespace-nowrap ${
                                            policy.isSystem
                                                ? 'bg-[#dbeafe] text-[#1d4ed8]'
                                                : 'bg-[#f1f5f9] text-[#475569]'
                                        }`}
                                    >
                                        {policy.isSystem
                                            ? 'AWS Managed'
                                            : 'Custom'}
                                    </span>
                                </td>

                                <td className="h-16 overflow-hidden px-4 text-center align-middle">
                                    <span
                                        className={`inline-flex items-center justify-center rounded-[20px] px-2.5 py-[3px] text-[11px] font-semibold whitespace-nowrap ${
                                            policy.effect ===
                                            'ALLOW'
                                                ? 'bg-[#dcfce7] text-[#16a34a]'
                                                : 'bg-[#fee2e2] text-[#dc2626]'
                                        }`}
                                    >
                                        {policy.effect ===
                                        'ALLOW'
                                            ? 'Allow'
                                            : 'Deny'}
                                    </span>
                                </td>

                                <td className="h-16 overflow-hidden px-4 text-center align-middle">
                                    <div className="flex flex-col items-center gap-0.5">
                                        <p className="text-[12px] font-medium text-[#374151]">
                                            Actions:{' '}
                                            {policy.actions
                                                ?.length ||
                                                0}
                                        </p>

                                        <p className="text-[12px] text-[#94a3b8]">
                                            Attached:{' '}
                                            {policy
                                                ._count
                                                ?.rolePolicies ||
                                                0}{' '}
                                            roles
                                        </p>
                                    </div>
                                </td>

                                <td className="h-16 overflow-hidden px-4 text-center align-middle">
                                    <div className="flex items-center justify-center gap-[6px]">
                                        <Link
                                            to={`/dashboard/policies/${policy.id}`}
                                            className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#e2e8f0] bg-white text-[#94a3b8] transition-all duration-150 hover:border-[#0ea5e9] hover:bg-[#f0f9ff] hover:text-[#0ea5e9]"
                                            title="View"
                                        >
                                            <Eye
                                                size={
                                                    13
                                                }
                                            />
                                        </Link>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    `/dashboard/policies/${policy.id}`
                                                )
                                            }
                                            className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#e2e8f0] bg-white text-[#94a3b8] transition-all duration-150 hover:border-[#6366f1] hover:bg-[#eef2ff] hover:text-[#6366f1]"
                                            title="Edit"
                                        >
                                            <Pencil
                                                size={
                                                    13
                                                }
                                            />
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleDelete(
                                                    policy
                                                )
                                            }
                                            disabled={
                                                policy.isSystem ||
                                                deleteMutation.isPending
                                            }
                                            className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-[#e2e8f0] bg-white text-[#94a3b8] transition-all duration-150 hover:border-[#fca5a5] hover:bg-[#fef2f2] hover:text-[#ef4444] disabled:cursor-not-allowed disabled:opacity-40"
                                            title={
                                                policy.isSystem
                                                    ? 'AWS managed policies cannot be deleted'
                                                    : 'Delete'
                                            }
                                        >
                                            <Trash2
                                                size={
                                                    13
                                                }
                                            />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )
                    )}
                </tbody>
            </table>
        );
    }

    return (
        <div className="w-full">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-[20px] font-semibold text-[#0f1623]">
                        Policies
                    </h1>

                    <p className="mt-1 text-[13px] text-[#7a87a8]">
                        Author
                        and
                        attach
                        policies
                        that
                        control
                        resource
                        access.
                    </p>
                </div>

                <button
                    type="button"
                    className="flex items-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3730a3]"
                >
                    <Plus
                        size={15}
                    />

                    + New
                    Policy
                </button>
            </div>

            <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#d0d7e8] bg-white px-5 py-4 shadow-sm lg:flex-nowrap">
                <div className="relative min-w-[260px] flex-1">
                    <Search
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a87a8]"
                    />

                    <input
                        type="text"
                        value={
                            search
                        }
                        onChange={(
                            event
                        ) => {
                            setSearch(
                                event
                                    .target
                                    .value
                            );

                            setPage(
                                1
                            );
                        }}
                        placeholder="Search policies..."
                        className="w-full rounded-xl border border-[#d0d7e8] py-2.5 pl-9 pr-4 text-sm text-[#0f1623] outline-none placeholder:text-[#7a87a8] focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25"
                    />
                </div>

                <div className="relative">
                    <select
                        value={
                            effectFilter
                        }
                        onChange={(
                            event
                        ) => {
                            setEffectFilter(
                                event
                                    .target
                                    .value
                            );

                            setPage(
                                1
                            );
                        }}
                        className="cursor-pointer appearance-none rounded-xl border border-[#d0d7e8] bg-[#f4f6fb] px-4 py-2.5 pr-8 text-sm text-[#3a4560] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                    >
                        <option value="">
                            All
                            Effects
                        </option>

                        <option value="ALLOW">
                            Allow
                        </option>

                        <option value="DENY">
                            Deny
                        </option>
                    </select>

                    <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8]"
                    />
                </div>

                <div className="relative">
                    <select
                        value={
                            typeFilter
                        }
                        onChange={(
                            event
                        ) => {
                            setTypeFilter(
                                event
                                    .target
                                    .value
                            );

                            setPage(
                                1
                            );
                        }}
                        className="cursor-pointer appearance-none rounded-xl border border-[#d0d7e8] bg-[#f4f6fb] px-4 py-2.5 pr-8 text-sm text-[#3a4560] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                    >
                        <option value="">
                            All
                            Types
                        </option>

                        <option value="SYSTEM">
                            AWS
                            Managed
                        </option>

                        <option value="CUSTOM">
                            Custom
                        </option>
                    </select>

                    <ChevronDown
                        size={14}
                        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8]"
                    />
                </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#d0d7e8] bg-white shadow-sm">
                {content}
            </div>
        </div>
    );
}