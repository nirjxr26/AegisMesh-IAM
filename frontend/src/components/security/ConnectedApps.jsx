import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, AppWindow, Calendar, Clock, Info, Key, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import { connectedAppsAPI } from '../../services/api';

function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

function formatRelative(value) {
    if (!value) return 'Unknown';

    const diffMs = Date.now() - new Date(value).getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60000));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    const months = Math.floor(days / 30);
    return `${months}mo ago`;
}

function formatDate(value) {
    if (!value) return 'Never';
    return new Date(value).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function getRiskBadgeClasses(level) {
    if (level === 'high') return 'bg-red-50 text-red-700 border-red-200';
    if (level === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
}

function SummaryCard({ label, value }) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-center shadow-sm">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="text-2xl font-semibold text-slate-900 mt-2">{value}</p>
        </div>
    );
}

function ConnectedAppIcon({ app }) {
    if (app.type === 'api_token') {
        return (
            <div className="w-10 h-10 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Key size={18} />
            </div>
        );
    }

    if (app.provider === 'google') {
        return (
            <div className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0 text-lg font-black tracking-tight">
                <span className="text-[#4285F4]">G</span>
            </div>
        );
    }

    if (app.provider === 'github') {
        return (
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 text-sm font-bold">
                GH
            </div>
        );
    }

    return (
        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0 text-sm font-bold uppercase">
            {String(app.name || 'A').slice(0, 2)}
        </div>
    );
}

export default function ConnectedApps() {
    const queryClient = useQueryClient();
    const [activeFilter, setActiveFilter] = useState('all');
    const [pendingRevoke, setPendingRevoke] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['settings-connected-apps'],
        queryFn: () => connectedAppsAPI.getAll().then((response) => response.data),
    });

    const revokeMutation = useMutation({
        mutationFn: (appId) => connectedAppsAPI.revoke(appId),
        onSuccess: async () => {
            toast.success('Access revoked');
            setPendingRevoke(null);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ['settings-connected-apps'] }),
                queryClient.invalidateQueries({ queryKey: ['settings-api-keys'] }),
            ]);
        },
        onError: (error) => {
            toast.error(error.response?.data?.error?.message || error.response?.data?.message || 'Failed to revoke access');
        },
    });

    const apps = useMemo(() => data?.data ?? [], [data]);
    const summary = data?.summary || {
        total: apps.length,
        oauth: apps.filter((app) => app.type === 'oauth').length,
        apiTokens: apps.filter((app) => app.type === 'api_token').length,
    };

    const filteredApps = useMemo(() => {
        if (activeFilter === 'oauth') {
            return apps.filter((app) => app.type === 'oauth');
        }

        if (activeFilter === 'api_token') {
            return apps.filter((app) => app.type === 'api_token');
        }

        return apps;
    }, [activeFilter, apps]);

    const filterOptions = [
        { id: 'all', label: 'All' },
        { id: 'oauth', label: 'OAuth' },
        { id: 'api_token', label: 'API Keys' },
    ];

    return (
        <div className="max-w-5xl space-y-5">
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex gap-3">
                <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-800">
                    These are all services and API keys that have access to your account. Revoke access for anything you do not recognize or no longer use.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SummaryCard label="Total Connected" value={summary.total || 0} />
                <SummaryCard label="OAuth Providers" value={summary.oauth || 0} />
                <SummaryCard label="API Keys" value={summary.apiTokens || 0} />
            </div>

            <div className="flex flex-wrap gap-2">
                {filterOptions.map((option) => (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => setActiveFilter(option.id)}
                        className={classNames(
                            'px-4 py-2 rounded-full text-sm font-medium border transition-colors',
                            activeFilter === option.id
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:text-slate-900'
                        )}
                    >
                        {option.label}
                    </button>
                ))}
            </div>

            {isLoading ? <div className="text-sm text-slate-500">Loading connected apps...</div> : null}

            {!isLoading && apps.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm py-14 flex flex-col items-center text-center px-6">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-300 flex items-center justify-center mb-4">
                        <AppWindow size={28} />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No connected apps</h3>
                    <p className="text-sm text-slate-400 mt-2 max-w-md">
                        You have not connected any third-party apps or created any API keys yet.
                    </p>
                </div>
            ) : null}

            {!isLoading && apps.length > 0 && filteredApps.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-xl px-5 py-6 text-sm text-slate-500">
                    No connected apps match the selected filter.
                </div>
            ) : null}

            {!isLoading && filteredApps.length > 0 ? (
                <div className="space-y-3">
                    {filteredApps.map((app) => (
                        <div key={app.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:border-slate-300 transition-all">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div className="flex items-start gap-4 min-w-0 xl:w-[280px]">
                                    <ConnectedAppIcon app={app} />
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-slate-900">{app.name}</h3>
                                            <span className={classNames(
                                                'text-xs px-2 py-0.5 rounded-full font-medium',
                                                app.type === 'oauth'
                                                    ? 'bg-blue-50 text-blue-700'
                                                    : 'bg-indigo-50 text-indigo-700'
                                            )}
                                            >
                                                {app.type === 'oauth' ? 'OAuth' : 'API Key'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-1">{app.description}</p>
                                    </div>
                                </div>

                                <div className="flex-1 xl:px-2">
                                    <p className="text-xs font-medium text-slate-400 uppercase tracking-[0.18em] mb-1">Permissions</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(app.scopes || []).map((scope) => (
                                            <span key={scope} className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
                                                {scope}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex flex-wrap gap-4 mt-3 text-xs text-slate-500">
                                        <div className="inline-flex items-center gap-1.5">
                                            <Calendar size={13} />
                                            <span>Connected {app.connectedAt ? formatRelative(app.connectedAt) : 'Unknown'}</span>
                                        </div>
                                        <div className="inline-flex items-center gap-1.5">
                                            <Clock size={13} />
                                            <span>Last used {app.lastUsedAt ? formatRelative(app.lastUsedAt) : 'Never used'}</span>
                                        </div>
                                        <div className="inline-flex items-center gap-1.5">
                                            <Clock size={13} />
                                            <span>{app.expiresAt ? `Expires ${formatDate(app.expiresAt)}` : 'Never expires'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="xl:w-[150px] xl:text-right">
                                    <span className={classNames('inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium', getRiskBadgeClasses(app.riskLevel))}>
                                        {app.riskLevel === 'high' ? 'High Risk' : app.riskLevel === 'medium' ? 'Medium Risk' : 'Low Risk'}
                                    </span>
                                    <div className="mt-3">
                                        <button
                                            type="button"
                                            onClick={() => setPendingRevoke(app)}
                                            className="border border-red-200 text-red-600 text-sm hover:bg-red-50 rounded-lg px-3 py-1.5 font-medium transition-all"
                                        >
                                            Revoke Access
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {pendingRevoke ? (
                <div className="fixed inset-0 z-[85] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm p-0 sm:items-center sm:p-4" onMouseDown={(event) => {
                    if (event.target === event.currentTarget && !revokeMutation.isPending) {
                        setPendingRevoke(null);
                    }
                }}>
                    <div className="mx-4 w-full max-w-sm rounded-t-[20px] bg-white p-6 shadow-xl sm:mx-0 sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
                            <ShieldAlert size={22} />
                        </div>

                        <h3 className="text-lg font-semibold text-slate-900 text-center">Revoke access for {pendingRevoke.name}?</h3>
                        <p className="text-sm text-slate-500 text-center mt-2">
                            {pendingRevoke.type === 'oauth'
                                ? `This will disconnect your ${pendingRevoke.name} account. You will need to reconnect it to use ${pendingRevoke.name} login again.`
                                : `This will immediately invalidate the API key "${pendingRevoke.name}". Any apps using this key will stop working.`}
                        </p>

                        {pendingRevoke.type === 'oauth' ? (
                            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex gap-2">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                <span>If this is your only login method, you may need your password to sign in.</span>
                            </div>
                        ) : null}

                        <div className="mt-5">
                            <button
                                type="button"
                                onClick={() => setPendingRevoke(null)}
                                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 mb-2"
                                disabled={revokeMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => revokeMutation.mutate(pendingRevoke.id)}
                                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                disabled={revokeMutation.isPending}
                            >
                                {revokeMutation.isPending ? 'Revoking...' : 'Revoke Access'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}