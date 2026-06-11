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
                'bg-indigo-500/10 text-indigo-400',
            chipClassName:
                'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
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
                'bg-violet-500/10 text-violet-400',
            chipClassName:
                'bg-violet-500/10 text-violet-400 border border-violet-500/20',
        };
    }

    if (
        action === 'USER_CREATED'
    ) {
        return {
            icon: UserPlus,
            chipLabel: 'Account',
            iconClassName:
                'bg-blue-500/10 text-blue-400',
            chipClassName:
                'bg-blue-500/10 text-blue-400 border border-blue-500/20',
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
                'bg-amber-500/10 text-amber-400',
            chipClassName:
                'bg-amber-500/10 text-amber-400 border border-amber-500/20',
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
                'bg-amber-500/10 text-amber-400',
            chipClassName:
                'bg-amber-500/10 text-amber-400 border border-amber-500/20',
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
                'bg-white/5 text-white/60',
            chipClassName:
                'bg-white/5 text-white/60 border border-white/10',
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
                'bg-cyan-500/10 text-cyan-400',
            chipClassName:
                'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
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
                'bg-red-500/10 text-red-400',
            chipClassName:
                'bg-red-500/10 text-red-400 border border-red-500/20',
        };
    }

    if (
        severity === 'critical'
    ) {
        return {
            icon: AlertTriangle,
            chipLabel: 'Critical',
            iconClassName:
                'bg-red-500/10 text-red-400',
            chipClassName:
                'bg-red-500/10 text-red-400 border border-red-500/20',
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
            'bg-emerald-500/10 text-emerald-400',
        chipClassName:
            'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
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
            ? 'border-white/5 bg-[#161B26]/30'
            : 'border-indigo-500/20 bg-[#161B26]/80 shadow-lg shadow-indigo-500/5';

    const isUnread =
        !notification.read;

    return (
        <div
            className={`rounded-2xl border p-3 transition-all duration-200 group ${containerClasses}`}
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
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent transition-all group-hover:scale-105 ${appearance.iconClassName}`}
                    >
                        <Icon size={16} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-white/90 group-hover:text-indigo-400 transition-colors">
                                    {
                                        notification.title
                                    }
                                </p>

                                <p
                                    className="mt-1 text-[11px] leading-relaxed text-white/40"
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
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]" />
                            )}
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                                className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter ${appearance.chipClassName}`}
                            >
                                {
                                    appearance.chipLabel
                                }
                            </span>

                            <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">
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
                    className="rounded-lg p-1.5 text-white/20 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-30"
                >
                    <Trash2 size={13} />
                </button>
            </div>

            {isUnread && (
                <div className="mt-3 flex justify-end border-t border-white/5 pt-3">
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
                        className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60 hover:text-indigo-400 disabled:cursor-not-allowed transition-colors"
                    >
                        {isMarkingRead
                            ? 'Processing...'
                            : 'Mark Resolved'}
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