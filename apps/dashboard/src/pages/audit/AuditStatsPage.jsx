import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { auditAPI } from '../../services/api';
import { EMPTY_ARRAY, getCurrentStats, getActivityData, getTimeRangeLabel } from './auditHelpers';
import AuditStatCards from './AuditStatCards';
import AuditActivityChart from './AuditActivityChart';
import AuditCategoryPie from './AuditCategoryPie';
import AuditSidePanels from './AuditSidePanels';

export default function AuditStatsPage() {
    const [timeRange, setTimeRange] = useState('24h');

    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['audit-stats'],
        queryFn: () => auditAPI.getStats().then((response) => response.data?.data),
        refetchInterval: 60000,
    });

    const { data: alertsData, isLoading: alertsLoading } = useQuery({
        queryKey: ['audit-alerts'],
        queryFn: () => auditAPI.getSecurityAlerts().then((response) => response.data?.data),
        refetchInterval: 60000,
    });

    const isLoading = statsLoading || alertsLoading;

    const {
        last24h = {},
        last7d = {},
        last9d = {},
        last30d = {},
        topFailedIPs = EMPTY_ARRAY,
        topActions = EMPTY_ARRAY,
        categoryBreakdown = EMPTY_ARRAY,
        hourlyActivity = EMPTY_ARRAY,
        dailyActivity = EMPTY_ARRAY,
        totalUsers = 0,
    } = statsData || {};

    const alerts = alertsData?.alerts || EMPTY_ARRAY;

    const currentStats = getCurrentStats(
        timeRange,
        last24h,
        last7d,
        last9d,
        last30d,
    );

    const rangeLabel = getTimeRangeLabel(timeRange);

    const activityData = getActivityData(timeRange, hourlyActivity, dailyActivity);

    const donutData = categoryBreakdown.map((item, index) => ({
        id: `${item.category}-${index}`,
        name: item.category,
        value: item.count,
        fill: ['#4f46e5', '#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#65a30d', '#ea580c'][index % 10],
    }));

    if (isLoading) {
        return (
            <div className="min-h-[calc(100vh-64px)] bg-[#f4f6fb] px-6 py-10 text-center text-[#7a87a8]">
                Loading analytics...
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-64px)]">
            <div className="w-full">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-[20px] font-semibold text-[#0f1623]">
                            Audit Analytics
                        </h1>

                        <p className="mt-1 text-[13px] text-[#7a87a8]">
                            System activity and security metrics.
                        </p>
                    </div>

                    <div className="flex gap-1 rounded-xl border border-[#d0d7e8] bg-white p-1 shadow-sm">
                        {['24h', '7d', '9d', '30d'].map((range) => {
                            const active = timeRange === range;

                            return (
                                <button
                                    key={range}
                                    type="button"
                                    onClick={() => setTimeRange(range)}
                                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                                        active
                                            ? 'bg-[#4f46e5] text-white shadow-sm'
                                            : 'text-[#7a87a8] hover:bg-[#f4f6fb] hover:text-[#0f1623]'
                                    }`}
                                >
                                    {getTimeRangeLabel(range)}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <AuditStatCards totalUsers={totalUsers} currentStats={currentStats} />

                <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <AuditActivityChart activityData={activityData} rangeLabel={rangeLabel} />
                    <AuditCategoryPie donutData={donutData} />
                </div>

                <AuditSidePanels
                    topActions={topActions}
                    topFailedIPs={topFailedIPs}
                    alerts={alerts}
                    rangeLabel={rangeLabel}
                />
            </div>
        </div>
    );
}
