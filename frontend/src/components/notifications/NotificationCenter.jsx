import PropTypes from 'prop-types';
import NotificationItem from './NotificationItem';

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
    { id: 'critical', label: 'Critical' },
];

function FilterPill({
    active,
    label,
    count,
    onClick,
}) {
    const activeClasses = active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
        : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/80';

    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${activeClasses}`}
        >
            {label} ({count})
        </button>
    );
}

FilterPill.propTypes = {
    active: PropTypes.bool.isRequired,
    label: PropTypes.string.isRequired,
    count: PropTypes.number.isRequired,
    onClick: PropTypes.func,
};

function EmptyState({ activeFilter }) {
    const emptyStateCopyMap = {
        unread:
            'Unread alerts will appear here when something important changes.',
        critical:
            'No critical notifications are active right now.',
        all:
            'Important security, role, and access events will appear here.',
    };

    const copy =
        emptyStateCopyMap[activeFilter] ||
        emptyStateCopyMap.all;

    return (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0F1117]/50 px-5 py-10 text-center">
            <p className="text-sm font-semibold text-white/90">
                No notifications yet
            </p>

            <p className="mt-2 text-xs leading-5 text-white/40">
                {copy}
            </p>
        </div>
    );
}

EmptyState.propTypes = {
    activeFilter: PropTypes.string.isRequired,
};

function LoadingState() {
    return (
        <div className="space-y-3">
            {Array.from({
                length: 3,
            }).map((_, index) => {
                const skeletonKey = `loading-${index}`;

                return (
                    <div
                        key={skeletonKey}
                        className="animate-pulse rounded-2xl border border-white/5 bg-[#161B26] p-4"
                    >
                        <div className="flex items-start gap-3">
                            <div className="h-10 w-10 rounded-xl bg-white/5" />

                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-40 rounded bg-white/5" />

                                <div className="h-3 w-full rounded bg-white/[0.02]" />

                                <div className="h-3 w-4/5 rounded bg-white/[0.02]" />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default function NotificationCenter({
    notifications,
    allNotifications,
    unreadCount,
    activeFilter,
    connectionMode,
    isLoading,
    isMarkingAllRead,
    pendingReadId,
    pendingDeleteId,
    onFilterChange,
    onMarkAllRead,
    onMarkRead,
    onDelete,
    onOpen,
    onOpenPreferences,
    onOpenSecurity,
}) {
    const sourceNotifications =
        allNotifications || notifications;

    const allCount =
        sourceNotifications.length;

    const unreadOnlyCount =
        sourceNotifications.filter(
            (notification) =>
                !notification.read
        ).length;

    const criticalCount =
        sourceNotifications.filter(
            (notification) =>
                notification.metadata
                    ?.severity ===
                'critical'
        ).length;

    const filterCountMap = {
        all: allCount,
        unread: unreadOnlyCount,
        critical: criticalCount,
    };

    const connectionBadgeClasses =
        connectionMode === 'Live'
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20';

    const hasNotifications =
        notifications.length > 0;

    return (
        <div className="absolute right-0 top-full z-50 mt-3 w-[min(26rem,calc(100vw-1.5rem))] overflow-hidden rounded-3xl border border-white/10 bg-[#161B26] shadow-2xl backdrop-blur-xl">
            <div className="border-b border-white/5 bg-gradient-to-br from-[#1c2331] to-[#161B26] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="text-sm font-bold text-white/95">
                            Incident Feed
                        </p>

                        <div className="mt-1 flex items-center gap-2">
                            <p className="text-[11px] text-white/40">
                                Real-time forensic telemetry
                            </p>

                            <span
                                className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-tighter ${connectionBadgeClasses}`}
                            >
                                {
                                    connectionMode
                                }
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={
                            onMarkAllRead
                        }
                        disabled={
                            unreadCount ===
                                0 ||
                            isMarkingAllRead
                        }
                        className="rounded-lg border border-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:border-indigo-500/50 hover:text-indigo-400 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                    >
                        {isMarkingAllRead
                            ? 'Processing...'
                            : 'Clear Unread'}
                    </button>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        {FILTERS.map(
                            (filter) => (
                                <FilterPill
                                    key={
                                        filter.id
                                    }
                                    label={
                                        filter.label
                                    }
                                    count={
                                        filterCountMap[
                                            filter.id
                                        ] ??
                                        0
                                    }
                                    active={
                                        activeFilter ===
                                        filter.id
                                    }
                                    onClick={() =>
                                        onFilterChange?.(
                                            filter.id
                                        )
                                    }
                                />
                            )
                        )}
                    </div>

                    <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-black text-indigo-400">
                        {unreadCount}{' '}
                        NEW
                    </span>
                </div>
            </div>

            <div className="max-h-[28rem] overflow-y-auto bg-[#0F1117]/30 px-4 py-4 dashboard-scrollbar-hidden">
                {isLoading && (
                    <LoadingState />
                )}

                {!isLoading &&
                    !hasNotifications && (
                        <EmptyState
                            activeFilter={
                                activeFilter
                            }
                        />
                    )}

                {!isLoading &&
                    hasNotifications && (
                        <div className="space-y-3 transition-opacity duration-150">
                            {notifications.map(
                                (
                                    notification
                                ) => (
                                    <NotificationItem
                                        key={
                                            notification.id
                                        }
                                        notification={
                                            notification
                                        }
                                        onOpen={
                                            onOpen
                                        }
                                        onMarkRead={
                                            onMarkRead
                                        }
                                        onDelete={
                                            onDelete
                                        }
                                        isMarkingRead={
                                            pendingReadId ===
                                            notification.id
                                        }
                                        isDeleting={
                                            pendingDeleteId ===
                                            notification.id
                                        }
                                    />
                                )
                            )}
                        </div>
                    )}
            </div>

            <div className="border-t border-white/5 bg-[#161B26] px-4 py-3">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={
                            onOpenPreferences
                        }
                        className="flex-1 rounded-xl border border-white/10 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white/40 hover:border-white/20 hover:text-white transition-colors"
                    >
                        Preferences
                    </button>

                    <button
                        type="button"
                        onClick={
                            onOpenSecurity
                        }
                        className="flex-1 rounded-xl bg-indigo-600 px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        Threat Center
                    </button>
                </div>
            </div>
        </div>
    );
}

NotificationCenter.propTypes = {
    notifications:
        PropTypes.arrayOf(
            PropTypes.shape({
                id: PropTypes.oneOfType(
                    [
                        PropTypes.string,
                        PropTypes.number,
                    ]
                ).isRequired,
                read: PropTypes.bool,
                metadata:
                    PropTypes.object,
            })
        ).isRequired,

    allNotifications:
        PropTypes.arrayOf(
            PropTypes.shape({
                id: PropTypes.oneOfType(
                    [
                        PropTypes.string,
                        PropTypes.number,
                    ]
                ),
                read: PropTypes.bool,
                metadata:
                    PropTypes.object,
            })
        ),

    unreadCount:
        PropTypes.number
            .isRequired,

    activeFilter:
        PropTypes.string
            .isRequired,

    connectionMode:
        PropTypes.string
            .isRequired,

    isLoading:
        PropTypes.bool
            .isRequired,

    isMarkingAllRead:
        PropTypes.bool
            .isRequired,

    pendingReadId:
        PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number,
        ]),

    pendingDeleteId:
        PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number,
        ]),

    onFilterChange:
        PropTypes.func,

    onMarkAllRead:
        PropTypes.func,

    onMarkRead:
        PropTypes.func,

    onDelete:
        PropTypes.func,

    onOpen:
        PropTypes.func,

    onOpenPreferences:
        PropTypes.func,

    onOpenSecurity:
        PropTypes.func,
};