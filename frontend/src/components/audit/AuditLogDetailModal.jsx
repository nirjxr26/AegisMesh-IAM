import PropTypes from 'prop-types';
import { useEffect, useRef } from 'react';
import { CATEGORY_CONFIG, RESULT_CONFIG } from './auditConfig';

export default function AuditLogDetailModal({ log, onClose }) {
    const modalRef = useRef(null);

    useEffect(() => {
        if (!log) return undefined;

        const firstFocusable = modalRef.current?.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();

        const keyHandler = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', keyHandler);
        return () => {
            document.removeEventListener('keydown', keyHandler);
        };
    }, [log, onClose]);

    if (!log) return null;
    const cat = CATEGORY_CONFIG[log.category] || {};
    const res = RESULT_CONFIG[log.result] || {};

    return (
        <dialog
            open
            ref={modalRef}
            className="fixed inset-0 z-[1000] m-0 flex h-full w-full max-w-none items-center justify-center bg-transparent p-5"
            aria-labelledby="audit-log-modal-title"
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
        >
            <div style={{
                background: '#1E293B', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)',
                maxWidth: '700px', width: '100%', maxHeight: '85vh', overflow: 'auto', padding: '28px',
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 id="audit-log-modal-title" style={{ margin: 0, fontSize: '18px', color: '#F1F5F9' }}>Audit Log Details</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94A3B8', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                    <Field label="ID" value={log.id} mono />
                    <Field label="Timestamp" value={new Date(log.createdAt).toLocaleString()} />
                    <Field label="Action" value={log.action} bold />
                    <Field label="Category" value={<span style={{ color: cat.color }}>{cat.icon} {cat.label}</span>} />
                    <Field label="Result" value={<span style={{ padding: '2px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, background: res.bg, color: res.color }}>{res.label}</span>} />
                    <Field label="Resource" value={log.resource || '—'} />
                    <Field label="Resource ID" value={log.resourceId || '—'} mono />
                    <Field label="User" value={log.user?.email || log.userId || '—'} />
                    <Field label="Session ID" value={log.sessionId?.substring(0, 12) || '—'} mono />
                    <Field label="IP Address" value={log.ipAddress || '—'} mono />
                    <Field label="Error Code" value={log.errorCode || '—'} />
                    <Field label="Duration" value={log.duration ? `${log.duration}ms` : '—'} />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                    <label htmlFor="audit-log-user-agent" style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500, display: 'block', marginBottom: '6px' }}>User Agent</label>
                    <div id="audit-log-user-agent" style={{ fontSize: '12px', color: '#64748B', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px', wordBreak: 'break-all' }}>{log.userAgent || '—'}</div>
                </div>

                {log.metadata && (
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <label htmlFor="audit-log-metadata" style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 500 }}>Metadata</label>
                            <button onClick={() => navigator.clipboard.writeText(JSON.stringify(log.metadata, null, 2))} style={{ fontSize: '11px', background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer' }}>Copy</button>
                        </div>
                        <pre id="audit-log-metadata" style={{ background: 'rgba(0,0,0,0.3)', padding: '14px', borderRadius: '8px', fontSize: '12px', color: '#CBD5E1', overflow: 'auto', maxHeight: '200px', margin: 0 }}>
                            {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </dialog>
    );
}

function Field({ label, value, mono, bold }) {
    return (
        <div>
            <label style={{ fontSize: '11px', color: '#64748B', fontWeight: 500, display: 'block', marginBottom: '2px' }}>{label}</label>
            <div style={{ color: bold ? '#F1F5F9' : '#CBD5E1', fontWeight: bold ? 600 : 400, fontFamily: mono ? 'monospace' : 'inherit', fontSize: mono ? '11px' : '13px' }}>{value}</div>
        </div>
    );
}

Field.propTypes = {
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.node]).isRequired,
    mono: PropTypes.bool,
    bold: PropTypes.bool,
};

AuditLogDetailModal.propTypes = {
    log: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        createdAt: PropTypes.string,
        action: PropTypes.string,
        category: PropTypes.string,
        result: PropTypes.string,
        resource: PropTypes.string,
        resourceId: PropTypes.string,
        user: PropTypes.shape({ email: PropTypes.string }),
        userId: PropTypes.string,
        sessionId: PropTypes.string,
        ipAddress: PropTypes.string,
        errorCode: PropTypes.string,
        duration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        userAgent: PropTypes.string,
        metadata: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
    }),
    onClose: PropTypes.func.isRequired,
};


