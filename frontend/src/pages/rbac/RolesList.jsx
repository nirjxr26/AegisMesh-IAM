import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    ChevronDown,
    Eye,
    Key,
    KeyRound,
    Pencil,
    Plus,
    Sparkles,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rbacAPI } from '../../services/api';
import RoleTemplates from '../../components/roles/RoleTemplates';

const EMPTY_ROLES = [];

export default function RolesList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [formErrors, setFormErrors] = useState({});

    const { data: rolesData, isLoading, isError } = useQuery({
        queryKey: ['roles', search],
        queryFn: () => rbacAPI.getRoles({ search }),
    });

    const createMutation = useMutation({
        mutationFn: (data) => rbacAPI.createRole(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['roles']);
            setName('');
            setDescription('');
            setFormErrors({});
            setIsCreateOpen(false);
            toast.success('Role created successfully');
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to create role');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => rbacAPI.deleteRole(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['roles']);
            toast.success('Role deleted');
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to delete role');
        },
    });

    const roles = rolesData?.data?.data ?? EMPTY_ROLES;

    const filteredRoles = useMemo(() => {
        if (!typeFilter) return roles;
        if (typeFilter === 'SYSTEM') return roles.filter((role) => role.isSystem);
        return roles.filter((role) => !role.isSystem);
    }, [roles, typeFilter]);

    const handleOpenCreateModal = () => {
        setFormErrors({});
        setIsCreateOpen(true);
    };

    const handleCloseCreateModal = () => {
        if (createMutation.isPending) return;
        setFormErrors({});
        setIsCreateOpen(false);
    };

    const handleCreate = (e) => {
        e.preventDefault();

        const nextErrors = {};
        if (!name.trim()) {
            nextErrors.name = 'Role name is required';
        }

        setFormErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        createMutation.mutate({
            name: name.trim(),
            description: description.trim(),
        });
    };

    const handleDelete = (role) => {
        if (role.isSystem) {
            toast.error('System roles cannot be deleted');
            return;
        }

        if (window.confirm(`Are you sure you want to delete "${role.name}"?`)) {
            deleteMutation.mutate(role.id);
        }
    };

    const handleTemplateSuccess = (role) => {
        queryClient.invalidateQueries(['roles']);
        setIsTemplatesOpen(false);

        if (role?.id) {
            navigate(`/dashboard/roles/${role.id}`);
        }
    };

    return (
        <>
            <div className="w-full">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                            <h1 className="text-[20px] font-semibold text-[#0f1623]">Roles</h1>
                            <p className="text-[13px] text-[#7a87a8] mt-1">
                                Define permission sets and assign them to users or groups.
                            </p>
                        </div>
                        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:flex-nowrap">
                            <button
                                onClick={() => setIsTemplatesOpen(true)}
                                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#d0d7e8] bg-white px-4 py-2 text-sm font-medium text-[#3a4560] transition-colors hover:border-[#4f46e5]/40 hover:bg-[#f4f6ff] sm:min-h-0 sm:flex-none"
                            >
                                <Sparkles size={15} />
                                Use Template
                            </button>
                            <button
                                onClick={handleOpenCreateModal}
                                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#4f46e5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3730a3] sm:min-h-0 sm:flex-none"
                            >
                                <Plus size={15} />
                                + New Role
                            </button>
                        </div>
                    </div>

                    <div className="bg-white border border-[#d0d7e8] rounded-2xl px-5 py-4 mb-4 flex items-center gap-3 shadow-sm flex-wrap lg:flex-nowrap">
                        <div className="relative flex-1 min-w-[260px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7a87a8]" />
                            <input
                                type="text"
                                placeholder="Search roles..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full border border-[#d0d7e8] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#0f1623] placeholder:text-[#7a87a8] focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none"
                            />
                        </div>

                        <div className="relative">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="appearance-none bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl px-4 py-2.5 pr-8 text-sm text-[#3a4560] cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25"
                            >
                                <option value="">All Types</option>
                                <option value="SYSTEM">System</option>
                                <option value="CUSTOM">Custom</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                        </div>
                    </div>

                    <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm">
                        {isLoading ? (
                            <div className="py-16 text-center text-sm text-[#7a87a8]">Loading roles...</div>
                        ) : isError ? (
                            <div className="py-16 text-center text-sm text-red-500">Failed to load roles.</div>
                        ) : filteredRoles.length === 0 ? (
                            <div className="py-16 flex flex-col items-center gap-3 text-center px-4">
                                <div className="bg-[#f4f6fb] rounded-2xl p-4 text-[#7a87a8]">
                                    <KeyRound size={32} />
                                </div>
                                <p className="text-[15px] font-semibold text-[#0f1623]">No roles yet</p>
                                <p className="text-[13px] text-[#7a87a8]">Create your first role to start assigning permissions.</p>
                                <button
                                    onClick={handleOpenCreateModal}
                                    className="mt-2 bg-[#4f46e5] hover:bg-[#3730a3] text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    <Plus size={15} />
                                    + New Role
                                </button>
                                <button
                                    onClick={() => setIsTemplatesOpen(true)}
                                    className="mt-1 bg-white border border-[#d0d7e8] hover:border-[#4f46e5]/40 hover:bg-[#f4f6ff] text-[#3a4560] text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
                                >
                                    <Sparkles size={15} />
                                    Use Template
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="min-w-[600px] w-full border-collapse table-fixed">
                                    <colgroup>
                                        <col style={{ width: '45%' }} />
                                        <col style={{ width: '15%' }} />
                                        <col style={{ width: '25%' }} />
                                        <col style={{ width: '15%' }} />
                                    </colgroup>
                                    <thead>
                                        <tr className="h-10 border-b border-[#e2e8f0] bg-[#f8fafc]">
                                            <th className="h-10 px-4 text-left align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">ROLE</th>
                                            <th className="h-10 px-4 text-center align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">TYPE</th>
                                            <th className="h-10 px-4 text-center align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">SCOPE</th>
                                            <th className="h-10 px-4 text-center align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">ACTIONS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRoles.map((role) => {
                                            const actionBtnBase = 'w-7 h-7 rounded-[7px] border border-[#e2e8f0] bg-white text-[#94a3b8] flex items-center justify-center cursor-pointer transition-all duration-150';

                                            return (
                                                <tr
                                                    key={role.id}
                                                    className="h-16 border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors duration-100"
                                                >
                                                    <td className="h-16 px-4 align-middle overflow-hidden">
                                                        <div className="flex items-center gap-3 h-16 min-w-0">
                                                            <div className="w-[34px] h-[34px] rounded-[9px] bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center shrink-0">
                                                                <Key size={15} />
                                                            </div>
                                                            <div className="min-w-0 flex flex-col gap-0.5 overflow-hidden">
                                                                <p className="text-[13px] font-semibold text-[#0f172a] whitespace-nowrap overflow-hidden text-ellipsis">{role.name}</p>
                                                                <p className="text-[11px] text-[#94a3b8] whitespace-nowrap overflow-hidden text-ellipsis">
                                                                    {role.description || 'No description provided'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="h-16 px-4 align-middle overflow-hidden text-center">
                                                        {role.isSystem ? (
                                                            <span className="inline-flex items-center justify-center bg-[#dbeafe] text-[#1d4ed8] rounded-[20px] px-2.5 py-[3px] text-[11px] font-medium whitespace-nowrap">
                                                                System
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center justify-center bg-[#f1f5f9] text-[#475569] rounded-[20px] px-2.5 py-[3px] text-[11px] font-medium whitespace-nowrap">
                                                                Custom
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="h-16 px-4 align-middle overflow-hidden text-center">
                                                        <div className="flex flex-col items-center gap-0.5">
                                                            <p className="text-[12px] text-[#374151] font-medium">Policies: {role._count?.rolePolicies || 0}</p>
                                                            <p className="text-[12px] text-[#94a3b8]">Users: {role._count?.userRoles || 0}</p>
                                                        </div>
                                                    </td>

                                                    <td className="h-16 px-4 align-middle overflow-hidden text-center">
                                                        <div className="flex items-center justify-center gap-[6px]">
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/dashboard/roles/${role.id}`)}
                                                                className={`${actionBtnBase} hover:border-[#0ea5e9] hover:text-[#0ea5e9] hover:bg-[#f0f9ff]`}
                                                                title="View role"
                                                            >
                                                                <Eye size={13} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/dashboard/roles/${role.id}`)}
                                                                className={`${actionBtnBase} hover:border-[#6366f1] hover:text-[#6366f1] hover:bg-[#eef2ff]`}
                                                                title="Edit role"
                                                            >
                                                                <Pencil size={13} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(role)}
                                                                disabled={deleteMutation.isPending || role.isSystem}
                                                                className={role.isSystem
                                                                    ? `${actionBtnBase} text-[#cbd5e1] cursor-not-allowed`
                                                                    : `${actionBtnBase} hover:border-[#fca5a5] hover:text-[#ef4444] hover:bg-[#fef2f2]`}
                                                                title={role.isSystem ? 'System role cannot be deleted' : 'Delete role'}
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>

            {isCreateOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f1623]/40 backdrop-blur-sm p-0 sm:items-center sm:p-4"
                    onClick={handleCloseCreateModal}
                    onKeyDown={(e) => { if (e.key === 'Escape') handleCloseCreateModal(); }}
                    role="button"
                    tabIndex={0}
                    aria-label="Close modal overlay"
                >
                    <div
                        className="mx-4 w-full rounded-t-[20px] bg-white shadow-2xl sm:mx-0 sm:max-w-md sm:rounded-2xl"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                        role="document"
                    >
                        <div className="px-6 py-5 border-b border-[#f0f2f8] flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="bg-[#4f46e5]/10 rounded-xl p-2 text-[#4f46e5] mr-3">
                                    <KeyRound size={16} />
                                </div>
                                <h2 className="text-[16px] font-semibold text-[#0f1623]">Create New Role</h2>
                            </div>
                            <button
                                type="button"
                                onClick={handleCloseCreateModal}
                                className="text-[#7a87a8] hover:text-[#0f1623] p-1.5 rounded-lg hover:bg-[#f4f6fb] transition-colors"
                                aria-label="Close modal"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate} noValidate>
                            <div className="px-6 py-5 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-[#3a4560] uppercase tracking-wide mb-1.5">
                                        Role Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            if (formErrors.name) {
                                                setFormErrors((prev) => ({ ...prev, name: '' }));
                                            }
                                        }}
                                        placeholder="e.g. DeveloperRole"
                                        className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5]"
                                    />
                                    {formErrors.name ? (
                                        <p className="text-[#dc2626] text-xs mt-1">{formErrors.name}</p>
                                    ) : null}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-[#3a4560] uppercase tracking-wide mb-1.5">
                                        Description
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief description of the role's purpose"
                                        className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5]"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col-reverse gap-3 border-t border-[#f0f2f8] px-6 py-4 sm:flex-row sm:justify-end">
                                <button
                                    type="button"
                                    onClick={handleCloseCreateModal}
                                    className="border border-[#d0d7e8] text-[#3a4560] hover:bg-[#f4f6fb] rounded-xl px-4 py-2 text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="bg-[#4f46e5] hover:bg-[#3730a3] text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60"
                                >
                                    {createMutation.isPending ? 'Creating...' : 'Create Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isTemplatesOpen ? (
                <RoleTemplates
                    onClose={() => setIsTemplatesOpen(false)}
                    onSuccess={handleTemplateSuccess}
                />
            ) : null}
        </>
    );
}


