import {
    formatDate,
    formatRelativeTime,
    getInitials,
    toTitleCase,
    daysSince,
    formatRelative,
} from '@aegismesh/shared/formatters';

export { formatDate, formatRelativeTime, getInitials, toTitleCase, daysSince, formatRelative }; // NOSONAR

export function getAvatarColor(firstName = '', lastName = '') {
    const colors = [
        '#4f46e5',
        '#0284c7',
        '#16a34a',
        '#e11d48',
        '#ca8a04',
        '#9333ea',
        '#2563eb',
        '#0891b2',
    ];

    const name = `${firstName}${lastName}`;
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (name.codePointAt(i) || 0) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
}

export function getStatusMeta(status) {
    if (status === 'ACTIVE') {
        return {
            label: 'Active',
            className: 'bg-emerald-100 text-emerald-700',
        };
    }

    if (status === 'LOCKED') {
        return {
            label: 'Locked',
            className: 'bg-red-100 text-red-700',
        };
    }

    if (status === 'INACTIVE') {
        return {
            label: 'Inactive',
            className: 'bg-slate-100 text-slate-600',
        };
    }

    return {
        label: status || 'Pending',
        className: 'bg-amber-100 text-amber-700',
    };
}
