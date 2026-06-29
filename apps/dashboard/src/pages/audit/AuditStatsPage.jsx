import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Activity,
    AlertTriangle,
    BarChart2,
    LogIn,
    PieChart as PieChartIcon,
    Shield,
    ShieldCheck,
    ShieldOff,
    UserPlus,
    Users,
    Zap,
} from 'lucide-react';

import {
    Area,
    AreaChart,
    CartesianGrid,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

import { auditAPI } from '../../services/api';
import { DONUT_COLORS, EMPTY_ARRAY, formatNumber, formatIp, getTimeRangeLabel, getCurrentStats, getActivityData, getSeverityClass } from '../../components/audit/auditHelpers';
import { toTitleCase } from '../../utils/formatters';
import StatCard from '../../components/audit/StatCard';

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
        name: toTitleCase(item.category),
        value: item.count,
        fill: DONUT_COLORS[index % DONUT_COLORS.length],
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

                <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
                    <StatCard
                        icon={<Users size={18} className="text-[#4f46e5]" />}
                        iconBg="bg-[#4f46e5]/10"
                        label="Total Users"
                        value={totalUsers}
                    />

                    <StatCard
                        icon={<Activity size={18} className="text-[#2563eb]" />}
                        iconBg="bg-[#2563eb]/10"
                        label="Total Events"
                        value={currentStats.totalEvents || 0}
                    />

                    <StatCard
                        icon={<LogIn size={18} className="text-[#dc2626]" />}
                        iconBg="bg-[#dc2626]/10"
                        label="Failed Logins"
                        value={currentStats.failedLogins || 0}
                        valueClass={
                            (currentStats.failedLogins || 0) === 0
                                ? 'text-[#16a34a]'
                                : 'text-[#0f1623]'
                        }
                    />

                    <StatCard
                        icon={<UserPlus size={18} className="text-[#16a34a]" />}
                        iconBg="bg-[#16a34a]/10"
                        label="New Users"
                        value={currentStats.newUsers || 0}
                    />

                    <StatCard
                        icon={<ShieldOff size={18} className="text-[#d97706]" />}
                        iconBg="bg-[#d97706]/10"
                        label="Permission Denied"
                        value={currentStats.permissionDenied || 0}
                        valueClass={
                            (currentStats.permissionDenied || 0) === 0
                                ? 'text-[#16a34a]'
                                : 'text-[#0f1623]'
                        }
                    />
                </div>

                <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
                    <div className="rounded-2xl border border-[#d0d7e8] bg-white p-6 shadow-sm lg:col-span-2">
                        <div className="mb-5 flex items-center gap-2">
                            <div className="rounded-lg bg-[#4f46e5]/10 p-2 text-[#4f46e5]">
                                <BarChart2 size={16} />
                            </div>

                            <h3 className="text-[15px] font-semibold text-[#0f1623]">
                                Activity Volume
                            </h3>

                            <span className="ml-auto text-xs text-[#7a87a8]">
                                {rangeLabel}
                            </span>
                        </div>

                        <div className="h-[280px] w-full">
                            <ResponsiveContainer>
                                <AreaChart
                                    data={activityData}
                                    margin={{
                                        top: 10,
                                        right: 10,
                                        left: -12,
                                        bottom: 0,
                                    }}
                                >
                                    <defs>
                                        <linearGradient
                                            id="activityFill"
                                            x1="0"
                                            y1="0"
                                            x2="0"
                                            y2="1"
                                        >
                                            <stop
                                                offset="5%"
                                                stopColor="rgba(79,70,229,0.15)"
                                                stopOpacity={1}
                                            />

                                            <stop
                                                offset="95%"
                                                stopColor="rgba(79,70,229,0)"
                                                stopOpacity={1}
                                            />
                                        </linearGradient>
                                    </defs>

                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#f0f2f8"
                                    />

                                    <XAxis
                                        dataKey="label"
                                        tick={{
                                            fill: '#7a87a8',
                                            fontSize: 11,
                                        }}
                                        axisLine={{ stroke: '#f0f2f8' }}
                                        tickLine={false}
                                    />

                                    <YAxis
                                        tick={{
                                            fill: '#7a87a8',
                                            fontSize: 11,
                                        }}
                                        axisLine={false}
                                        tickLine={false}
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            background: '#fff',
                                            border: '1px solid #d0d7e8',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                        }}
                                    />

                                    <Area
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#4f46e5"
                                        strokeWidth={2}
                                        fill="url(#activityFill)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-[#d0d7e8] bg-white p-6 shadow-sm">
                        <div className="mb-5 flex items-center gap-2">
                            <div className="rounded-lg bg-[#4f46e5]/10 p-2 text-[#4f46e5]">
                                <PieChartIcon size={16} />
                            </div>

                            <h3 className="text-[15px] font-semibold text-[#0f1623]">
                                Category Breakdown
                            </h3>
                        </div>

                        <div className="h-[240px] w-full">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={donutData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={60}
                                        outerRadius={90}
                                    />

                                    <Tooltip
                                        contentStyle={{
                                            background: '#fff',
                                            border: '1px solid #d0d7e8',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                            {donutData.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center gap-1.5 text-xs text-[#3a4560]"
                                >
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{ backgroundColor: item.fill }}
                                    />

                                    <span>{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
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
                </div>
            </div>
        </div>
    );
}
