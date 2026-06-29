import PropTypes from 'prop-types';
import { AlertTriangle, Shield, ShieldCheck, Zap } from 'lucide-react';
import { toTitleCase, formatNumber, formatIp, getSeverityClass } from './auditHelpers';

function TopActionsPanel({ topActions, rangeLabel }) {
    return (
        <div className="h-full overflow-hidden rounded-2xl border border-[#d0d7e8] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#f0f2f8] px-6 py-4">
                <div className="rounded-lg bg-[#4f46e5]/10 p-2 text-[#4f46e5]">
                    <Zap size={16} />
                </div>

                <h3 className="text-[15px] font-semibold text-[#0f1623]">
                    Top Actions
                </h3>

                <span className="ml-auto text-xs text-[#7a87a8]">
                    {rangeLabel}
                </span>
            </div>

            <div>
                {topActions.slice(0, 8).map((action) => (
                    <div
                        key={action.action}
                        className="border-b border-[#f0f2f8] px-6 py-3 hover:bg-[#f8f9fd] last:border-0"
                    >
                        <div className="flex items-center">
                            <p className="truncate text-sm font-medium text-[#0f1623]">
                                {toTitleCase(action.action)}
                            </p>

                            <span className="ml-auto mr-4 text-sm font-bold text-[#0f1623]">
                                {formatNumber(action.count)}
                            </span>

                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#f0f2f8]">
                                <div
                                    className={`h-full rounded-full ${
                                        action.successRate === 0
                                            ? 'bg-[#dc2626]'
                                            : 'bg-[#4f46e5]'
                                    }`}
                                    style={{
                                        width: `${Math.max(
                                            2,
                                            action.successRate,
                                        )}%`,
                                    }}
                                />
                            </div>

                            <span className="ml-2 w-8 text-right text-xs text-[#7a87a8]">
                                {action.successRate}%
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TopFailedIPsPanel({ topFailedIPs }) {
    return (
        <div className="h-full overflow-hidden rounded-2xl border border-[#d0d7e8] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#f0f2f8] px-6 py-4">
                <div className="rounded-lg bg-[#dc2626]/10 p-2 text-[#dc2626]">
                    <Shield size={16} />
                </div>

                <h3 className="text-[15px] font-semibold text-[#0f1623]">
                    Top Failed IPs
                </h3>
            </div>

            {topFailedIPs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-[#7a87a8]">
                    <div className="rounded-2xl bg-[#16a34a]/10 p-3 text-[#16a34a]">
                        <ShieldCheck size={22} />
                    </div>

                    <span>No failed IP activity</span>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-3 border-b border-[#f0f2f8] bg-[#f4f6fb] px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#7a87a8]">
                        <span>IP Address</span>
                        <span>Failures</span>
                        <span>Last Seen</span>
                    </div>

                    <div>
                        {topFailedIPs.slice(0, 8).map((item) => {
                            const ipLabel = formatIp(item.ip);

                            return (
                                <div
                                    key={`${item.ip}-${item.lastSeen}`}
                                    className="grid grid-cols-3 items-center border-b border-[#f0f2f8] px-6 py-3.5 hover:bg-[#f8f9fd] last:border-0"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-mono text-sm text-[#0f1623]">
                                            {ipLabel}
                                        </p>

                                        {ipLabel === 'localhost' && (
                                            <p className="text-xs text-[#7a87a8]">
                                                loopback
                                            </p>
                                        )}
                                    </div>

                                    <p
                                        className={`text-sm font-bold ${
                                            item.count > 0
                                                ? 'text-[#dc2626]'
                                                : 'text-[#16a34a]'
                                        }`}
                                    >
                                        {item.count}
                                    </p>

                                    <p className="text-sm text-[#7a87a8]">
                                        {new Date(
                                            item.lastSeen,
                                        ).toLocaleDateString(
                                            'en-US',
                                            {
                                                month: 'short',
                                                day: 'numeric',
                                            },
                                        )}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}

function SecurityAlertsPanel({ alerts }) {
    return (
        <div className="h-full overflow-hidden rounded-2xl border border-[#d0d7e8] bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-[#f0f2f8] px-6 py-4">
                <div className="rounded-lg bg-[#dc2626]/10 p-2 text-[#dc2626]">
                    <AlertTriangle size={16} />
                </div>

                <h3 className="text-[15px] font-semibold text-[#0f1623]">
                    Security Alerts
                </h3>

                {alerts.length > 0 && (
                    <span className="ml-auto rounded-full bg-[#dc2626] px-2 py-0.5 text-xs font-bold text-white">
                        {alerts.length}
                    </span>
                )}
            </div>

            {alerts.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                    <div className="rounded-2xl bg-[#16a34a]/10 p-4 text-[#16a34a]">
                        <ShieldCheck size={28} />
                    </div>

                    <p className="text-[15px] font-semibold text-[#0f1623]">
                        All clear
                    </p>

                    <p className="text-[12px] text-[#7a87a8]">
                        No active security alerts
                    </p>
                </div>
            ) : (
                <div className="max-h-[350px] overflow-y-auto">
                    {alerts.slice(0, 8).map((alert) => (
                        <div
                            key={`${alert.type}-${alert.timestamp}`}
                            className="border-b border-[#f0f2f8] px-6 py-3.5 hover:bg-[#f8f9fd] last:border-0"
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-semibold text-[#0f1623]">
                                    {toTitleCase(alert.type || 'Alert')}
                                </p>

                                <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${getSeverityClass(
                                        alert.severity,
                                    )}`}
                                >
                                    {toTitleCase(alert.severity || 'low')}
                                </span>
                            </div>

                            <p className="mt-1 line-clamp-2 text-xs text-[#7a87a8]">
                                {alert.details}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

TopActionsPanel.propTypes = {
    topActions: PropTypes.array,
    rangeLabel: PropTypes.string,
};

TopFailedIPsPanel.propTypes = {
    topFailedIPs: PropTypes.array,
};

SecurityAlertsPanel.propTypes = {
    alerts: PropTypes.array,
};

export default function AuditSidePanels({ topActions, topFailedIPs, alerts, rangeLabel }) {
    return (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <TopActionsPanel topActions={topActions} rangeLabel={rangeLabel} />
            <TopFailedIPsPanel topFailedIPs={topFailedIPs} />
            <SecurityAlertsPanel alerts={alerts} />
        </div>
    );
}

AuditSidePanels.propTypes = {
    topActions: PropTypes.array,
    topFailedIPs: PropTypes.array,
    alerts: PropTypes.array,
    rangeLabel: PropTypes.string,
};
