import PropTypes from 'prop-types';
import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { auditAPI } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';
import { getInitials as getInitialsFromUser, toTitleCase } from '../../utils/formatters';
import { formatIp as formatIpAddress } from '../../components/audit/auditHelpers';

function toTitleCaseAction(action = '') {
    return toTitleCase(action);
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
    const label = toTitleCase(category) || 'General';

    return {
        label,
        className: 'bg-[#ede9fe] text-[#7c3aed]',
    };
}

function getResultBadge(result = '') {
    switch (result) {
        case 'SUCCESS':
            return {
                label: 'Success',
                className: 'bg-[#dcfce7] text-[#16a34a]',
            };

        case 'BLOCKED':
            return {
                label: 'Blocked',
                className: 'bg-[#fef9c3] text-[#ca8a04]',
            };

        default:
            return {
                label: 'Failure',
                className: 'bg-[#fee2e2] text-[#dc2626]',
            };
    }
}

function getInitials(log) {
    return getInitialsFromUser(log.user?.firstName, log.user?.lastName) || log.user?.email?.[0]?.toUpperCase() || 'U';
}

function getRequestPath(log) {
    const metadata = log.metadata || {};

    return (
        metadata.path ||
        metadata.endpoint ||
        metadata.resource ||
        log.resource ||
        '-'
    );
}

function getResponseCode(log) {
    const metadata = log.metadata || {};

    if (metadata.responseCode) return String(metadata.responseCode);
    if (metadata.statusCode) return String(metadata.statusCode);

    switch (log.result) {
        case 'SUCCESS': return '200';
        case 'BLOCKED': return '403';
        case 'FAILURE': return '401';
        default: return '-';
    }
}

function AuditLogRow({
    log,
    expandedLogId,
    setExpandedLogId,
}) {
    const category = getCategoryBadge(log.category);

    const result = getResultBadge(log.result);

    const isExpanded = expandedLogId === log.id;

    const email =
        log.user?.email ||
        log.userId?.slice(0, 8) ||
        '-';

    const handleToggle = () => {
        setExpandedLogId((prev) => (
            prev === log.id ? null : log.id
        ));
    };

    return (
        <Fragment>
            <tr
                onClick={handleToggle}
                className="cursor-pointer border-b border-[#f1f5f9] hover:bg-[#f8fafc]"
            >
                <td className="px-4 py-3 text-center font-mono text-[11px] text-[#64748b]">
                    {formatShortTimestamp(log.createdAt)}
                </td>

                <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#6366f1] text-[10px] font-bold text-white">
                            {getInitials(log)}
                        </div>

                        <span className="truncate text-[12px] text-[#374151]">
                            {email}
                        </span>
                    </div>
                </td>

                <td className="px-4 py-3 text-[12px] font-medium text-[#0f172a]">
                    {toTitleCaseAction(log.action)}
                </td>

                <td className="px-4 py-3 text-center">
                    <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${category.className}`}
                    >
                        {category.label}
                    </span>
                </td>

                <td className="px-4 py-3 text-center text-[11px] text-[#94a3b8]">
                    {log.resource || '-'}
                </td>

                <td className="px-4 py-3 text-center">
                    <span
                        className={`rounded-full px-2 py-1 text-[10px] font-semibold ${result.className}`}
                    >
                        {result.label}
                    </span>
                </td>

                <td className="px-4 py-3 text-center font-mono text-[11px] text-[#64748b]">
                    {formatIpAddress(log.ipAddress)}
                </td>
            </tr>

            {isExpanded && (
                <tr className="bg-[#f8fafc]">
                    <td colSpan={7} className="px-8 py-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-[#7a87a8]">
                                    Event ID
                                </p>

                                <p className="mt-1 break-all font-mono text-[#0f1623]">
                                    {log.id}
                                </p>
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-[#7a87a8]">
                                    Timestamp
                                </p>

                                <p className="mt-1 text-[#0f1623]">
                                    {formatFullTimestamp(log.createdAt)}
                                </p>
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-[#7a87a8]">
                                    User Agent
                                </p>

                                <p className="mt-1 break-all text-[#0f1623]">
                                    {log.userAgent || '-'}
                                </p>
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-[#7a87a8]">
                                    Request Path
                                </p>

                                <p className="mt-1 font-mono text-[#0f1623]">
                                    {getRequestPath(log)}
                                </p>
                            </div>

                            <div>
                                <p className="text-[10px] uppercase tracking-wide text-[#7a87a8]">
                                    Response Code
                                </p>

                                <p className="mt-1 text-[#0f1623]">
                                    {getResponseCode(log)}
                                </p>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </Fragment>
    );
}

AuditLogRow.propTypes = {
    log: PropTypes.shape({
        id: PropTypes.string,
        action: PropTypes.string,
        category: PropTypes.string,
        result: PropTypes.string,
        resource: PropTypes.string,
        ipAddress: PropTypes.string,
        createdAt: PropTypes.string,
        userAgent: PropTypes.string,
        userId: PropTypes.string,
        metadata: PropTypes.object,
        user: PropTypes.shape({
            email: PropTypes.string,
            firstName: PropTypes.string,
            lastName: PropTypes.string,
        }),
    }).isRequired,
    expandedLogId: PropTypes.string,
    setExpandedLogId: PropTypes.func.isRequired,
};

export default function AuditLogsPage() {
    const [expandedLogId, setExpandedLogId] = useState(null);

    const [searchInput, setSearchInput] = useState('');

    const debouncedSearch = useDebounce(
        searchInput,
        400,
    );

    const queryParams = useMemo(() => ({
        search: debouncedSearch,
        page: 1,
        limit: 25,
    }), [debouncedSearch]);

    const {
        data,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['audit-logs', queryParams],
        queryFn: async () => {
            const response = await auditAPI.getLogs(queryParams);

            return response.data;
        },
    });

    const logs = data?.data || [];

    let tableContent;

    if (isLoading) {
        tableContent = (
            <tr>
                <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-[#7a87a8]"
                >
                    Loading audit logs...
                </td>
            </tr>
        );
    } else if (isError) {
        tableContent = (
            <tr>
                <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-red-500"
                >
                    Failed to load audit logs.
                </td>
            </tr>
        );
    } else if (logs.length === 0) {
        tableContent = (
            <tr>
                <td
                    colSpan={7}
                    className="py-16 text-center text-sm text-[#7a87a8]"
                >
                    No audit logs found.
                </td>
            </tr>
        );
    } else {
        tableContent = logs.map((log) => (
            <AuditLogRow
                key={log.id}
                log={log}
                expandedLogId={expandedLogId}
                setExpandedLogId={setExpandedLogId}
            />
        ));
    }

    return (
        <div className="p-6">
            <div className="mb-4">
                <input
                    type="text"
                    value={searchInput}
                    onChange={(event) => (
                        setSearchInput(event.target.value)
                    )}
                    placeholder="Search audit logs..."
                    className="w-full rounded-lg border border-[#dbe3f0] px-4 py-2 text-sm outline-none"
                />
            </div>

            <div className="overflow-hidden rounded-xl border border-[#e2e8f0] bg-white">
                <table className="w-full">
                    <thead className="bg-[#f8fafc]">
                        <tr>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748b]">
                                Timestamp
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b]">
                                User
                            </th>

                            <th className="px-4 py-3 text-left text-xs font-semibold text-[#64748b]">
                                Action
                            </th>

                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748b]">
                                Category
                            </th>

                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748b]">
                                Resource
                            </th>

                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748b]">
                                Result
                            </th>

                            <th className="px-4 py-3 text-center text-xs font-semibold text-[#64748b]">
                                IP
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {tableContent}
                    </tbody>
                </table>
            </div>
        </div>
    );
}