import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Users, KeyRound, FileText, Layers } from 'lucide-react';
import { formatRelativeTime, toTitleCase } from '../../../utils/formatters';
import { getRecentLogDotClass } from './shared';

const ACCESS_ICONS = { users: Users, roles: KeyRound, policies: FileText, groups: Layers };

export default function RecentActivity({ recentLogs, recentLogsQuery, accessSummaryRows, onSelectSection, roleDistribution }) {
    const navigate = useNavigate();

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[16px] font-semibold text-[#0f1623]">Recent Activity</h2>
                </div>
                <div className="space-y-3">
                    {(() => {
                        if (recentLogsQuery.isLoading) return <p className="text-sm text-[#7a87a8]">Loading activity...</p>;
                        if (recentLogs.length === 0) return <p className="text-sm text-[#7a87a8]">No recent activity found.</p>;
                        return recentLogs.map((log) => {
                            const dotClass = getRecentLogDotClass(log.result);
                            return (
                                <div key={log.id} className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`}></span>
                                            <p className="text-sm font-medium text-[#0f1623] truncate">{toTitleCase(log.action)}</p>
                                        </div>
                                        <p className="text-xs text-[#7a87a8] mt-0.5 truncate">{log.user?.email || 'System'}</p>
                                    </div>
                                    <p className="text-xs text-[#7a87a8] shrink-0">{formatRelativeTime(log.createdAt)}</p>
                                </div>
                            );
                        });
                    })()}
                </div>
                <button type="button" onClick={() => navigate('/dashboard/audit-logs')} className="mt-4 text-sm text-[#4f46e5] font-medium hover:text-[#3730a3] transition-colors inline-flex items-center gap-1">
                    View All Logs <ArrowRight size={14} />
                </button>
            </div>

            <div className="bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm">
                <h2 className="text-[16px] font-semibold text-[#0f1623] mb-4">Access Control Summary</h2>
                <div className="space-y-2">
                    {accessSummaryRows.map((item) => {
                        const Icon = ACCESS_ICONS[item.section] || Users;
                        return (
                            <div key={item.label} className="flex items-center justify-between p-3 border border-[#edf0f7] rounded-xl bg-[#f8f9fd]">
                                <div className="flex items-center gap-3">
                                    <div className="bg-[#4f46e5]/10 rounded-lg p-2 text-[#4f46e5]"><Icon size={14} /></div>
                                    <p className="text-sm font-medium text-[#0f1623]">{item.label}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-semibold text-[#3a4560] bg-white border border-[#d0d7e8] px-2 py-0.5 rounded-full">{item.count}</span>
                                    <button type="button" onClick={() => onSelectSection(item.section)} className="text-xs text-[#4f46e5] hover:text-[#3730a3] font-medium inline-flex items-center gap-1">
                                        Manage <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-5">
                    <p className="text-xs font-semibold tracking-wide uppercase text-[#7a87a8] mb-2">Role Distribution</p>
                    <div className="h-2 rounded-full bg-[#e6eaf4] overflow-hidden flex">
                        <div className="bg-[#4f46e5]" style={{ width: `${roleDistribution.superAdminPct}%` }}></div>
                        <div className="bg-[#0284c7]" style={{ width: `${roleDistribution.readOnlyPct}%` }}></div>
                        <div className="bg-[#94a3b8]" style={{ width: `${roleDistribution.customPct}%` }}></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-[11px] text-[#7a87a8]">
                        <div><span className="font-semibold text-[#0f1623]">{roleDistribution.superAdmin}</span> SuperAdmin</div>
                        <div><span className="font-semibold text-[#0f1623]">{roleDistribution.readOnly}</span> ReadOnly</div>
                        <div><span className="font-semibold text-[#0f1623]">{roleDistribution.custom}</span> Custom</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

RecentActivity.propTypes = {
    recentLogs: PropTypes.array.isRequired,
    recentLogsQuery: PropTypes.shape({ isLoading: PropTypes.bool }).isRequired,
    accessSummaryRows: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        count: PropTypes.number.isRequired,
        section: PropTypes.string.isRequired,
    })).isRequired,
    onSelectSection: PropTypes.func.isRequired,
    roleDistribution: PropTypes.shape({
        superAdmin: PropTypes.number.isRequired,
        readOnly: PropTypes.number.isRequired,
        custom: PropTypes.number.isRequired,
        superAdminPct: PropTypes.number.isRequired,
        readOnlyPct: PropTypes.number.isRequired,
        customPct: PropTypes.number.isRequired,
    }).isRequired,
};
