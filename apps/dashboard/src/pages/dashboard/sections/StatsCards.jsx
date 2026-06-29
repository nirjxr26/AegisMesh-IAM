import PropTypes from 'prop-types';
import { formatRelativeTime } from '../../../utils/formatters';

export default function StatsCards({ systemHealth, metricCards, activeSessions, totalAlerts, latestPolicyTimestamp, lastIncident }) {
    return (
        <>
            <div className="w-full bg-white border border-[#d0d7e8] rounded-2xl px-6 py-4 shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${systemHealth.dotClass}`}></span>
                    <span className={`text-sm font-semibold ${systemHealth.textClass}`}>{systemHealth.label}</span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-[#3a4560] xl:justify-end">
                    <div className="min-w-[160px] flex-1 rounded-xl border border-[#edf0f7] bg-[#f8f9fd] px-3 py-2 sm:flex-none">
                        Last policy eval: {latestPolicyTimestamp ? formatRelativeTime(latestPolicyTimestamp) : 'N/A'}
                    </div>
                    <div className="min-w-[160px] flex-1 rounded-xl border border-[#edf0f7] bg-[#f8f9fd] px-3 py-2 sm:flex-none">
                        Active sessions: {activeSessions}
                    </div>
                    <div className="min-w-[160px] flex-1 rounded-xl border border-[#edf0f7] bg-[#f8f9fd] px-3 py-2 sm:flex-none">
                        Uptime: {totalAlerts > 0 ? 'Degraded' : 'Stable'}
                    </div>
                    <div className="min-w-[160px] flex-1 rounded-xl border border-[#edf0f7] bg-[#f8f9fd] px-3 py-2 sm:flex-none">
                        {totalAlerts > 0
                            ? `Last incident: ${formatRelativeTime(lastIncident)}`
                            : 'No incidents in last 24h'}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {metricCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.title} className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-xs font-semibold tracking-wide uppercase text-[#7a87a8]">{card.title}</p>
                                <div className={`rounded-xl p-2 ${card.iconClass}`}><Icon size={16} /></div>
                            </div>
                            <p className="text-3xl font-semibold text-[#0f1623] leading-none">{card.value}</p>
                            <p className="text-xs text-[#7a87a8] mt-2">+{card.delta} this week</p>
                        </div>
                    );
                })}
            </div>
        </>
    );
}

StatsCards.propTypes = {
    systemHealth: PropTypes.shape({
        label: PropTypes.string.isRequired,
        dotClass: PropTypes.string.isRequired,
        textClass: PropTypes.string.isRequired,
    }).isRequired,
    metricCards: PropTypes.arrayOf(PropTypes.shape({
        title: PropTypes.string.isRequired,
        value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        delta: PropTypes.number.isRequired,
        icon: PropTypes.elementType.isRequired,
        iconClass: PropTypes.string.isRequired,
    })).isRequired,
    activeSessions: PropTypes.number.isRequired,
    totalAlerts: PropTypes.number.isRequired,
    latestPolicyTimestamp: PropTypes.number.isRequired,
    lastIncident: PropTypes.string,
};
