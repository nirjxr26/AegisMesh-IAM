import PropTypes from 'prop-types';

import {
    AlertTriangle,
    AppWindow,
    FileText,
    KeyRound,
    Lock,
    Monitor,
    ShieldAlert,
    ShieldCheck,
    Trash2,
    UserPlus,
} from 'lucide-react';

function formatRelativeTime(value) {
    if (!value) {
        return 'Just now';
    }

    const timestamp =
        new Date(value).getTime();

    if (Number.isNaN(timestamp)) {
        return 'Just now';
    }

    const diffMs = Math.max(
        0,
        Date.now() - timestamp
    );

    const minutes = Math.floor(
        diffMs / 60000
    );

    if (minutes < 1) {
        return 'Just now';
    }

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours = Math.floor(
        minutes / 60
    );

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(
        hours / 24
    );

    if (days < 30) {
        return `${days}d ago`;
    }

    const months = Math.floor(
        days / 30
    );

    return `${months}mo ago`;
}

function getAppearance(notification) {
    const action =
        notification?.metadata?.action;

    const severity =
        notification?.metadata
            ?.severity || 'info';

    if (
        action ===
        'PASSWORD_CHANGED'
    ) {
        return {
            icon: Lock,
            chipLabel: 'Security',
            iconClassName:
                'bg-indigo-50 text-indigo-600',
            chipClassName:
                'bg-indigo-50 text-indigo-700 border border-indigo-100',
        };
    }

    if (
        action ===
        'ROLE_ASSIGNED'
    ) {
        return {
            icon: ShieldCheck,
            chipLabel: 'Role',
            iconClassName:
                'bg-violet-50 text-violet-600',
            chipClassName:
                'bg-violet-50 text-violet-700 border border-violet-100',
        };
    }

    if (
        action === 'USER_CREATED'
    ) {
        return {
            icon: UserPlus,
            chipLabel: 'Account',
            iconClassName:
                'bg-sky-50 text-sky-600',
            chipClassName:
                'bg-sky-50 text-sky-700 border border-sky-100',
        };
    }

    if (
        action ===
            'API_KEY_CREATED' ||
        action ===
            'API_KEY_REVOKED'
    ) {
        return {
            icon: KeyRound,
            chipLabel: 'Access',
            iconClassName:
                'bg-amber-50 text-amber-600',
            chipClassName:
                'bg-amber-50 text-amber-700 border border-amber-100',
        };
    }

    if (
        action ===
        'CONNECTED_APP_REVOKED'
    ) {
        return {
            icon: AppWindow,
            chipLabel: 'Access',
            iconClassName:
                'bg-amber-50 text-amber-600',
            chipClassName:
                'bg-amber-50 text-amber-700 border border-amber-100',
        };
    }

    if (
        action ===
            'TRUSTED_DEVICE_REVOKED' ||
        action ===
            'ALL_TRUSTED_DEVICES_REVOKED' ||
        action ===
            'SESSION_REVOKED' ||
        action ===
            'ALL_OTHER_SESSIONS_REVOKED' ||
        action ===
            'ALL_SESSIONS_REVOKED' ||
        action === 'LOGIN'
    ) {
        return {
            icon: Monitor,
            chipLabel: 'Activity',
            iconClassName:
                'bg-slate-100 text-slate-700',
            chipClassName:
                'bg-slate-100 text-slate-700 border border-slate-200',
        };
    }

    if (
        action ===
            'POLICY_CREATED' ||
        action ===
            'POLICY_UPDATED' ||
        action ===
            'POLICY_DELETED' ||
        action ===
            'POLICY_ATTACHED' ||
        action ===
            'POLICY_DETACHED' ||
        action ===
            'DATA_EXPORTED'
    ) {
        return {
            icon: FileText,
            chipLabel: 'System',
            iconClassName:
                'bg-cyan-50 text-cyan-700',
            chipClassName:
                'bg-cyan-50 text-cyan-700 border border-cyan-100',
        };
    }

    if (
        action ===
        'MFA_DISABLED'
    ) {
        return {
            icon: ShieldAlert,
            chipLabel: 'Security',
            iconClassName:
                'bg-red-50 text-red-600',
            chipClassName:
                'bg-red-50 text-red-700 border border-red-100',
        };
    }

    if (
        severity === 'critical'
    ) {
        return {
            icon: AlertTriangle,
            chipLabel: 'Critical',
            iconClassName:
                'bg-red-50 text-red-600',
            chipClassName:
                'bg-red-50 text-red-700 border border-red-100',
        };
    }

    const typeLabel =
        notification?.type
            ? `${notification.type.charAt(
                  0
              ).toUpperCase()}${notification.type.slice(
                  1
              )}`
            : 'Update';

    return {
        icon: ShieldCheck,
        chipLabel: typeLabel,
        iconClassName:
            'bg-emerald-50 text-emerald-600',
        chipClassName:
            'bg-emerald-50 text-emerald-700 border border-emerald-100',
    };
}

export default function NotificationItem({
    notification,
    onOpen,
    onMarkRead,
    onDelete,
    isMarkingRead,
    isDeleting,
}) {
    const appearance =
        getAppearance(notification);

    const Icon = appearance.icon;

    const containerClasses =
        notification.read
            ? 'border-[#e2e8f0] bg-white'
            : 'border-[#c7d2fe] bg-[#f8faff] shadow-sm';

    const isUnread =
        !notification.read;

    return (
        <div
            className={`rounded-2xl border p-3 transition-all ${containerClasses}`}
        >
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    onClick={() =>
                        onOpen?.(
                            notification
                        )
                    }
                    className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 text-left"
                >
                    <div
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${appearance.iconClassName}`}
                    >
                        <Icon size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[#0f172a]">
                                    {
                                        notification.title
                                    }
                                </p>

                                <p
                                    className="mt-1 text-xs leading-5 text-[#52607a]"
                                    style={{
                                        display:
                                            '-webkit-box',
                                        WebkitLineClamp:
                                            2,
                                        WebkitBoxOrient:
                                            'vertical',
                                        overflow:
                                            'hidden',
                                    }}
                                >
                                    {
                                        notification.message
                                    }
                                </p>
                            </div>

                            {isUnread && (
                                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#4f46e5]" />
                            )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${appearance.chipClassName}`}
                            >
                                {
                                    appearance.chipLabel
                                }
                            </span>

                            <span className="text-[11px] text-[#7a87a8]">
                                {formatRelativeTime(
                                    notification.createdAt
                                )}
                            </span>
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    onClick={() =>
                        onDelete?.(
                            notification
                        )
                    }
                    disabled={
                        isDeleting
                    }
                    aria-label="Delete notification"
                    className="rounded-lg p-2 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#0f172a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Trash2 size={15} />
                </button>
            </div>

            {isUnread && (
                <div className="mt-3 flex justify-end border-t border-[#edf2f7] pt-3">
                    <button
                        type="button"
                        onClick={() =>
                            onMarkRead?.(
                                notification
                            )
                        }
                        disabled={
                            isMarkingRead
                        }
                        className="text-xs font-medium text-[#4f46e5] hover:text-[#3730a3] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {isMarkingRead
                            ? 'Saving...'
                            : 'Mark as read'}
                    </button>
                </div>
            )}
        </div>
    );
}

NotificationItem.propTypes = {
    notification:
        PropTypes.shape({
            id: PropTypes.oneOfType(
                [
                    PropTypes.string,
                    PropTypes.number,
                ]
            ),
            title:
                PropTypes.string
                    .isRequired,
            message:
                PropTypes.string
                    .isRequired,
            read:
                PropTypes.bool
                    .isRequired,
            createdAt:
                PropTypes.oneOfType(
                    [
                        PropTypes.string,
                        PropTypes.instanceOf(
                            Date
                        ),
                    ]
                ),
            type: PropTypes.string,
            metadata:
                PropTypes.shape({
                    action:
                        PropTypes.string,
                    severity:
                        PropTypes.string,
                }),
        }).isRequired,

    onOpen: PropTypes.func,

    onMarkRead:
        PropTypes.func,

    onDelete: PropTypes.func,

    isMarkingRead:
        PropTypes.bool
            .isRequired,

    isDeleting:
        PropTypes.bool
            .isRequired,
};