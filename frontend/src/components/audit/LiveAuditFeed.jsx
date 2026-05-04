import { useCallback, useEffect, useRef, useState } from 'react';
import AuditLogTable from './AuditLogTable';

const MAX_ATTEMPTS = 5;

export default function LiveAuditFeed({ onRowClick, refetchAuditLogs }) {
    const [isLive, setIsLive] = useState(false);
    const [logs, setLogs] = useState([]);
    const [connState, setConnState] = useState('connecting'); // connecting | connected | error | reconnecting
    const [attemptCount, setAttemptCount] = useState(0);
    const eventSourceRef = useRef(null);
    const reconnectRef = useRef(null);
    const attemptRef = useRef(0);
    const pollRef = useRef(null);
    const connectRef = useRef(null);

    const clearReconnect = useCallback(() => {
        if (reconnectRef.current) {
            clearTimeout(reconnectRef.current);
            reconnectRef.current = null;
        }
    }, []);

    const clearPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }, []);

    const stopConnection = useCallback(() => {
        clearReconnect();
        clearPolling();
        eventSourceRef.current?.close();
        eventSourceRef.current = null;
    }, [clearPolling, clearReconnect]);

    const connect = useCallback(() => {
        stopConnection();
        setConnState('connecting');

        const token = localStorage.getItem('accessToken');
        const streamUrl = token
            ? `/api/audit-logs/stream?token=${encodeURIComponent(token)}`
            : '/api/audit-logs/stream';

        const es = new EventSource(streamUrl);
        eventSourceRef.current = es;

        es.onopen = () => {
            setConnState('connected');
            attemptRef.current = 0;
            setAttemptCount(0);
            clearPolling();
        };

        es.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'ping' || data.type === 'connected') return;
                setLogs((prev) => [data, ...prev].slice(0, 50));
            } catch (parseError) {
                console.debug('Failed to parse live audit event payload', parseError);
            }
        };

        es.onerror = () => {
            es.close();
            setConnState('error');

            if (attemptRef.current < MAX_ATTEMPTS) {
                const delay = Math.min(1000 * (2 ** attemptRef.current), 30000);
                setConnState('reconnecting');
                reconnectRef.current = setTimeout(() => {
                    const nextAttempt = attemptRef.current + 1;
                    attemptRef.current = nextAttempt;
                    setAttemptCount(nextAttempt);
                    connectRef.current?.();
                }, delay);
                return;
            }

            clearPolling();
            pollRef.current = setInterval(() => {
                refetchAuditLogs?.();
            }, 30000);
        };
    }, [clearPolling, refetchAuditLogs, stopConnection]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    useEffect(() => {
        if (!isLive) {
            stopConnection();
            return;
        }

        const timer = window.setTimeout(() => {
            connect();
        }, 0);

        return () => {
            window.clearTimeout(timer);
            stopConnection();
        };
    }, [connect, isLive, stopConnection]);

    const statusConfig = {
        connecting: { dotColor: '#fbbf24', text: 'Connecting...', textColor: '#92400e', pulse: true },
        connected: { dotColor: '#34d399', text: 'Live', textColor: '#065f46', pulse: true },
        reconnecting: { dotColor: '#fbbf24', text: 'Reconnecting...', textColor: '#92400e', pulse: true },
        error: { dotColor: '#f87171', text: 'Disconnected', textColor: '#7f1d1d', pulse: false },
    };

    const status = statusConfig[connState] || statusConfig.error;
    const inPollingMode = connState === 'error' && attemptCount >= MAX_ATTEMPTS;

    return (
        <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '12px',
            overflow: 'hidden',
        }}>
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: isLive ? '#10B981' : '#64748B',
                        animation: isLive && status.pulse ? 'pulse 2s infinite' : 'none',
                        boxShadow: isLive && connState === 'connected' ? '0 0 8px #10B981' : 'none',
                    }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9' }}>
                        Live Feed {isLive ? 'ON' : 'OFF'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>({logs.length} events)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isLive ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                                style={{ width: 8, height: 8, borderRadius: '50%', background: status.dotColor }}
                            />
                            <span style={{ fontSize: '11px', color: status.textColor }}>{status.text}</span>
                            {inPollingMode ? (
                                <span style={{ fontSize: '11px', color: '#6366f1' }}>Polling mode</span>
                            ) : null}
                            {connState === 'error' ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        attemptRef.current = 0;
                                        setAttemptCount(0);
                                        connectRef.current?.();
                                    }}
                                    style={{
                                        border: 'none',
                                        background: 'transparent',
                                        color: '#6366f1',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        padding: 0,
                                    }}
                                >
                                    ↺ Retry
                                </button>
                            ) : null}
                        </div>
                    ) : null}

                    <button
                        onClick={() => {
                            if (isLive) {
                                setConnState('error');
                                setAttemptCount(0);
                            }
                            setIsLive(!isLive);
                        }}
                        style={{
                            padding: '6px 14px', fontSize: '12px', fontWeight: 600, borderRadius: '6px',
                            border: 'none', cursor: 'pointer',
                            background: isLive ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                            color: isLive ? '#EF4444' : '#10B981',
                        }}
                    >{isLive ? 'Stop' : 'Start Live Feed'}</button>
                </div>
            </div>

            {isLive && <AuditLogTable logs={logs} onRowClick={onRowClick} />}

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.4; }
                }
            `}</style>
        </div>
    );
}


