export const DONUT_COLORS = [
    '#4f46e5',
    '#2563eb',
    '#16a34a',
    '#d97706',
    '#dc2626',
    '#7c3aed',
    '#0891b2',
    '#be185d',
    '#65a30d',
    '#ea580c',
];

export const EMPTY_ARRAY = [];

export function toTitleCase(value = '') {
    return value
        .toLowerCase()
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function formatNumber(value = 0) {
    return new Intl.NumberFormat('en-US').format(value);
}

export function formatIp(ip) {
    if (ip === '::1' || ip === '127.0.0.1') {
        return 'localhost';
    }

    return ip || '-';
}

export function getTimeRangeLabel(range) {
    if (range === '24h') {
        return 'Last 24 Hours';
    }

    if (range === '7d') {
        return 'Last 7 Days';
    }

    if (range === '9d') {
        return 'Last 9 Days';
    }

    return 'Last 30 Days';
}

export function getCurrentStats(range, last24h, last7d, last9d, last30d) {
    if (range === '24h') {
        return last24h;
    }

    if (range === '7d') {
        return last7d;
    }

    if (range === '9d') {
        return last9d;
    }

    return last30d;
}

export function getActivityData(timeRange, hourlyActivity, dailyActivity) {
    if (timeRange === '24h') {
        return hourlyActivity.map((row) => ({
            label: `${String(row.hour).padStart(2, '0')}:00`,
            count: row.count,
        }));
    }

    let dailyData = dailyActivity;
    if (timeRange === '7d') {
        dailyData = dailyActivity.slice(-7);
    } else if (timeRange === '9d') {
        dailyData = dailyActivity.slice(-9);
    }

    return dailyData.map((row) => ({
        label: new Date(row.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        }),
        count: row.count,
    }));
}

export function getSeverityClass(severity) {
    if (severity === 'CRITICAL' || severity === 'HIGH') {
        return 'bg-[#dc2626]/10 text-[#dc2626]';
    }

    if (severity === 'MEDIUM') {
        return 'bg-[#d97706]/10 text-[#d97706]';
    }

    return 'bg-[#4f46e5]/8 text-[#4f46e5]';
}
