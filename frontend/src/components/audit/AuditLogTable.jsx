import PropTypes from 'prop-types';
import { CATEGORY_CONFIG, RESULT_CONFIG } from './auditConfig';

const cellStyle = { padding: '10px 12px', color: '#CBD5E1' };

function AuditLogTable({ logs = [], onRowClick, loading }) {
    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#94A3B8' }}>Loading audit logs...</div>;
    }

    if (!logs.length) {
        return <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>No audit logs found</div>;
    }

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        {['Timestamp', 'User', 'Action', 'Category', 'Resource', 'Result', 'IP Address'].map((heading) => (
                            <th
                                key={heading}
                                style={{
                                    padding: '10px 12px',
                                    textAlign: 'left',
                                    color: '#94A3B8',
                                    fontWeight: 600,
                                    fontSize: '11px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                }}
                            >
                                {heading}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log) => {
                        const cat = CATEGORY_CONFIG[log.category] || {
                            label: log.category,
                            color: '#6B7280',
                            icon: '📄',
                        };

                        const res = RESULT_CONFIG[log.result] || {
                            label: log.result,
                            color: '#6B7280',
                            bg: 'rgba(107,114,128,0.15)',
                        };

                        return (
                            <tr
                                key={log.id}
                                onClick={() => onRowClick?.(log)}
                                style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    cursor: 'pointer',
                                    transition: 'background 0.15s',
                                }}
                                onMouseEnter={(event) => {
                                    event.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                }}
                                onMouseLeave={(event) => {
                                    event.currentTarget.style.background = 'transparent';
                                }}
                            >
                                <td style={cellStyle}>{new Date(log.createdAt).toLocaleString()}</td>
                                <td style={cellStyle}>{log.user?.email || log.userId?.substring(0, 8) || '—'}</td>
                                <td style={{ ...cellStyle, fontWeight: 600, color: '#F1F5F9' }}>{log.action}</td>
                                <td style={cellStyle}>
                                    <span
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            background: `${cat.color}20`,
                                            color: cat.color,
                                        }}
                                    >
                                        {cat.icon} {cat.label}
                                    </span>
                                </td>
                                <td
                                    style={{
                                        ...cellStyle,
                                        color: '#94A3B8',
                                        maxWidth: '200px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {log.resource || '—'}
                                </td>
                                <td style={cellStyle}>
                                    <span
                                        style={{
                                            padding: '2px 10px',
                                            borderRadius: '4px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            background: res.bg,
                                            color: res.color,
                                        }}
                                    >
                                        {res.label}
                                    </span>
                                </td>
                                <td
                                    style={{
                                        ...cellStyle,
                                        color: '#64748B',
                                        fontFamily: 'monospace',
                                        fontSize: '11px',
                                    }}
                                >
                                    {log.ipAddress || '—'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

AuditLogTable.propTypes = {
    logs: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        createdAt: PropTypes.string,
        user: PropTypes.shape({ email: PropTypes.string }),
        userId: PropTypes.string,
        action: PropTypes.string,
        category: PropTypes.string,
        resource: PropTypes.string,
        result: PropTypes.string,
        ipAddress: PropTypes.string,
    })),
    onRowClick: PropTypes.func,
    loading: PropTypes.bool,
};

export default AuditLogTable;


