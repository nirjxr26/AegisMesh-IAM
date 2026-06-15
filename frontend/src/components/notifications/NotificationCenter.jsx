import PropTypes from 'prop-types';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
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
            {[1, 2, 3].map((id) => (
                <div
                    key={`loading-${id}`}
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
            ))}
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
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onOpen?.(null);
            }
        };
        globalThis.addEventListener('keydown', handleKeyDown);
        return () => globalThis.removeEventListener('keydown', handleKeyDown);
    }, [onOpen]);

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
        <>
            {/* Backdrop */}
            <button 
                type="button"
                className="fixed inset-0 z-[60] bg-[#0f1623]/40 backdrop-blur-sm animate-in fade-in duration-200 cursor-default"
                onClick={() => onOpen?.(null)}
                aria-label="Close notification center"
            />
            
            {/* Centered Modal */}
            <div 
                className="fixed left-1/2 top-1/2 z-[70] w-[min(46rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2.5rem] border border-[#dbe4f0] bg-white shadow-[0_40px_100px_rgba(15,23,42,0.25)] animate-in fade-in zoom-in duration-200"
                role="dialog"
                aria-live="polite"
                aria-modal="true"
                aria-labelledby="notification-center-title"
            >
                <div className="border-b border-[#eef2f7] bg-[linear-gradient(135deg,#f8faff_0%,#ffffff_65%)] px-8 py-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 id="notification-center-title" className="text-[20px] font-bold text-[#0f172a] tracking-tight">
                                Notification Center
                            </h2>

                            <div className="mt-1 flex items-center gap-2">
                                <p className="text-sm text-[#64748b]">
                                    Real-time account, access, and security updates.
                                </p>

                                <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${connectionBadgeClasses}`}
                                >
                                    {connectionMode}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                type="button"
                                onClick={onMarkAllRead}
                                disabled={unreadCount === 0 || isMarkingAllRead}
                                className="rounded-xl border border-[#d0d7e8] px-4 py-2 text-xs font-bold text-[#334155] hover:border-[#4f46e5] hover:text-[#4f46e5] transition-all disabled:opacity-50"
                            >
                                {isMarkingAllRead ? 'Saving...' : 'Mark all read'}
                            </button>
                            <button
                                type="button"
                                onClick={() => onOpen?.(null)}
                                className="rounded-xl p-2 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-all"
                                aria-label="Close"
                            >
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                            {FILTERS.map((filter) => (
                                <FilterPill
                                    key={filter.id}
                                    label={filter.label}
                                    count={filterCountMap[filter.id] ?? 0}
                                    active={activeFilter === filter.id}
                                    onClick={() => onFilterChange?.(filter.id)}
                                />
                            ))}
                        </div>

                        <span className="rounded-full bg-[#eef2ff] px-3 py-1.5 text-xs font-bold text-[#4f46e5]">
                            {unreadCount} UNREAD
                        </span>
                    </div>
                </div>

                <div className="max-h-[34rem] overflow-y-auto bg-[#f8fafc] px-8 py-8">
                    {isLoading && <LoadingState />}

                    {!isLoading && !hasNotifications && (
                        <EmptyState activeFilter={activeFilter} />
                    )}

                    {!isLoading && hasNotifications && (
                        <div className="space-y-4">
                            {notifications.map((notification) => (
                                <NotificationItem
                                    key={notification.id}
                                    notification={notification}
                                    onOpen={onOpen}
                                    onMarkRead={onMarkRead}
                                    onDelete={onDelete}
                                    isMarkingRead={pendingReadId === notification.id}
                                    isDeleting={pendingDeleteId === notification.id}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <div className="border-t border-[#eef2f7] bg-white px-8 py-5">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={onOpenPreferences}
                            className="flex-1 rounded-2xl border border-[#d0d7e8] px-4 py-3 text-sm font-bold text-[#334155] hover:border-[#4f46e5] hover:text-[#4f46e5] transition-all"
                        >
                            Notification Preferences
                        </button>

                        <button
                            type="button"
                            onClick={onOpenSecurity}
                            className="flex-1 rounded-2xl bg-[#4f46e5] px-4 py-3 text-sm font-bold text-white hover:bg-[#3730a3] transition-all shadow-md shadow-indigo-200"
                        >
                            Review Security
                        </button>
                    </div>
                </div>
            </div>
        </>
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
