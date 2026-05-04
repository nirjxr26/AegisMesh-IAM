import { Fragment, useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    AlertTriangle,
    BarChart2,
    Calendar,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    LogIn,
    RefreshCw,
    Search,
    ShieldOff,
} from 'lucide-react';
import { auditAPI } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

function toTitleCaseAction(action = '') {
    return action
        .toLowerCase()
        .split('_')
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
}

function formatShortTimestamp(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

function formatFullTimestamp(value) {
    if (!value) return '-';
    return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

function getCategoryBadge(category = '') {
    const label = category
        .toLowerCase()
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Admin';

    return { label, className: 'bg-[#ede9fe] text-[#7c3aed]' };
}

function getResultBadge(result = '') {
    if (result === 'SUCCESS') {
        return { label: 'Success', className: 'bg-[#dcfce7] text-[#16a34a]' };
    }
    if (result === 'BLOCKED') {
        return { label: 'Blocked', className: 'bg-[#fef9c3] text-[#ca8a04]' };
    }
    return { label: 'Failure', className: 'bg-[#fee2e2] text-[#dc2626]' };
}

function formatIp(ipAddress) {
    if (!ipAddress) return '-';
    if (ipAddress === '::1' || ipAddress === '127.0.0.1') return 'localhost';
    return ipAddress;
}

function getInitials(log) {
    const first = log.user?.firstName?.[0] || '';
    const last = log.user?.lastName?.[0] || '';
    const byName = `${first}${last}`.toUpperCase();
    if (byName) return byName;
    const fromEmail = log.user?.email?.[0] || 'U';
    return fromEmail.toUpperCase();
}

function getRequestPath(log) {
    const metadata = log.metadata || {};
    return (
        metadata.path ||
        metadata.endpoint ||
        metadata.attemptedResource ||
        metadata.resource ||
        log.resource ||
        '-'
    );
}

function getResponseCode(log) {
    const metadata = log.metadata || {};
    if (metadata.responseCode) return String(metadata.responseCode);
    if (metadata.statusCode) return String(metadata.statusCode);
    if (metadata.code) return String(metadata.code);
    if (log.result === 'SUCCESS') return '200';
    if (log.result === 'BLOCKED') return '403';
    if (log.result === 'FAILURE') return '401';
    if (log.result === 'ERROR') return '500';
    return '-';
}

function getPageChips(currentPage, totalPages) {
    if (totalPages <= 5) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 3) {
        return [1, 2, 3, '...', totalPages];
    }

    if (currentPage >= totalPages - 2) {
        return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value || 0);
}

export default function AuditLogsPage() {
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        result: '',
        startDate: '',
        endDate: '',
        ipAddress: '',
    });
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [searchInput, setSearchInput] = useState('');
    const debouncedSearch = useDebounce(searchInput, 400);

    const toIsoDayStart = (value) => {
        if (!value) return undefined;
        const date = new Date(`${value}T00:00:00.000Z`);
        return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    };

    const toIsoDayEnd = (value) => {
        if (!value) return undefined;
        const date = new Date(`${value}T23:59:59.999Z`);
        return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    };

    const queryParams = useMemo(() => {
        const next = {
            page,
            limit: perPage,
            ...filters,
            search: debouncedSearch,
            dateFrom: toIsoDayStart(filters.startDate),
            dateTo: toIsoDayEnd(filters.endDate),
        };
        Object.keys(next).forEach((key) => {
            if (!next[key]) delete next[key];
        });
        return next;
    }, [page, perPage, filters, debouncedSearch]);

    const { data, isLoading, isError } = useQuery({
        queryKey: ['audit-logs', queryParams],
        queryFn: () => auditAPI.getLogs(queryParams).then((r) => r.data),
        refetchInterval: autoRefresh ? 30000 : false,
    });

    const { data: statsData } = useQuery({
        queryKey: ['audit-stats-mini'],
        queryFn: () => auditAPI.getStats().then((r) => r.data?.data),
        refetchInterval: autoRefresh ? 30000 : false,
    });

    const { data: alertsData } = useQuery({
        queryKey: ['audit-alerts-count'],
        queryFn: () => auditAPI.getSecurityAlerts().then((r) => r.data?.data),
        refetchInterval: autoRefresh ? 30000 : false,
    });

    const handleExport = useCallback(async () => {
        try {
            const exportFilters = { ...filters };
            if (exportFilters.search) {
                delete exportFilters.search;
            }

            const res = await auditAPI.exportCSV(exportFilters);
            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
            anchor.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export failed:', err);
        }
    }, [filters]);

    const updateFilter = (key, value) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
        setPage(1);
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            category: '',
            result: '',
            startDate: '',
            endDate: '',
            ipAddress: '',
        });
        setSearchInput('');
        setPage(1);
    };

    const logs = data?.data || [];
    const pagination = data?.pagination || {
        page,
        total: 0,
        totalPages: 1,
        hasPrev: false,
        hasNext: false,
        limit: perPage,
    };
    const summary = data?.summary || {};
    const stats24h = statsData?.last24h || {};

    const showingFrom = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
    const showingTo = Math.min(pagination.page * pagination.limit, pagination.total || 0);
    const usersInRange = summary.uniqueUsers ?? statsData?.totalUsers ?? 0;
    const pageChips = getPageChips(pagination.page || 1, Math.max(1, pagination.totalPages || 1));

    return (
        <div className="min-h-screen">
            <div className="w-full">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-[20px] font-semibold text-[#0f1623]">Audit Logs</h1>
                        <p className="text-[13px] text-[#7a87a8] mt-1">Monitor all system activity and security events.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleExport}
                            className="border border-[#d0d7e8] text-[#3a4560] hover:bg-[#f4f6fb] rounded-xl px-4 py-2 text-sm flex items-center gap-2 transition-colors"
                        >
                            <Download size={14} />
                            Export CSV
                        </button>
                        <button
                            onClick={() => setAutoRefresh((prev) => !prev)}
                            className={`rounded-xl px-4 py-2 text-sm flex items-center gap-2 transition-colors border ${autoRefresh
                                ? 'bg-[#4f46e5]/8 border-[#4f46e5]/30 text-[#4f46e5]'
                                : 'border-[#d0d7e8] text-[#3a4560] hover:bg-[#f4f6fb]'
                                }`}
                        >
                            <RefreshCw size={14} className={autoRefresh ? 'animate-spin' : ''} />
                            Auto-Refresh
                        </button>
                        {autoRefresh ? (
                            <span className="inline-flex items-center rounded-xl border border-[#4f46e5]/20 bg-[#4f46e5]/5 px-3 py-2 text-xs text-[#4f46e5]">
                                Refreshing every 30s
                            </span>
                        ) : null}
                        <button
                            onClick={() => navigate('/dashboard/audit-logs/stats')}
                            className="bg-[#4f46e5] hover:bg-[#3730a3] text-white rounded-xl px-4 py-2 text-sm flex items-center gap-2 transition-colors"
                        >
                            <BarChart2 size={14} />
                            Analytics
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#4f46e5]/10">
                            <Activity size={18} className="text-[#4f46e5]" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#0f1623]">{formatNumber(stats24h.totalEvents ?? 0)}</div>
                            <div className="text-xs text-[#7a87a8] mt-0.5">Total Events (24h)</div>
                        </div>
                    </div>

                    <div className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#dc2626]/10">
                            <LogIn size={18} className="text-[#dc2626]" />
                        </div>
                        <div>
                            <div className={`text-2xl font-bold ${(stats24h.failedLogins ?? 0) === 0 ? 'text-[#16a34a]' : 'text-[#0f1623]'}`}>
                                {formatNumber(stats24h.failedLogins ?? 0)}
                            </div>
                            <div className="text-xs text-[#7a87a8] mt-0.5">Failed Logins (24h)</div>
                        </div>
                    </div>

                    <div className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#d97706]/10">
                            <ShieldOff size={18} className="text-[#d97706]" />
                        </div>
                        <div>
                            <div className={`text-2xl font-bold ${(stats24h.permissionDenied ?? 0) === 0 ? 'text-[#16a34a]' : 'text-[#0f1623]'}`}>
                                {formatNumber(stats24h.permissionDenied ?? 0)}
                            </div>
                            <div className="text-xs text-[#7a87a8] mt-0.5">Permission Denied (24h)</div>
                        </div>
                    </div>

                    <div className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#dc2626]/10">
                            <AlertTriangle size={18} className="text-[#dc2626]" />
                        </div>
                        <div>
                            <div className={`text-2xl font-bold ${(alertsData?.totalAlerts ?? 0) === 0 ? 'text-[#16a34a]' : 'text-[#0f1623]'}`}>
                                {formatNumber(alertsData?.totalAlerts ?? 0)}
                            </div>
                            <div className="text-xs text-[#7a87a8] mt-0.5">Security Alerts</div>
                        </div>
                    </div>
                </div>

                <div className="mb-4 flex flex-col flex-wrap gap-3 rounded-2xl border border-[#d0d7e8] bg-white px-5 py-4 shadow-sm sm:flex-row">
                    <div className="relative w-full sm:flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={(e) => {
                                setSearchInput(e.target.value);
                                setPage(1);
                            }}
                            placeholder="Search action, resource, IP..."
                            className="w-full border border-[#d0d7e8] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#3a4560] placeholder:text-[#7a87a8] focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none"
                        />
                    </div>

                    <div className="relative w-full sm:w-auto">
                        <select
                            value={filters.category}
                            onChange={(e) => updateFilter('category', e.target.value)}
                            className="w-full appearance-none bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl px-4 py-2.5 pr-8 text-sm text-[#3a4560] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 sm:w-auto"
                        >
                            <option value="">Category</option>
                            <option value="AUTHENTICATION">Authentication</option>
                            <option value="AUTHORIZATION">Authorization</option>
                            <option value="ROLE_MANAGEMENT">Admin - Roles</option>
                            <option value="POLICY_MANAGEMENT">Admin - Policies</option>
                            <option value="GROUP_MANAGEMENT">Admin - Groups</option>
                            <option value="USER_MANAGEMENT">Admin - Users</option>
                            <option value="SECURITY">Security</option>
                            <option value="SYSTEM">System</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                    </div>

                    <div className="relative w-full sm:w-auto">
                        <select
                            value={filters.result}
                            onChange={(e) => updateFilter('result', e.target.value)}
                            className="w-full appearance-none bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl px-4 py-2.5 pr-8 text-sm text-[#3a4560] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 sm:w-auto"
                        >
                            <option value="">Result</option>
                            <option value="SUCCESS">Success</option>
                            <option value="FAILURE">Failure</option>
                            <option value="ERROR">Error</option>
                            <option value="WARNING">Warning</option>
                            <option value="BLOCKED">Denied</option>
                        </select>
                        <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                    </div>

                    <div className="relative w-full sm:w-auto">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                        <input
                            type="date"
                            value={filters.startDate}
                            onChange={(e) => updateFilter('startDate', e.target.value)}
                            className="w-full border border-[#d0d7e8] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#3a4560] bg-white focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none sm:w-auto"
                        />
                    </div>

                    <div className="relative w-full sm:w-auto">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                        <input
                            type="date"
                            value={filters.endDate}
                            onChange={(e) => updateFilter('endDate', e.target.value)}
                            className="w-full border border-[#d0d7e8] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[#3a4560] bg-white focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none sm:w-auto"
                        />
                    </div>

                    <input
                        type="text"
                        value={filters.ipAddress}
                        onChange={(e) => updateFilter('ipAddress', e.target.value)}
                        placeholder="IP Address"
                        className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm placeholder:text-[#7a87a8] text-[#3a4560] focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none sm:w-36"
                    />

                    <button
                        onClick={clearFilters}
                        className="text-left text-xs text-[#4f46e5] hover:underline sm:ml-auto sm:w-auto sm:text-right"
                    >
                        Clear Filters
                    </button>
                </div>

                <div className="flex items-center gap-3 mb-3 px-1 text-sm text-[#7a87a8]">
                    <span>
                        <span className="font-semibold text-[#0f1623]">{formatNumber(summary.totalEvents ?? pagination.total ?? 0)}</span> events
                    </span>
                    <span>&middot;</span>
                    <span>
                        across <span className="font-semibold text-[#0f1623]">{formatNumber(usersInRange)}</span> users
                    </span>
                </div>

                <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="min-w-[700px] w-full border-collapse table-fixed text-[13px]">
                            <colgroup>
                                <col style={{ width: '14%' }} />
                                <col style={{ width: '18%' }} />
                                <col style={{ width: '18%' }} />
                                <col style={{ width: '14%' }} />
                                <col style={{ width: '14%' }} />
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '10%' }} />
                            </colgroup>
                            <thead>
                                <tr className="h-10 bg-[#f8fafc] border-b border-[#e2e8f0]">
                                    <th className="h-10 px-4 align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8] whitespace-nowrap text-center">Timestamp</th>
                                    <th className="h-10 px-4 align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8] whitespace-nowrap text-left">User</th>
                                    <th className="h-10 px-4 align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8] whitespace-nowrap text-left">Action</th>
                                    <th className="h-10 px-4 align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8] whitespace-nowrap text-center">Category</th>
                                    <th className="hidden h-10 px-4 align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8] whitespace-nowrap text-center md:table-cell">Resource</th>
                                    <th className="h-10 px-4 align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8] whitespace-nowrap text-center">Result</th>
                                    <th className="hidden h-10 px-4 align-middle text-[11px] font-semibold uppercase tracking-[0.06em] text-[#94a3b8] whitespace-nowrap text-center lg:table-cell">IP</th>
                                </tr>
                            </thead>

                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-sm text-[#7a87a8]">Loading audit logs...</td>
                                    </tr>
                                ) : isError ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-sm text-red-500">Failed to load audit logs.</td>
                                    </tr>
                                ) : logs.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center text-sm text-[#7a87a8]">No audit logs found.</td>
                                    </tr>
                                ) : (
                                    logs.map((log) => {
                                        const category = getCategoryBadge(log.category);
                                        const result = getResultBadge(log.result);
                                        const isExpanded = expandedLogId === log.id;
                                        const email = log.user?.email || log.userId?.slice(0, 8) || '-';

                                        return (
                                            <Fragment key={log.id}>
                                                <tr
                                                    onClick={() => setExpandedLogId((prev) => (prev === log.id ? null : log.id))}
                                                    className="h-14 border-b border-[#f1f5f9] transition-[background-color] duration-100 hover:bg-[#f8fafc] cursor-pointer"
                                                >
                                                    <td className="h-14 px-4 align-middle overflow-hidden text-center font-mono text-[11px] text-[#64748b]">
                                                        {formatShortTimestamp(log.createdAt)}
                                                    </td>

                                                    <td className="h-14 px-4 align-middle overflow-hidden text-left">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className="w-[26px] h-[26px] rounded-full bg-[#6366f1] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                                                {getInitials(log)}
                                                            </div>
                                                            <span className="text-[12px] text-[#374151] truncate">{email}</span>
                                                        </div>
                                                    </td>

                                                    <td className="h-14 px-4 align-middle overflow-hidden text-left text-[12px] font-medium text-[#0f172a] truncate">
                                                        {toTitleCaseAction(log.action)}
                                                    </td>

                                                    <td className="h-14 px-4 align-middle overflow-hidden text-center">
                                                        <span className={`inline-flex items-center rounded-[20px] px-[9px] py-[2px] text-[10px] font-semibold ${category.className}`}>
                                                            {category.label}
                                                        </span>
                                                    </td>

                                                    <td className="hidden h-14 px-4 align-middle overflow-hidden text-center font-mono text-[11px] text-[#94a3b8] truncate md:table-cell">
                                                        {log.resource || '-'}
                                                    </td>

                                                    <td className="h-14 px-4 align-middle overflow-hidden text-center">
                                                        <span className={`inline-flex items-center rounded-[20px] px-[9px] py-[2px] text-[10px] font-semibold ${result.className}`}>
                                                            {result.label}
                                                        </span>
                                                    </td>

                                                    <td className="hidden h-14 px-4 align-middle overflow-hidden text-center font-mono text-[11px] text-[#64748b] lg:table-cell">
                                                        {formatIp(log.ipAddress)}
                                                    </td>
                                                </tr>

                                                {isExpanded ? (
                                                    <tr className="border-b border-[#f1f5f9] bg-[#f8fafc]">
                                                        <td colSpan={7} className="px-8 py-4">
                                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                                                <div>
                                                                    <p className="text-[#7a87a8] uppercase tracking-wide text-[10px]">Event ID</p>
                                                                    <p className="text-[#0f1623] font-medium mt-0.5 font-mono break-all">{log.id}</p>
                                                                </div>

                                                                <div>
                                                                    <p className="text-[#7a87a8] uppercase tracking-wide text-[10px]">Full Timestamp</p>
                                                                    <p className="text-[#0f1623] font-medium mt-0.5">{formatFullTimestamp(log.createdAt)}</p>
                                                                </div>

                                                                <div>
                                                                    <p className="text-[#7a87a8] uppercase tracking-wide text-[10px]">User Agent</p>
                                                                    <p className="text-[#0f1623] font-medium mt-0.5 break-all">{log.userAgent || '-'}</p>
                                                                </div>

                                                                <div>
                                                                    <p className="text-[#7a87a8] uppercase tracking-wide text-[10px]">Request Path</p>
                                                                    <p className="text-[#0f1623] font-medium mt-0.5 font-mono">{getRequestPath(log)}</p>
                                                                </div>

                                                                <div>
                                                                    <p className="text-[#7a87a8] uppercase tracking-wide text-[10px]">Response Code</p>
                                                                    <p className="text-[#0f1623] font-medium mt-0.5">{getResponseCode(log)}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : null}
                                            </Fragment>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 py-4 border-t border-[#f0f2f8] flex items-center justify-between gap-4 flex-wrap">
                        <div className="text-sm text-[#7a87a8]">
                            Showing {formatNumber(showingFrom)}-{formatNumber(showingTo)} of {formatNumber(pagination.total || 0)} events
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                disabled={!pagination.hasPrev}
                                className="border border-[#d0d7e8] rounded-lg p-1.5 text-[#7a87a8] hover:bg-[#f4f6fb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>

                            {pageChips.map((chip, idx) => {
                                if (chip === '...') {
                                    return (
                                        <span key={`ellipsis-${idx}`} className="px-2 text-xs text-[#7a87a8]">...</span>
                                    );
                                }

                                const active = chip === pagination.page;
                                return (
                                    <button
                                        key={chip}
                                        onClick={() => setPage(chip)}
                                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${active
                                            ? 'bg-[#4f46e5] text-white border-[#4f46e5]'
                                            : 'border-[#d0d7e8] text-[#7a87a8] hover:bg-[#f4f6fb]'
                                            }`}
                                    >
                                        {chip}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => setPage((prev) => prev + 1)}
                                disabled={!pagination.hasNext}
                                className="border border-[#d0d7e8] rounded-lg p-1.5 text-[#7a87a8] hover:bg-[#f4f6fb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-[#7a87a8]">
                            Per page
                            <div className="relative">
                                <select
                                    value={perPage}
                                    onChange={(e) => {
                                        setPerPage(Number(e.target.value));
                                        setPage(1);
                                    }}
                                    className="appearance-none bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl px-3 py-1.5 pr-6 text-sm text-[#3a4560] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                                >
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


