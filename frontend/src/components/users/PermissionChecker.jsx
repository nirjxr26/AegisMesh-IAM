import React, { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { rbacAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function PermissionChecker({
    userId,
    action: initialAction = 'users:read',
    resource: initialResource = 'users/*',
    onResult,
}) {
    const [actionInput, setActionInput] = useState(null);
    const [resourceInput, setResourceInput] = useState(null);
    const [result, setResult] = useState(null);
    const [status, setStatus] = useState('idle'); // idle | loading | result

    const action = actionInput ?? initialAction;
    const resource = resourceInput ?? initialResource;

    const loading = status === 'loading';

    const statusCard = useMemo(() => {
        if (!result) return null;
        const allowed = Boolean(result.allowed);

        return {
            allowed,
            title: allowed ? 'Access Granted' : 'Access Denied',
            subtitle: allowed
                ? `This user CAN perform ${action} on ${resource}`
                : `This user CANNOT perform ${action} on ${resource}`,
            className: allowed
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900',
            subClass: allowed ? 'text-emerald-800' : 'text-red-900',
            icon: allowed
                ? <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                : <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />,
        };
    }, [action, resource, result]);

    const handleCheck = async () => {
        if (!action || !resource) {
            toast.error('Action and Resource are required');
            return;
        }

        setStatus('loading');
        try {
            const res = await rbacAPI.simulatePolicy({
                userId,
                action,
                resource
            });
            const simulation = res.data?.data;
            setResult(simulation);
            setStatus('result');
            onResult?.(Boolean(simulation?.allowed));
        } catch (error) {
            toast.error(error.response?.data?.error?.message || 'Failed to check permissions');
            setResult(null);
            setStatus('idle');
        }
    };

    return (
        <div className="bg-white rounded-xl p-5 border border-slate-200">
            <h3 className="text-slate-900 font-medium mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Permission Simulator
            </h3>

            <div className="flex gap-3 mb-4 flex-col sm:flex-row">
                <div className="flex-1">
                    <label className="block text-xs text-slate-500 font-medium mb-1">Action</label>
                    <input
                        type="text"
                        value={action}
                        onChange={(e) => setActionInput(e.target.value)}
                        placeholder="e.g. users:read"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-sm"
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs text-slate-500 font-medium mb-1">Resource</label>
                    <input
                        type="text"
                        value={resource}
                        onChange={(e) => setResourceInput(e.target.value)}
                        placeholder="e.g. users/*"
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-900 text-sm"
                    />
                </div>
                <div className="flex items-end pt-1">
                    <button
                        onClick={handleCheck}
                        disabled={loading || !action || !resource}
                        className="w-full sm:w-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                        {loading ? 'Checking...' : 'Check'}
                    </button>
                </div>
            </div>

            {statusCard && status === 'result' ? (
                <div className={`p-4 rounded-lg flex items-start gap-3 mt-4 border ${statusCard.className}`}>
                    {statusCard.icon}
                    <div>
                        <h4 className="text-[14px] font-bold">
                            {statusCard.title}
                        </h4>
                        <p className={`text-[12px] mt-1 ${statusCard.subClass}`}>
                            {statusCard.subtitle}
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}


