import PropTypes from 'prop-types';
import { useEffect, useMemo, useState } from 'react';
import {
    CheckCircle,
    CheckSquare,
    Download,
    Loader2,
    Lock,
    Shield,
    Trash2,
    Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { bulkUsers } from '../../services/api';

function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

function getInitials(user) {
    const first = user?.firstName?.[0] || '';
    const last = user?.lastName?.[0] || '';

    return `${first}${last}`.toUpperCase() || 'U';
}

function selectedFromIds(ids, users) {
    const byId = new Map(
        users.map((user) => [user.id, user])
    );

    return ids
        .map((id) => byId.get(id))
        .filter(Boolean);
}

function ActionButton({
    icon: Icon,
    label,
    onClick,
    disabled,
    className,
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={classNames(
                'flex min-h-11 items-center gap-[5px] rounded-[8px] px-3 py-2 text-[11px] font-medium transition-all duration-150',
                'disabled:cursor-not-allowed disabled:opacity-60',
                'sm:min-h-0 sm:py-1.5',
                className
            )}
        >
            <Icon size={12} />
            {label}
        </button>
    );
}

ActionButton.propTypes = {
    icon: PropTypes.elementType.isRequired,
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    className: PropTypes.string,
};

function StatusIndicator({ status }) {
    if (status === 'loading') {
        return (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <Loader2
                    size={16}
                    className="animate-spin"
                />
                Processing...
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle size={16} />
                Done!
            </div>
        );
    }

    return null;
}

StatusIndicator.propTypes = {
    status: PropTypes.string.isRequired,
};

function getStatusActionText(status) {
    if (status === 'ACTIVE') {
        return 'activated';
    }

    if (status === 'LOCKED') {
        return 'locked';
    }

    return 'updated';
}

export default function BulkActionBar({
    selectedUsers,
    users,
    onSuccess,
    onClear,
}) {
    const [statusState, setStatusState] = useState('idle');
    const [isLoading, setIsLoading] = useState(false);

    const selectedCount = selectedUsers.length;

    const selectedUserObjects = useMemo(() => {
        return selectedFromIds(
            selectedUsers,
            users
        );
    }, [selectedUsers, users]);

    useEffect(() => {
        if (statusState !== 'success') {
            return undefined;
        }

        const timer = globalThis.setTimeout(() => {
            setStatusState('idle');
        }, 2000);

        return () => {
            globalThis.clearTimeout(timer);
        };
    }, [statusState]);

    const runAction = async (executor) => {
        setIsLoading(true);
        setStatusState('loading');

        try {
            await executor();
            setStatusState('success');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBulkStatus = async (newStatus) => {
        await runAction(async () => {
            try {
                const response =
                    await bulkUsers.updateStatus({
                        userIds: selectedUsers,
                        status: newStatus,
                    });

                const responseData =
                    response.data?.data || {};

                const actionText =
                    getStatusActionText(newStatus);

                let message =
                    `${responseData.succeeded || 0} users ${actionText}`;

                if ((responseData.skipped || 0) > 0) {
                    message += `. ${responseData.skipped} skipped.`;
                }

                toast.success(message);

                onSuccess?.();
            } catch {
                toast.error('Bulk update failed');

                throw new Error(
                    'bulk-status-failed'
                );
            }
        });
    };

    const handleExport = async () => {
        await runAction(async () => {
            try {
                const response =
                    await bulkUsers.export({
                        userIds: selectedUsers,
                        format: 'csv',
                    });

                const blob = new Blob(
                    [response.data],
                    {
                        type: 'text/csv',
                    }
                );

                const url =
                    URL.createObjectURL(blob);

                const anchor =
                    document.createElement('a');

                anchor.href = url;

                anchor.download =
                    `users-export-${new Date().toISOString().split('T')[0]}.csv`;

                document.body.appendChild(anchor);

                anchor.click();

                anchor.remove();

                URL.revokeObjectURL(url);

                toast.success(
                    `${selectedCount} users exported`
                );
            } catch {
                toast.error('Export failed');

                throw new Error(
                    'bulk-export-failed'
                );
            }
        });
    };

    const handleDelete = async () => {
        const confirmed = globalThis.confirm(
            `Delete ${selectedCount} users permanently?`
        );

        if (!confirmed) {
            return;
        }

        await runAction(async () => {
            try {
                await bulkUsers.delete({
                    userIds: selectedUsers,
                    confirmPhrase: 'DELETE',
                });

                toast.success(
                    `${selectedCount} users deleted`
                );

                onSuccess?.();
            } catch {
                toast.error(
                    'Failed to delete selected users'
                );

                throw new Error(
                    'bulk-delete-failed'
                );
            }
        });
    };

    const handleRoleAssign = () => {
        toast(
            `Role assignment for ${selectedCount} users`
        );
    };

    const handleGroupAssign = () => {
        toast(
            `Group assignment for ${selectedCount} users`
        );
    };

    if (selectedCount === 0) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-wrap items-center gap-2 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-[#0f172a] px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-[12px] sm:left-1/2 sm:right-auto sm:max-w-[96vw] sm:-translate-x-1/2">
            <div className="flex w-full items-center gap-2 sm:w-auto">
                <CheckSquare
                    size={14}
                    className="text-indigo-400"
                />

                <span className="text-[12px] font-semibold text-white">
                    {selectedCount} users selected
                </span>

                <button
                    type="button"
                    onClick={onClear}
                    className="text-[11px] text-white/40 transition-colors hover:text-white/80"
                >
                    Clear
                </button>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 sm:flex-1 sm:justify-center">
                <ActionButton
                    icon={CheckCircle}
                    label="Activate"
                    onClick={() => {
                        handleBulkStatus(
                            'ACTIVE'
                        );
                    }}
                    disabled={isLoading}
                    className="border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                />

                <ActionButton
                    icon={Lock}
                    label="Lock"
                    onClick={() => {
                        handleBulkStatus(
                            'LOCKED'
                        );
                    }}
                    disabled={isLoading}
                    className="border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                />

                <ActionButton
                    icon={Shield}
                    label="Assign Role"
                    onClick={handleRoleAssign}
                    disabled={isLoading}
                    className="border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
                />

                <ActionButton
                    icon={Users}
                    label="Add to Group"
                    onClick={handleGroupAssign}
                    disabled={isLoading}
                    className="border border-blue-500/20 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                />

                <ActionButton
                    icon={Download}
                    label="Export"
                    onClick={handleExport}
                    disabled={isLoading}
                    className="border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                />

                <ActionButton
                    icon={Trash2}
                    label="Delete"
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                />
            </div>

            <div className="flex w-full justify-start sm:w-24 sm:justify-end">
                <StatusIndicator
                    status={statusState}
                />
            </div>

            {selectedUserObjects.length > 0 ? (
                <div className="mt-2 flex w-full flex-wrap gap-2 border-t border-white/10 pt-2">
                    {selectedUserObjects
                        .slice(0, 5)
                        .map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1"
                            >
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] font-semibold text-indigo-300">
                                    {getInitials(
                                        user
                                    )}
                                </div>

                                <span className="max-w-[140px] truncate text-xs text-white/70">
                                    {user.firstName}{' '}
                                    {user.lastName}
                                </span>
                            </div>
                        ))}
                </div>
            ) : null}
        </div>
    );
}

BulkActionBar.propTypes = {
    selectedUsers: PropTypes.arrayOf(
        PropTypes.string
    ).isRequired,

    users: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string,
            firstName: PropTypes.string,
            lastName: PropTypes.string,
        })
    ).isRequired,

    onSuccess: PropTypes.func,

    onClear: PropTypes.func.isRequired,
};