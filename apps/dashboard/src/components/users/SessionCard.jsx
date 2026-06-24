import React from 'react';
import PropTypes from 'prop-types';
import { Loader2, Monitor, Smartphone, Tablet } from 'lucide-react';

function parseDevice(userAgent) {
    if (!userAgent) return { name: 'Unknown Device', type: 'desktop' };

    if (/tablet|ipad/i.test(userAgent)) {
        return { name: 'Tablet', type: 'tablet' };
    }

    if (/mobile/i.test(userAgent)) {
        return { name: 'Mobile Browser', type: 'mobile' };
    }

    if (/chrome/i.test(userAgent)) {
        return { name: 'Chrome Browser', type: 'desktop' };
    }

    if (/firefox/i.test(userAgent)) {
        return { name: 'Firefox Browser', type: 'desktop' };
    }

    if (/safari/i.test(userAgent)) {
        return { name: 'Safari Browser', type: 'desktop' };
    }

    return { name: 'Desktop Browser', type: 'desktop' };
}

function formatRelativeTime(dateValue) {
    if (!dateValue) return 'just now';

    const value = new Date(dateValue).getTime();
    const now = Date.now();
    const diffSeconds = Math.round((value - now) / 1000);
    const ranges = [
        ['year', 31536000],
        ['month', 2592000],
        ['day', 86400],
        ['hour', 3600],
        ['minute', 60],
    ];

    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    for (const [unit, secondsInUnit] of ranges) {
        if (Math.abs(diffSeconds) >= secondsInUnit) {
            return rtf.format(Math.round(diffSeconds / secondsInUnit), unit);
        }
    }

    return rtf.format(diffSeconds, 'second');
}

export default function SessionCard({ session, isCurrent, onRevoke, isRevoking }) {
    if (!session) return null;

    const parsed = parseDevice(session.deviceInfo || '');
    const currentSession = Boolean(session.isCurrent || isCurrent);
    const ipAddress = session.ipAddress || 'Unknown IP';
    const startedAt = session.createdAt;
    const lastActiveAt = session.lastUsedAt || session.lastActiveAt || session.createdAt;

    let DeviceIcon = Monitor;
    if (parsed.type === 'mobile') {
        DeviceIcon = Smartphone;
    } else if (parsed.type === 'tablet') {
        DeviceIcon = Tablet;
    }

    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-500">
                <DeviceIcon className="w-[18px] h-[18px]" />
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center flex-wrap gap-2">
                    <h4 className="text-[13px] font-semibold text-slate-900">
                        {parsed.name}
                    </h4>
                    {currentSession ? (
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-[10px] font-semibold">
                            Current Session
                        </span>
                    ) : null}
                </div>

                <p className="mt-1 text-[12px] text-slate-500 font-mono">{ipAddress}</p>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                    <span>Started {formatRelativeTime(startedAt)}</span>
                    <span>Last active {formatRelativeTime(lastActiveAt)}</span>
                </div>
            </div>

            {currentSession ? (
                <span className="text-[11px] text-emerald-500 inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />{" "}
                    Active now
                </span>
            ) : (
                <button
                    onClick={() => onRevoke(session.id)}
                    disabled={isRevoking}
                    className="border border-red-200 text-red-600 bg-white hover:bg-red-50 rounded-lg px-3 py-1.5 text-[12px] font-medium disabled:opacity-50 inline-flex items-center gap-2"
                >
                    {isRevoking ? <Loader2 size={12} className="animate-spin" /> : null}
                    Revoke
                </button>
            )}
        </div>
    );
}

SessionCard.propTypes = {
    session: PropTypes.shape({
        id: PropTypes.string.isRequired,
        deviceInfo: PropTypes.string,
        ipAddress: PropTypes.string,
        createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        lastUsedAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        lastActiveAt: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
        isCurrent: PropTypes.bool,
    }).isRequired,
    isCurrent: PropTypes.bool,
    onRevoke: PropTypes.func.isRequired,
    isRevoking: PropTypes.bool,
};


