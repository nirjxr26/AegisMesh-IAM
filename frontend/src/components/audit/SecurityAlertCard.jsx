import PropTypes from 'prop-types';
import { SEVERITY_CONFIG } from './auditConfig';

export default function SecurityAlertCard({ alert }) {
    const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.LOW;
    return (
        <div style={{
            background: sev.bg,
            border: `1px solid ${sev.color}30`,
            borderRadius: '10px',
            padding: '16px',
            borderLeft: `4px solid ${sev.color}`,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{sev.icon}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: sev.color, textTransform: 'uppercase' }}>{alert.severity}</span>
                    <span style={{ fontSize: '12px', color: '#94A3B8', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>{alert.type.replaceAll('_', ' ')}</span>
                </div>
                <span style={{ fontSize: '11px', color: '#64748B' }}>{new Date(alert.lastSeen).toLocaleString()}</span>
            </div>
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#CBD5E1' }}>{alert.details}</p>
            <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#64748B' }}>
                {alert.ipAddress && <span>IP: <span style={{ color: '#94A3B8', fontFamily: 'monospace' }}>{alert.ipAddress}</span></span>}
                <span>Count: <span style={{ color: '#F1F5F9', fontWeight: 600 }}>{alert.count}</span></span>
            </div>
        </div>
    );
}

SecurityAlertCard.propTypes = {
    alert: PropTypes.shape({
        severity: PropTypes.string,
        type: PropTypes.string,
        lastSeen: PropTypes.string,
        details: PropTypes.string,
        ipAddress: PropTypes.string,
        count: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    }).isRequired,
};


