import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '../../context/AuthContext';
import { notificationsAPI } from '../../services/api';

const INBOX_QUERY_KEY = ['notifications', 'inbox'];
const COUNT_QUERY_KEY = ['notifications-count'];
const RELEVANT_AUDIT_ACTIONS = new Set([
    'LOGIN',
    'PASSWORD_CHANGED',
    'MFA_DISABLED',
    'ACCOUNT_LOCKED',
    'USER_STATUS_CHANGED',
    'USER_CREATED',
    'ROLE_ASSIGNED',
    'POLICY_CREATED',
    'POLICY_UPDATED',
    'POLICY_DELETED',
    'POLICY_ATTACHED',
    'POLICY_DETACHED',
    'SESSION_REVOKED',
    'ALL_OTHER_SESSIONS_REVOKED',
    'ALL_SESSIONS_REVOKED',
    'DATA_EXPORTED',
    'API_KEY_CREATED',
    'API_KEY_REVOKED',
    'CONNECTED_APP_REVOKED',
    'TRUSTED_DEVICE_REVOKED',
    'ALL_TRUSTED_DEVICES_REVOKED',
]);

function patchInbox(data, updater) {
    if (!data) {
        return data;
    }

    return updater(data);
}

function markReadInInbox(data, notificationId, read = true) {
    return patchInbox(data, (current) => {
        let unreadCount = current.unreadCount || 0;

        const items = (current.items || []).map((item) => {
            if (item.id !== notificationId) {
                return item;
            }

            if (item.read === read) {
                return item;
            }

            if (!item.read && read) {
                unreadCount = Math.max(0, unreadCount - 1);
            }

            if (item.read && !read) {
                unreadCount += 1;
            }

            return {
                ...item,
                read,
                readAt: read ? new Date().toISOString() : null,
            };
        });

        return {
            ...current,
            items,
            unreadCount,
        };
    });
}

function removeFromInbox(data, notificationId) {
    return patchInbox(data, (current) => {
        let removedUnread = false;
        const items = (current.items || []).filter((item) => {
            if (item.id !== notificationId) {
                return true;
            }

            removedUnread = !item.read;
            return false;
        });

        return {
            ...current,
            items,
            unreadCount: removedUnread ? Math.max(0, (current.unreadCount || 0) - 1) : current.unreadCount || 0,
        };
    });
}

function markAllReadInInbox(data) {
    return patchInbox(data, (current) => ({
        ...current,
        unreadCount: 0,
        items: (current.items || []).map((item) => ({
            ...item,
            read: true,
            readAt: item.readAt || new Date().toISOString(),
        })),
    }));
}

export default function NotificationBell() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const panelRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('all');
    const [sseDisabled, setSseDisabled] = useState(false);
    const { accessToken } = useAuth();

    const inboxQuery = useQuery({
        queryKey: INBOX_QUERY_KEY,
        queryFn: () => notificationsAPI.getAll({ page: 1, limit: 25 }).then((res) => res.data?.data || { items: [], unreadCount: 0, pagination: {} }),
        staleTime: 15 * 1000,
        refetchInterval: isOpen ? 15 * 1000 : 30 * 1000,
    });

    const countQuery = useQuery({
        queryKey: COUNT_QUERY_KEY,
        queryFn: () => notificationsAPI.getAll({ unreadOnly: true, limit: 1 }).then((res) => res.data?.data?.unreadCount || 0),
        staleTime: 15 * 1000,
        refetchInterval: 30 * 1000,
    });

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const handleClickAway = (event) => {
            if (!panelRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickAway);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickAway);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!accessToken || sseDisabled || typeof globalThis === 'undefined' || typeof EventSource === 'undefined') {
            return undefined;
        }

        const eventSource = new EventSource(`/api/audit-logs/stream?token=${encodeURIComponent(accessToken)}`);

        eventSource.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload?.action && RELEVANT_AUDIT_ACTIONS.has(payload.action)) {
                    queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY });
                }
            } catch {
                // Ignore malformed SSE payloads and keep the notification bell responsive.
            }
        };

        eventSource.onerror = () => {
            setSseDisabled(true);
            eventSource.close();
        };

        return () => {
            eventSource.close();
        };
    }, [accessToken, queryClient, sseDisabled]);

    const markReadMutation = useMutation({
        mutationFn: (notificationId) => notificationsAPI.markRead(notificationId),
        onMutate: async (notificationId) => {
            await queryClient.cancelQueries({ queryKey: INBOX_QUERY_KEY });
            const previous = queryClient.getQueryData(INBOX_QUERY_KEY);
            queryClient.setQueryData(INBOX_QUERY_KEY, (current) => markReadInInbox(current, notificationId));
            return { previous };
        },
        onError: (_error, _notificationId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(INBOX_QUERY_KEY, context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: COUNT_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (notificationId) => notificationsAPI.delete(notificationId),
        onMutate: async (notificationId) => {
            await queryClient.cancelQueries({ queryKey: INBOX_QUERY_KEY });
            const previous = queryClient.getQueryData(INBOX_QUERY_KEY);
            queryClient.setQueryData(INBOX_QUERY_KEY, (current) => removeFromInbox(current, notificationId));
            return { previous };
        },
        onError: (_error, _notificationId, context) => {
            if (context?.previous) {
                queryClient.setQueryData(INBOX_QUERY_KEY, context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: COUNT_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => notificationsAPI.markAllRead(),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: INBOX_QUERY_KEY });
            const previous = queryClient.getQueryData(INBOX_QUERY_KEY);
            queryClient.setQueryData(INBOX_QUERY_KEY, (current) => markAllReadInInbox(current));
            return { previous };
        },
        onError: (_error, _variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData(INBOX_QUERY_KEY, context.previous);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: COUNT_QUERY_KEY });
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    const notifications = useMemo(() => {
        const items = inboxQuery.data?.items || [];

        if (activeFilter === 'unread') {
            return items.filter((item) => !item.read);
        }

        if (activeFilter === 'critical') {
            return items.filter((item) => item.metadata?.severity === 'critical');
        }

        return items;
    }, [activeFilter, inboxQuery.data]);

    const unreadCount = countQuery.data ?? inboxQuery.data?.unreadCount ?? 0;

    const handleOpenNotification = async (notification) => {
        if (!notification) {
            setIsOpen(false);
            return;
        }

        if (!notification.read) {
            try {
                await markReadMutation.mutateAsync(notification.id);
            } catch {
                // Ignore read-state errors and still navigate when possible.
            }
        }

        setIsOpen(false);

        if (notification.link) {
            navigate(notification.link);
        }
    };

    const handleOpenPreferences = () => {
        setIsOpen(false);
        navigate('/settings/notifications');
    };

    const handleOpenSecurity = () => {
        setIsOpen(false);
        navigate('/dashboard/security');
    };

    return (
        <div ref={panelRef} className="relative">
            <button
                type="button"
                aria-label="Notifications"
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                onClick={() => setIsOpen((current) => !current)}
                className="relative rounded-lg p-2 text-[#93a4c3] hover:bg-[#1f2937] hover:text-[#f8fafc] transition-colors"
            >
                <Bell size={18} />

                {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#ef4444] px-1.5 text-[10px] font-semibold text-white shadow-sm">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                ) : null}
            </button>

            {isOpen ? (
                <NotificationCenter
                    notifications={notifications}
                    allNotifications={inboxQuery.data?.items || []}
                    unreadCount={unreadCount}
                    activeFilter={activeFilter}
                    connectionMode={sseDisabled ? 'Polling' : 'Live'}
                    isLoading={inboxQuery.isLoading}
                    isMarkingAllRead={markAllReadMutation.isPending}
                    pendingReadId={markReadMutation.variables}
                    pendingDeleteId={deleteMutation.variables}
                    onFilterChange={setActiveFilter}
                    onMarkAllRead={() => markAllReadMutation.mutate()}
                    onMarkRead={(notification) => markReadMutation.mutate(notification.id)}
                    onDelete={(notification) => deleteMutation.mutate(notification.id)}
                    onOpen={handleOpenNotification}
                    onOpenPreferences={handleOpenPreferences}
                    onOpenSecurity={handleOpenSecurity}
                />
            ) : null}
        </div>
    );
}