import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
    ChevronDown,
    ChevronLeft,
    ChevronUp,
    Loader2,
    ShieldCheck,
    X,
} from 'lucide-react';

import toast from 'react-hot-toast';

import {
    roleTemplates,
    rbacAPI,
    userAPI,
} from '../../services/api';

import {
    COLOR_MAP,
    ICON_MAP,
} from './templateMeta';

function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

function MultiSelectSearch({
    label,
    subtext,
    items,
    selectedIds,
    onChange,
    placeholder,
    getPrimary,
    getSecondary,
}) {
    const [query, setQuery] =
        useState('');

    const [isOpen, setIsOpen] =
        useState(false);

    const selectedItems = useMemo(
        () =>
            items.filter((item) =>
                selectedIds.includes(
                    item.id
                )
            ),
        [items, selectedIds]
    );

    const filteredItems = useMemo(() => {
        const normalized = query
            .trim()
            .toLowerCase();

        return items.filter((item) => {
            if (
                selectedIds.includes(
                    item.id
                )
            ) {
                return false;
            }

            if (!normalized) {
                return true;
            }

            return `${getPrimary(
                item
            )} ${getSecondary(item)}`
                .toLowerCase()
                .includes(normalized);
        });
    }, [
        items,
        selectedIds,
        query,
        getPrimary,
        getSecondary,
    ]);

    const inputId = `multi-select-${label
        .toLowerCase()
        .replace(/\s+/g, '-')}`;

    return (
        <div>
            <label
                htmlFor={inputId}
                className="block text-sm font-medium text-slate-700"
            >
                {label}
            </label>

            {subtext && (
                <p className="mt-0.5 text-xs text-slate-400">
                    {subtext}
                </p>
            )}

            <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
                {selectedItems.length >
                    0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                        {selectedItems.map(
                            (item) => (
                                <span
                                    key={
                                        item.id
                                    }
                                    className="flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700"
                                >
                                    {getPrimary(
                                        item
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            onChange(
                                                selectedIds.filter(
                                                    (
                                                        id
                                                    ) =>
                                                        id !==
                                                        item.id
                                                )
                                            )
                                        }
                                        className="text-slate-500 hover:text-slate-700"
                                    >
                                        x
                                    </button>
                                </span>
                            )
                        )}
                    </div>
                )}

                <input
                    id={inputId}
                    type="text"
                    value={query}
                    placeholder={
                        placeholder
                    }
                    className="w-full px-2 py-1.5 text-sm outline-none"
                    onFocus={() =>
                        setIsOpen(
                            true
                        )
                    }
                    onChange={(
                        event
                    ) => {
                        setQuery(
                            event.target
                                .value
                        );

                        setIsOpen(
                            true
                        );
                    }}
                />

                {isOpen && (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-100">
                        {filteredItems.length ===
                        0 ? (
                            <p className="px-3 py-2 text-xs text-slate-400">
                                No
                                matches
                                found
                            </p>
                        ) : (
                            filteredItems.map(
                                (
                                    item
                                ) => (
                                    <button
                                        key={
                                            item.id
                                        }
                                        type="button"
                                        onClick={() => {
                                            onChange(
                                                [
                                                    ...selectedIds,
                                                    item.id,
                                                ]
                                            );

                                            setQuery(
                                                ''
                                            );
                                        }}
                                        className="w-full px-3 py-2 text-left hover:bg-slate-50"
                                    >
                                        <p className="text-sm text-slate-800">
                                            {getPrimary(
                                                item
                                            )}
                                        </p>

                                        <p className="truncate text-xs text-slate-400">
                                            {getSecondary(
                                                item
                                            )}
                                        </p>
                                    </button>
                                )
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

MultiSelectSearch.propTypes = {
    label: PropTypes.string
        .isRequired,
    subtext:
        PropTypes.string,
    items:
        PropTypes.arrayOf(
            PropTypes.shape({
                id: PropTypes.oneOfType(
                    [
                        PropTypes.string,
                        PropTypes.number,
                    ]
                ).isRequired,
            })
        ).isRequired,
    selectedIds:
        PropTypes.arrayOf(
            PropTypes.oneOfType([
                PropTypes.string,
                PropTypes.number,
            ])
        ).isRequired,
    onChange:
        PropTypes.func
            .isRequired,
    placeholder:
        PropTypes.string
            .isRequired,
    getPrimary:
        PropTypes.func
            .isRequired,
    getSecondary:
        PropTypes.func
            .isRequired,
};

export default function ApplyTemplateModal({
    template,
    onBack,
    onClose,
    onSuccess,
}) {
    const colors =
        COLOR_MAP[
            template.color
        ] || COLOR_MAP.indigo;

    const IconComponent =
        ICON_MAP[
            template.icon
        ] || ShieldCheck;

    const [roleName, setRoleName] =
        useState(template.name);

    const [
        description,
        setDescription,
    ] = useState(
        template.description ||
            ''
    );

    const [
        selectedUserIds,
        setSelectedUserIds,
    ] = useState([]);

    const [
        selectedGroupIds,
        setSelectedGroupIds,
    ] = useState([]);

    const [showPolicies, setShowPolicies] =
        useState(false);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [nameError, setNameError] =
        useState('');

    const roleNameInputId =
        'role-name-input';

    const descriptionInputId =
        'role-description-input';

    const {
        data: users = [],
    } = useQuery({
        queryKey: [
            'users-list',
            'template-modal',
        ],
        queryFn: () =>
            userAPI
                .getUsers({
                    page: 1,
                    limit: 100,
                })
                .then(
                    (response) =>
                        response.data
                            ?.data ||
                        []
                ),
    });

    const {
        data: groups = [],
    } = useQuery({
        queryKey: [
            'groups',
            'template-modal',
        ],
        queryFn: () =>
            rbacAPI
                .getGroups()
                .then(
                    (response) =>
                        response.data
                            ?.data ||
                        []
                ),
    });

    const handleApply =
        async () => {
            if (
                !roleName.trim()
            ) {
                setNameError(
                    'Role name is required'
                );

                return;
            }

            setIsSubmitting(
                true
            );

            setNameError('');

            try {
                const response =
                    await roleTemplates.apply(
                        template.id,
                        {
                            roleName:
                                roleName.trim(),
                            description:
                                description.trim(),
                            assignToUserIds:
                                selectedUserIds,
                            assignToGroupIds:
                                selectedGroupIds,
                        }
                    );

                const policiesCreated =
                    response.data
                        ?.data
                        ?.policiesCreated ||
                    0;

                toast.success(
                    `Role "${roleName.trim()}" created with ${policiesCreated} policies!`
                );

                onSuccess?.(
                    response.data
                        ?.data
                        ?.role
                );
            } catch (
                error
            ) {
                const code =
                    error
                        ?.response
                        ?.data
                        ?.code ||
                    error
                        ?.response
                        ?.data
                        ?.error
                        ?.code;

                if (
                    code ===
                    'ROLE_NAME_EXISTS'
                ) {
                    setNameError(
                        'A role with this name already exists'
                    );

                    return;
                }

                toast.error(
                    'Failed to create role'
                );
            } finally {
                setIsSubmitting(
                    false
                );
            }
        };

    const policyToggleIcon =
        showPolicies
            ? ChevronUp
            : ChevronDown;

    const PolicyToggleIcon =
        policyToggleIcon;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="mx-4 max-h-[90vh] w-full overflow-y-auto rounded-t-[20px] bg-white shadow-2xl sm:mx-0 sm:max-w-lg sm:rounded-2xl">
                <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
                    <button
                        type="button"
                        onClick={
                            onBack
                        }
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <ChevronLeft
                            size={
                                18
                            }
                        />
                    </button>

                    <div
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg}`}
                    >
                        <IconComponent
                            size={
                                18
                            }
                            className={
                                colors.icon
                            }
                        />
                    </div>

                    <div className="flex-1">
                        <p className="text-lg font-bold text-slate-900">
                            Configure
                            Role
                        </p>

                        <p className="text-sm text-slate-500">
                            From:{' '}
                            {
                                template.name
                            }
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="text-slate-400 hover:text-slate-600"
                    >
                        <X
                            size={
                                18
                            }
                        />
                    </button>
                </div>

                <div className="mx-6 mt-5 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                        <p className="text-2xl font-bold text-slate-900">
                            {
                                template
                                    .policies
                                    .length
                            }
                        </p>

                        <p className="text-xs text-slate-400">
                            Policies
                        </p>
                    </div>

                    <span className="h-8 w-px bg-slate-200" />

                    <div>
                        <p className="text-2xl font-bold text-slate-900">
                            {
                                template
                                    .permissions
                                    .length
                            }
                        </p>

                        <p className="text-xs text-slate-400">
                            Permissions
                        </p>
                    </div>
                </div>

                <div className="space-y-5 px-6 py-5">
                    <div>
                        <label
                            htmlFor={
                                roleNameInputId
                            }
                            className="mb-1.5 block text-sm font-medium text-slate-700"
                        >
                            Role
                            Name
                            *
                        </label>

                        <input
                            id={
                                roleNameInputId
                            }
                            type="text"
                            value={
                                roleName
                            }
                            onChange={(
                                event
                            ) => {
                                setRoleName(
                                    event
                                        .target
                                        .value
                                );

                                if (
                                    nameError
                                ) {
                                    setNameError(
                                        ''
                                    );
                                }
                            }}
                            className={classNames(
                                'w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200',
                                nameError
                                    ? 'border-red-300 focus:border-red-400'
                                    : 'border-slate-300 focus:border-indigo-400'
                            )}
                        />

                        {nameError && (
                            <p className="mt-1 text-xs text-red-500">
                                {
                                    nameError
                                }
                            </p>
                        )}
                    </div>

                    <div>
                        <label
                            htmlFor={
                                descriptionInputId
                            }
                            className="mb-1.5 block text-sm font-medium text-slate-700"
                        >
                            Description
                        </label>

                        <textarea
                            id={
                                descriptionInputId
                            }
                            rows={
                                2
                            }
                            value={
                                description
                            }
                            onChange={(
                                event
                            ) =>
                                setDescription(
                                    event
                                        .target
                                        .value
                                )
                            }
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
                        />
                    </div>

                    <MultiSelectSearch
                        label="Assign to Users (optional)"
                        subtext="Role will be immediately applied to selected users"
                        items={
                            users
                        }
                        selectedIds={
                            selectedUserIds
                        }
                        onChange={
                            setSelectedUserIds
                        }
                        placeholder="Search users..."
                        getPrimary={(
                            user
                        ) =>
                            `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
                            user.email
                        }
                        getSecondary={(
                            user
                        ) =>
                            user.email
                        }
                    />

                    <MultiSelectSearch
                        label="Assign to Groups (optional)"
                        subtext="Role will be immediately applied to selected groups"
                        items={
                            groups
                        }
                        selectedIds={
                            selectedGroupIds
                        }
                        onChange={
                            setSelectedGroupIds
                        }
                        placeholder="Search groups..."
                        getPrimary={(
                            group
                        ) =>
                            group.name
                        }
                        getSecondary={(
                            group
                        ) =>
                            group.description ||
                            'No description provided'
                        }
                    />

                    <div>
                        <button
                            type="button"
                            onClick={() =>
                                setShowPolicies(
                                    (
                                        value
                                    ) =>
                                        !value
                                )
                            }
                            className="flex items-center gap-2 text-sm font-medium text-slate-700"
                        >
                            <PolicyToggleIcon
                                size={
                                    16
                                }
                            />

                            View
                            policies
                            that
                            will
                            be
                            created
                            (
                            {
                                template
                                    .policies
                                    .length
                            }
                            )
                        </button>

                        {showPolicies && (
                            <div className="mt-2 space-y-2">
                                {template.policies.map(
                                    (
                                        policy
                                    ) => {
                                        const effectClasses =
                                            policy.effect ===
                                            'ALLOW'
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-red-100 text-red-700';

                                        return (
                                            <div
                                                key={
                                                    policy.name
                                                }
                                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={classNames(
                                                            'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase',
                                                            effectClasses
                                                        )}
                                                    >
                                                        {
                                                            policy.effect
                                                        }
                                                    </span>

                                                    <p className="text-sm font-medium text-slate-900">
                                                        {
                                                            policy.name
                                                        }
                                                    </p>
                                                </div>

                                                <p className="mt-1 truncate text-xs text-slate-500">
                                                    Actions:{' '}
                                                    {policy.actions.join(
                                                        ', '
                                                    )}
                                                </p>

                                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                                    Resources:{' '}
                                                    {policy.resources.join(
                                                        ', '
                                                    )}
                                                </p>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-slate-400">
                        {
                            template
                                .policies
                                .length
                        }{' '}
                        policies
                        will be
                        created
                    </p>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={
                                onClose
                            }
                            disabled={
                                isSubmitting
                            }
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={
                                handleApply
                            }
                            disabled={
                                isSubmitting
                            }
                            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-60"
                        >
                            {isSubmitting && (
                                <Loader2
                                    size={
                                        15
                                    }
                                    className="animate-spin"
                                />
                            )}

                            {isSubmitting
                                ? 'Creating...'
                                : 'Create Role'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

ApplyTemplateModal.propTypes = {
    onBack:
        PropTypes.func,
    onClose:
        PropTypes.func,
    onSuccess:
        PropTypes.func,

    template:
        PropTypes.shape({
            id: PropTypes.oneOfType(
                [
                    PropTypes.string,
                    PropTypes.number,
                ]
            ).isRequired,

            name:
                PropTypes.string
                    .isRequired,

            description:
                PropTypes.string,

            color:
                PropTypes.string,

            icon:
                PropTypes.string,

            permissions:
                PropTypes.arrayOf(
                    PropTypes.string
                ).isRequired,

            policies:
                PropTypes.arrayOf(
                    PropTypes.shape({
                        name:
                            PropTypes.string
                                .isRequired,

                        effect:
                            PropTypes.string
                                .isRequired,

                        actions:
                            PropTypes.arrayOf(
                                PropTypes.string
                            )
                                .isRequired,

                        resources:
                            PropTypes.arrayOf(
                                PropTypes.string
                            )
                                .isRequired,
                    })
                ).isRequired,
        }).isRequired,
};