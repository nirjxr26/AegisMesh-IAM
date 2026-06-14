import React, {
    useMemo,
    useState,
} from 'react';

import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';

import {
    Link,
    useNavigate,
} from 'react-router-dom';

import {
    ChevronDown,
    Eye,
    FileText,
    Pencil,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { rbacAPI } from '../../services/api';

const EMPTY_POLICIES = [];

export default function PoliciesList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [effectFilter, setEffectFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [page, setPage] = useState(1);
    const perPage = 20;

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        name: '',
        description: '',
        effect: 'ALLOW',
        actions: ['*'],
        resources: ['*'],
    });
    const [actionInput, setActionInput] = useState('*');
    const [formErrors, setFormErrors] = useState({});

    const {
        data: policiesData,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['policies', search, effectFilter],
        queryFn: () => rbacAPI.getPolicies({ search, effect: effectFilter }),
    });

    const createMutation = useMutation({
        mutationFn: (data) => rbacAPI.createPolicy(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['policies']);
            toast.success('Policy created successfully');
            handleCloseCreateModal();
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to create policy');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => rbacAPI.deletePolicy(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['policies']);
            toast.success('Policy deleted');
        },
        onError: (error) => {
            toast.error(error.response?.data?.error || 'Failed to delete policy');
        },
    });

    const handleCloseCreateModal = () => {
        setIsCreateOpen(false);
        setCreateForm({
            name: '',
            description: '',
            effect: 'ALLOW',
            actions: ['*'],
            resources: ['*'],
        });
        setActionInput('*');
        setFormErrors({});
    };

    const handleCreate = (e) => {
        e.preventDefault();
        const errors = {};
        if (!createForm.name.trim()) errors.name = 'Policy name is required';
        
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return;

        const actions = actionInput.split(',').map(a => a.trim()).filter(Boolean);
        if (actions.length === 0) {
            setFormErrors({ actions: 'At least one action is required' });
            return;
        }

        createMutation.mutate({
            ...createForm,
            name: createForm.name.trim(),
            description: createForm.description.trim(),
            actions,
        });
    };

    const policies = policiesData?.data?.data ?? EMPTY_POLICIES;

    const filteredPolicies = useMemo(() => {
        if (!typeFilter) return policies;
        if (typeFilter === 'SYSTEM') return policies.filter(p => p.isSystem);
        return policies.filter(p => !p.isSystem);
    }, [policies, typeFilter]);

    const total = filteredPolicies.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(page, totalPages);
    const startIndex = (safePage - 1) * perPage;
    const visiblePolicies = filteredPolicies.slice(startIndex, startIndex + perPage);

    function handleDelete(policy) {
        if (policy.isSystem) return;
        if (window.confirm(`Are you sure you want to delete "${policy.name}"?`)) {
            deleteMutation.mutate(policy.id);
        }
    }

    return (
        <div className="w-full">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-[20px] font-semibold text-[#0f1623]">Policies</h1>
                    <p className="mt-1 text-[13px] text-[#7a87a8]">
                        Author and attach policies that control resource access.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsCreateOpen(true)}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3730a3]"
                >
                    <Plus size={15} />
                    + New Policy
                </button>
            </div>

            {/* Filters */}
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#d0d7e8] bg-white px-5 py-4 shadow-sm lg:flex-nowrap">
                <div className="relative min-w-[260px] flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Search policies..."
                        className="w-full rounded-xl border border-[#d0d7e8] py-2.5 pl-9 pr-4 text-sm text-[#0f1623] outline-none placeholder:text-[#7a87a8] focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25"
                    />
                </div>

                <div className="relative">
                    <select
                        value={effectFilter}
                        onChange={(e) => {
                            setEffectFilter(e.target.value);
                            setPage(1);
                        }}
                        className="cursor-pointer appearance-none rounded-xl border border-[#d0d7e8] bg-[#f4f6fb] px-4 py-2.5 pr-8 text-sm text-[#3a4560] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                    >
                        <option value="">All Effects</option>
                        <option value="ALLOW">Allow</option>
                        <option value="DENY">Deny</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                </div>

                <div className="relative">
                    <select
                        value={typeFilter}
                        onChange={(e) => {
                            setTypeFilter(e.target.value);
                            setPage(1);
                        }}
                        className="cursor-pointer appearance-none rounded-xl border border-[#d0d7e8] bg-[#f4f6fb] px-4 py-2.5 pr-8 text-sm text-[#3a4560] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                    >
                        <option value="">All Types</option>
                        <option value="SYSTEM">System</option>
                        <option value="CUSTOM">Custom</option>
                    </select>
                    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                </div>
            </div>

            {/* Grid */}
            <div className="w-full">
                {isLoading ? (
                    <div className="py-24 text-center">
                        <div className="inline-block w-8 h-8 border-3 border-[#4f46e5] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-sm text-[#7a87a8]">Loading policies...</p>
                    </div>
                ) : isError ? (
                    <div className="py-16 text-center text-sm text-red-500">Failed to load policies.</div>
                ) : visiblePolicies.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center bg-white border border-[#d0d7e8] rounded-2xl shadow-sm">
                        <div className="inline-flex rounded-2xl bg-[#f4f6fb] p-4">
                            <FileText size={28} className="text-[#7a87a8]" />
                        </div>
                        <p className="text-[15px] font-semibold text-[#0f1623]">No policies found</p>
                        <p className="text-[13px] text-[#7a87a8]">Try different filters or create a new policy.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {visiblePolicies.map((policy) => (
                                <div
                                    key={policy.id}
                                    className="group bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#4f46e5]/30 transition-all duration-200 flex flex-col h-full"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center shrink-0">
                                            <FileText size={18} />
                                        </div>
                                        <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Link
                                                to={`/dashboard/policies/${policy.id}`}
                                                className="p-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f0f9ff] hover:text-[#0ea5e9] hover:border-[#0ea5e9] transition-all"
                                                title="View"
                                            >
                                                <Eye size={14} />
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/dashboard/policies/${policy.id}`)}
                                                className="p-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#eef2ff] hover:text-[#6366f1] hover:border-[#6366f1] transition-all"
                                                title="Edit"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            {!policy.isSystem && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(policy)}
                                                    className="p-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#fef2f2] hover:text-[#ef4444] hover:border-[#fca5a5] transition-all"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-4 flex-1">
                                        <div className="flex items-center flex-wrap gap-2 mb-2">
                                            <h3 className="text-sm font-bold text-[#0f172a] truncate max-w-[140px]">
                                                {policy.name}
                                            </h3>
                                            <div className="flex gap-1.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    policy.effect === 'ALLOW' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#fee2e2] text-[#dc2626]'
                                                }`}>
                                                    {policy.effect}
                                                </span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    policy.isSystem ? 'bg-[#dbeafe] text-[#1d4ed8]' : 'bg-[#f1f5f9] text-[#475569]'
                                                }`}>
                                                    {policy.isSystem ? 'System' : 'Custom'}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-[12px] text-[#64748b] line-clamp-2 leading-relaxed">
                                            {policy.description || 'No description provided'}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-tight">Actions</span>
                                                <span className="text-[13px] font-semibold text-[#334155]">{policy.actions?.length || 0}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-tight">Attached</span>
                                                <span className="text-[13px] font-semibold text-[#334155]">{policy._count?.rolePolicies || 0}</span>
                                            </div>
                                        </div>
                                        <Link
                                            to={`/dashboard/policies/${policy.id}`}
                                            className="text-[12px] font-bold text-[#4f46e5] hover:text-[#3730a3] transition-colors"
                                        >
                                            View Details →
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="mt-8 flex items-center justify-between">
                            <p className="text-sm text-[#64748b]">
                                Showing page <span className="font-semibold text-[#0f172a]">{safePage}</span> of <span className="font-semibold text-[#0f172a]">{totalPages}</span>
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    disabled={safePage <= 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="rounded-xl border border-[#d0d7e8] px-4 py-2 text-sm font-medium text-[#3a4560] transition-all hover:bg-[#f4f6fb] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Previous
                                </button>
                                <button
                                    type="button"
                                    disabled={safePage >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="rounded-xl border border-[#d0d7e8] px-4 py-2 text-sm font-medium text-[#3a4560] transition-all hover:bg-[#f4f6fb] disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Create Policy Modal */}
            {isCreateOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1623]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                    onMouseDown={(e) => e.target === e.currentTarget && handleCloseCreateModal()}
                >
                    <div 
                        className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#dbe4f0] bg-white shadow-2xl animate-in zoom-in duration-200"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="border-b border-[#eef2f7] bg-[#f8faff] px-8 py-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4f46e5]/10 text-[#4f46e5]">
                                        <FileText size={20} />
                                    </div>
                                    <h2 className="text-[20px] font-bold text-[#0f172a]">Create New Policy</h2>
                                </div>
                                <button 
                                    type="button"
                                    onClick={handleCloseCreateModal}
                                    className="rounded-lg p-2 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-all"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleCreate} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">Policy Name</label>
                                    <input
                                        type="text"
                                        value={createForm.name}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g. S3ReadOnlyAccess"
                                        className={`w-full rounded-xl border ${formErrors.name ? 'border-red-300' : 'border-[#d0d7e8]'} px-4 py-2.5 text-sm focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25 outline-none`}
                                    />
                                    {formErrors.name && <p className="mt-1.5 text-xs font-medium text-red-500">{formErrors.name}</p>}
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">Description</label>
                                    <textarea
                                        value={createForm.description}
                                        onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Brief description..."
                                        rows={3}
                                        className="w-full rounded-xl border border-[#d0d7e8] px-4 py-2.5 text-sm focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25 outline-none resize-none"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">Effect</label>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setCreateForm(prev => ({ ...prev, effect: 'ALLOW' }))}
                                            className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all ${createForm.effect === 'ALLOW' ? 'border-[#16a34a] bg-[#dcfce7] text-[#16a34a]' : 'border-[#d0d7e8] bg-white text-[#64748b] hover:bg-[#f8faff]'}`}
                                        >
                                            Allow
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setCreateForm(prev => ({ ...prev, effect: 'DENY' }))}
                                            className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-all ${createForm.effect === 'DENY' ? 'border-[#dc2626] bg-[#fee2e2] text-[#dc2626]' : 'border-[#d0d7e8] bg-white text-[#64748b] hover:bg-[#f8faff]'}`}
                                        >
                                            Deny
                                        </button>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">Actions (Comma separated)</label>
                                    <textarea
                                        value={actionInput}
                                        onChange={(e) => setActionInput(e.target.value)}
                                        placeholder="s3:ListBucket, s3:GetObject"
                                        rows={2}
                                        className={`w-full rounded-xl border ${formErrors.actions ? 'border-red-300' : 'border-[#d0d7e8]'} px-4 py-2.5 font-mono text-sm focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25 outline-none resize-none`}
                                    />
                                    {formErrors.actions && <p className="mt-1.5 text-xs font-medium text-red-500">{formErrors.actions}</p>}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[#f0f2f8]">
                                <button
                                    type="button"
                                    onClick={handleCloseCreateModal}
                                    className="rounded-xl border border-[#d0d7e8] px-6 py-2.5 text-sm font-bold text-[#334155] hover:bg-[#f8faff] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="rounded-xl bg-[#4f46e5] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 hover:bg-[#3730a3] transition-all disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create Policy'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
