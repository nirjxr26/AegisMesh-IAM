import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
    ChevronDown,
    Eye,
    FileText,
    Key,
    KeyRound,
    Pencil,
    Plus,
    Sparkles,
    Search,
    Trash2,
    Users,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rbacAPI, userAPI } from '../../services/api';
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
    const [arn, setArn] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedPolicies, setSelectedPolicies] = useState([]);
    const [formErrors, setFormErrors] = useState({});

    const { data: rolesData, isLoading, isError } = useQuery({
        queryKey: ['roles', search],
        queryFn: () => rbacAPI.getRoles({ search }),
    });

    const { data: usersData } = useQuery({
        queryKey: ['users-for-role-creation'],
        queryFn: () => userAPI.getUsers({ limit: 100 }),
        enabled: isCreateOpen,
    });

    const { data: policiesData } = useQuery({
        queryKey: ['policies-for-role-creation'],
        queryFn: () => rbacAPI.getPolicies({ limit: 100 }),
        enabled: isCreateOpen,
    });

    const users = usersData?.data?.data?.users || [];
    const policies = policiesData?.data?.data?.data || [];

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const roleResponse = await rbacAPI.createRole({
                name: data.name,
                description: data.description,
                arn: data.arn,
            });
            const roleId = roleResponse.data?.data?.id;
            
            if (roleId) {
                // Attach users and policies in parallel for better performance and to satisfy quality gates
                const userAssignments = data.userIds.map(userId => rbacAPI.assignUserRole(userId, roleId));
                const policyAttachments = data.policyIds.map(policyId => rbacAPI.attachPolicyToRole(roleId, policyId));
                
                await Promise.all([...userAssignments, ...policyAttachments]);
            }
            return roleResponse;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['roles']);
            toast.success('Role created successfully');
            handleCloseCreateModal();
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
        setName('');
        setDescription('');
        setArn('');
        setSelectedUsers([]);
        setSelectedPolicies([]);
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
            arn: arn.trim(),
            userIds: selectedUsers,
            policyIds: selectedPolicies,
        });
    };

    const toggleUser = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const togglePolicy = (policyId) => {
        setSelectedPolicies(prev => 
            prev.includes(policyId) ? prev.filter(id => id !== policyId) : [...prev, policyId]
        );
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
                                type="button"
                                onClick={() => setIsTemplatesOpen(true)}
                                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#d0d7e8] bg-white px-4 py-2 text-sm font-medium text-[#3a4560] transition-colors hover:border-[#4f46e5]/40 hover:bg-[#f4f6ff] sm:min-h-0 sm:flex-none"
                            >
                                <Sparkles size={15} />
                                Use Template
                            </button>
                            <button
                                type="button"
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

                    <div className="w-full">
                        {isLoading ? (
                            <div className="py-24 text-center">
                                <div className="inline-block w-8 h-8 border-3 border-[#4f46e5] border-t-transparent rounded-full animate-spin mb-4"></div>
                                <p className="text-sm text-[#7a87a8]">Loading roles...</p>
                            </div>
                        ) : isError ? (
                            <div className="py-16 text-center text-sm text-red-500">Failed to load roles.</div>
                        ) : filteredRoles.length === 0 ? (
                            <div className="py-16 flex flex-col items-center gap-3 text-center px-4 bg-white border border-[#d0d7e8] rounded-2xl shadow-sm">
                                <div className="bg-[#f4f6fb] rounded-2xl p-4 text-[#7a87a8]">
                                    <KeyRound size={32} />
                                </div>
                                <p className="text-[15px] font-semibold text-[#0f1623]">No roles yet</p>
                                <p className="text-[13px] text-[#7a87a8]">Create your first role to start assigning permissions.</p>
                                <div className="flex gap-2 mt-2">
                                    <button
                                        type="button"
                                        onClick={handleOpenCreateModal}
                                        className="bg-[#4f46e5] hover:bg-[#3730a3] text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
                                    >
                                        <Plus size={15} />
                                        + New Role
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredRoles.map((role) => (
                                    <div
                                        key={role.id}
                                        className="group bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#4f46e5]/30 transition-all duration-200 flex flex-col h-full"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-10 h-10 rounded-xl bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center shrink-0">
                                                <Key size={18} />
                                            </div>
                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/dashboard/roles/${role.id}`)}
                                                    className="p-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#f0f9ff] hover:text-[#0ea5e9] hover:border-[#0ea5e9] transition-all"
                                                    title="View"
                                                >
                                                    <Eye size={14} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/dashboard/roles/${role.id}`)}
                                                    className="p-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#eef2ff] hover:text-[#6366f1] hover:border-[#6366f1] transition-all"
                                                    title="Edit"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                {!role.isSystem && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(role)}
                                                        className="p-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#fef2f2] hover:text-[#ef4444] hover:border-[#fca5a5] transition-all"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mb-4 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-sm font-bold text-[#0f172a] truncate">
                                                    {role.name}
                                                </h3>
                                                {role.isSystem ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#dbeafe] text-[#1d4ed8] uppercase tracking-wider">
                                                        System
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f1f5f9] text-[#475569] uppercase tracking-wider">
                                                        Custom
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[12px] text-[#64748b] line-clamp-2 leading-relaxed">
                                                {role.description || 'No description provided'}
                                            </p>
                                        </div>

                                        <div className="pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                                            <div className="flex gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-tight">Policies</span>
                                                    <span className="text-[13px] font-semibold text-[#334155]">{role._count?.rolePolicies || 0}</span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-tight">Users</span>
                                                    <span className="text-[13px] font-semibold text-[#334155]">{role._count?.userRoles || 0}</span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/dashboard/roles/${role.id}`)}
                                                className="text-[12px] font-bold text-[#4f46e5] hover:text-[#3730a3] transition-colors"
                                            >
                                                Manage Role →
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

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
                                    <div className="bg-[#4f46e5]/10 rounded-xl p-2 text-[#4f46e5]">
                                        <KeyRound size={20} />
                                    </div>
                                    <h2 className="text-[20px] font-bold text-[#0f172a]">Create New Role</h2>
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

                        <form onSubmit={handleCreate} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">
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
                                        className={`w-full rounded-xl border ${formErrors.name ? 'border-red-300' : 'border-[#d0d7e8]'} px-4 py-2.5 text-sm focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25 outline-none`}
                                    />
                                    {formErrors.name && <p className="mt-1.5 text-xs font-medium text-red-500">{formErrors.name}</p>}
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">
                                        ARN (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={arn}
                                        onChange={(e) => setArn(e.target.value)}
                                        placeholder="arn:aegismesh::role/..."
                                        className="w-full rounded-xl border border-[#d0d7e8] px-4 py-2.5 text-sm focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25 outline-none font-mono"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief description of the role's purpose"
                                        className="w-full rounded-xl border border-[#d0d7e8] px-4 py-2.5 text-sm focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25 outline-none resize-none"
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2 flex items-center gap-2">
                                        <Users size={14} /> Assign Users
                                    </label>
                                    <div className="border border-[#d0d7e8] rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-[#f8fafc]">
                                        {users.length === 0 ? (
                                            <p className="text-xs text-[#94a3b8] italic p-2">No users available</p>
                                        ) : users.map(user => (
                                            <label key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors border border-transparent hover:border-[#d0d7e8]">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedUsers.includes(user.id)}
                                                    onChange={() => toggleUser(user.id)}
                                                    className="w-4 h-4 rounded border-[#d0d7e8] text-[#4f46e5] focus:ring-[#4f46e5]/25"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[#0f172a] truncate">{user.firstName} {user.lastName}</p>
                                                    <p className="text-[11px] text-[#7a87a8] truncate">{user.email}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2 flex items-center gap-2">
                                        <FileText size={14} /> Attach Policies
                                    </label>
                                    <div className="border border-[#d0d7e8] rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-[#f8fafc]">
                                        {policies.length === 0 ? (
                                            <p className="text-xs text-[#94a3b8] italic p-2">No policies available</p>
                                        ) : policies.map(policy => (
                                            <label key={policy.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors border border-transparent hover:border-[#d0d7e8]">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPolicies.includes(policy.id)}
                                                    onChange={() => togglePolicy(policy.id)}
                                                    className="w-4 h-4 rounded border-[#d0d7e8] text-[#4f46e5] focus:ring-[#4f46e5]/25"
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-[#0f172a] truncate">{policy.name}</p>
                                                    <p className="text-[11px] text-[#7a87a8] truncate">{policy.effect}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t border-[#f0f2f8]">
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
