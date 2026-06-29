export function formatDate(value) {
    if (!value) return 'N/A';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'N/A';

    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

export function formatRelativeTime(value) {
    if (!value) return 'N/A';

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) return 'N/A';

    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;

    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mo ago`;

    const years = Math.floor(months / 12);
    return `${years} yr ago`;
}

export function getInitials(firstName = '', lastName = '') {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
}

export function toTitleCase(str = '') {
    return str
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

export function daysSince(value) {
    if (!value) return 'Never';
    const diff = Date.now() - new Date(value).getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days <= 0) return 'Today';
    return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function formatRelative(value) {
    if (!value) return 'Unknown';
    const now = Date.now();
    const ts = new Date(value).getTime();
    const diffMs = Math.max(0, now - ts);
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

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
