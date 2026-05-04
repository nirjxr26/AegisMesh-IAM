import React, { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { rbacAPI } from '../../services/api';
import {
    CheckCircle2,
    ChevronLeft,
    Code2,
    Copy,
    Globe,
    Key,
    Link as LinkIcon,
    Link2Off,
    Pencil,
    Trash2,
    XCircle,
    Zap,
} from 'lucide-react';

export default function PolicyDetail() {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState('visual');
    const [copied, setCopied] = useState(false);

    const { data: policyData, isLoading } = useQuery({
        queryKey: ['policy', id],
        queryFn: () => rbacAPI.getPolicy(id),
    });

    const policy = policyData?.data?.data;
    const policyJson = policy ? {
        Version: "2012-10-17",
        Statement: [
            {
                Effect: policy.effect,
                Action: policy.actions,
                Resource: policy.resources
            }
        ]
    } : null;

    const policyCode = policyJson ? JSON.stringify(policyJson, null, 4) : '';

    const syntaxHighlight = useMemo(() => {
        return (jsonObject) => {
            if (!jsonObject) return '';

            return JSON.stringify(jsonObject, null, 4)
                .replace(/"([^"\\]+)":/g, '<span style="color:#7dd3fc">"$1"</span>:')
                .replace(/: "([^"\\]*)"/g, ': <span style="color:#86efac">"$1"</span>')
                .replace(/[{}[\]]/g, '<span style="color:#f8fafc">$&</span>');
        };
    }, []);

    const formatDate = (value) => {
        if (!value) return 'Unknown';
        return new Date(value).toLocaleString();
    };

    const copyJson = async () => {
        if (!policyCode) return;

        try {
            await navigator.clipboard.writeText(policyCode);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-slate-500 text-[13px]">Loading policy details...</div>;
    if (!policy) return <div className="p-8 text-center text-red-400">Policy not found</div>;

    const policyArn = `arn:aegismesh::account:policy/${policy.name}`;
    const isAllow = policy.effect === 'ALLOW';

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Link
                    to="/dashboard/policies"
                    className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-700 transition-colors"
                >
                    <ChevronLeft size={14} />
                    Back to Policies
                </Link>

                <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-[24px] font-extrabold tracking-[-0.03em] text-slate-900">{policy.name}</h1>
                                <span className={`rounded-lg border px-3 py-1 text-[12px] font-bold ${isAllow ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
                                    {policy.effect}
                                </span>
                            </div>
                            <p className="mt-1.5 text-[14px] text-slate-500">{policy.description || 'No description provided.'}</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <Pencil size={14} className="mr-1.5" />
                                Edit Policy
                            </button>
                            <button
                                type="button"
                                disabled={policy.isSystem}
                                className="inline-flex items-center rounded-xl border border-red-200 bg-white px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300 disabled:hover:bg-white"
                            >
                                <Trash2 size={14} className="mr-1.5" />
                                Delete Policy
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-5">
                        <span className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[11px] text-slate-500">
                            {policyArn}
                        </span>
                    </div>
                </div>

                <div className="my-6 border-t border-slate-200" />

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-6 py-4">
                            <div className="inline-flex items-center">
                                <span className="mr-3 rounded-lg bg-slate-100 p-1.5 text-slate-600">
                                    <Code2 size={16} />
                                </span>
                                <h2 className="text-[15px] font-bold text-slate-900">Policy Document</h2>
                            </div>

                            <div className="inline-flex gap-1 rounded-lg bg-slate-100 p-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('visual')}
                                    className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all ${activeTab === 'visual' ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'text-slate-500'}`}
                                >
                                    Visual
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('json')}
                                    className={`rounded-md px-3 py-1.5 text-[12px] font-medium transition-all ${activeTab === 'json' ? 'bg-white text-slate-900 font-semibold shadow-sm' : 'text-slate-500'}`}
                                >
                                    JSON
                                </button>
                            </div>
                        </div>

                        {activeTab === 'visual' ? (
                            <div className="px-6 py-5">
                                <div className={`mb-5 flex items-center gap-3 rounded-r-xl border-l-4 px-4 py-3 ${isAllow ? 'border-emerald-500 bg-emerald-50' : 'border-red-500 bg-red-50'}`}>
                                    {isAllow ? <CheckCircle2 size={18} className="text-emerald-500" /> : <XCircle size={18} className="text-red-500" />}
                                    <span className={`text-[14px] font-bold ${isAllow ? 'text-emerald-900' : 'text-red-900'}`}>
                                        Effect: {policy.effect}
                                    </span>
                                </div>

                                <div>
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="inline-flex items-center text-[13px] font-bold text-slate-900">
                                            <Zap size={14} className="mr-2 text-indigo-500" />
                                            Actions
                                        </h3>
                                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                                            {policy.actions.length}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {policy.actions.map((action) => (
                                            <span
                                                key={action}
                                                className={`rounded-lg border px-3 py-1.5 font-mono text-[12px] font-medium ${action.includes('*') ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                                            >
                                                {action}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="my-5 border-t border-slate-100" />

                                <div>
                                    <div className="mb-3 flex items-center justify-between">
                                        <h3 className="inline-flex items-center text-[13px] font-bold text-slate-900">
                                            <Globe size={14} className="mr-2 text-indigo-500" />
                                            Resources
                                        </h3>
                                        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-700">
                                            {policy.resources.length}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {policy.resources.map((resource) => (
                                            <span
                                                key={resource}
                                                className={`rounded-lg border px-3 py-1.5 font-mono text-[12px] font-medium ${resource.includes('*') ? 'border-purple-200 bg-purple-50 text-purple-800' : 'border-slate-200 bg-slate-50 text-slate-700'}`}
                                            >
                                                {resource}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="relative overflow-x-auto rounded-b-2xl bg-slate-950 p-6">
                                <button
                                    type="button"
                                    onClick={copyJson}
                                    className="absolute right-3 top-3 inline-flex items-center rounded-lg border border-white/10 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-white/20 hover:text-white"
                                >
                                    <Copy size={12} className="mr-1.5" />
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                                <pre
                                    className="m-0 text-[13px] leading-[1.7] text-slate-200"
                                    style={{ fontFamily: "JetBrains Mono, Fira Code, monospace" }}
                                    dangerouslySetInnerHTML={{ __html: syntaxHighlight(policyJson) }}
                                />
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                                <div className="inline-flex items-center">
                                    <span className="mr-3 rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
                                        <LinkIcon size={15} />
                                    </span>
                                    <h3 className="text-[14px] font-bold text-slate-900">Attached To</h3>
                                </div>
                                <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[12px] font-semibold text-indigo-700">
                                    {policy.rolePolicies.length} Roles
                                </span>
                            </div>

                            <div className="px-5 py-4">
                                {policy.rolePolicies.length === 0 ? (
                                    <div className="py-8 text-center">
                                        <Link2Off size={28} className="mx-auto mb-2 text-slate-300" />
                                        <p className="text-[13px] text-slate-400">Not attached to any roles</p>
                                    </div>
                                ) : (
                                    <ul>
                                        {policy.rolePolicies.map(({ role }) => (
                                            <li key={role.id} className="flex items-center gap-2.5 border-b border-slate-50 py-3 last:border-b-0">
                                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
                                                    <Key size={14} />
                                                </div>
                                                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-slate-900">{role.name}</p>
                                                <Link to={`/dashboard/roles/${role.id}`} className="text-[11px] text-indigo-500 hover:underline">
                                                    Manage →
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <h3 className="mb-4 text-[14px] font-bold text-slate-900">Policy Details</h3>

                            <div className="flex items-center justify-between border-b border-slate-50 py-2.5">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Effect</span>
                                <span className={`text-[12px] font-semibold ${isAllow ? 'text-emerald-700' : 'text-red-700'}`}>{policy.effect}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-50 py-2.5">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Actions</span>
                                <span className="text-[12px] font-medium text-slate-700">{policy.actions.length} defined</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-50 py-2.5">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Resources</span>
                                <span className="text-[12px] font-medium text-slate-700">{policy.resources.length} defined</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-50 py-2.5">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Roles</span>
                                <span className="text-[12px] font-medium text-slate-700">{policy.rolePolicies.length} attached</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-50 py-2.5">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Type</span>
                                <span className="text-[12px] font-medium text-slate-700">{policy.isSystem ? 'System' : 'Custom'}</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-slate-50 py-2.5">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Created</span>
                                <span className="text-[12px] font-medium text-slate-700">{formatDate(policy.createdAt)}</span>
                            </div>
                            <div className="flex items-center justify-between py-2.5">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">Updated</span>
                                <span className="text-[12px] font-medium text-slate-700">{formatDate(policy.updatedAt)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


