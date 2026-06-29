import { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, KeyRound, Plus, Sparkles, Users, X } from 'lucide-react';
import { rbacAPI, userAPI } from '../../services/api';
import RoleTemplates from '../../components/roles/RoleTemplates';
import { useEntityList } from '../../hooks/useEntityList';
import LoadingState from '../../components/common/LoadingState';
import EmptyState from '../../components/common/EmptyState';
import RoleRow from './RoleRow';
import RoleFilters from './RoleFilters';

export default function RolesList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [typeFilter, setTypeFilter] = useState('');

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [arn, setArn] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedPolicies, setSelectedPolicies] = useState([]);
    const [formErrors, setFormErrors] = useState({});

    const {
        data: roles,
        isLoading,
        isError,
        search,
        setSearch,
        createMutation,
        deleteMutation
    } = useEntityList({
        entityKey: 'roles',
        fetchFn: rbacAPI.getRoles,
        createFn: async (data) => {
            const roleResponse = await rbacAPI.createRole({
                name: data.name,
                description: data.description,
                arn: data.arn,
            });
            const roleId = roleResponse.data?.data?.id;
            
            if (roleId) {
                const userAssignments = data.userIds.map(userId => rbacAPI.assignUserRole(userId, roleId));
                const policyAttachments = data.policyIds.map(policyId => rbacAPI.attachPolicyToRole(roleId, policyId));
                
                await Promise.all([...userAssignments, ...policyAttachments]);
            }
            return roleResponse;
        },
        deleteFn: (id) => rbacAPI.deleteRole(id)
    });

    const handleCloseCreateModal = useCallback(() => {
        if (createMutation.isPending) return;
        setFormErrors({});
        setName('');
        setDescription('');
        setArn('');
        setSelectedUsers([]);
        setSelectedPolicies([]);
        setIsCreateOpen(false);
    }, [createMutation.isPending]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isCreateOpen) {
                handleCloseCreateModal();
            }
        };
        globalThis.addEventListener('keydown', handleKeyDown);
        return () => globalThis.removeEventListener('keydown', handleKeyDown);
    }, [isCreateOpen, handleCloseCreateModal]);

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

    const filteredRoles = useMemo(() => {
        if (!typeFilter) return roles;
        if (typeFilter === 'SYSTEM') return roles.filter((role) => role.isSystem);
        return roles.filter((role) => !role.isSystem);
    }, [roles, typeFilter]);

    const handleOpenCreateModal = () => {
        setFormErrors({});
        setIsCreateOpen(true);
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
        handleCloseCreateModal();
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

    const handleDelete = (roleId) => {
        deleteMutation.mutate(roleId);
    };

    const handleTemplateSuccess = (role) => {
        queryClient.invalidateQueries(['roles']);
        setIsTemplatesOpen(false);

        if (role?.id) {
            navigate(`/dashboard/roles/${role.id}`);
        }
    };

    const renderRolesContent = () => {
        if (isLoading) {
            return <LoadingState message="Loading roles..." />;
        }

        if (isError) {
            return <div className="py-16 text-center text-sm text-red-500">Failed to load roles.</div>;
        }

        if (filteredRoles.length === 0) {
            return (
                <EmptyState
                    icon={KeyRound}
                    title="No roles yet"
                    description="Create your first role to start assigning permissions."
                    actionLabel="New Role"
                    onAction={handleOpenCreateModal}
                />
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRoles.map((role) => (
                    <RoleRow key={role.id} role={role} onDelete={handleDelete} />
                ))}
            </div>
        );
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

                    <RoleFilters
                        search={search}
                        onSearchChange={setSearch}
                        typeFilter={typeFilter}
                        onTypeFilterChange={setTypeFilter}
                    />

                    <div className="w-full">
                        {renderRolesContent()}
                    </div>
                </div>

            {isCreateOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <button
                        type="button"
                        className="fixed inset-0 bg-[#0f1623]/40 backdrop-blur-sm animate-in fade-in duration-200 cursor-default"
                        onClick={handleCloseCreateModal}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleCloseCreateModal();
                            }
                        }}
                        aria-label="Close modal"
                    />
                    <dialog
                        open
                        className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#dbe4f0] bg-white p-0 shadow-2xl animate-in zoom-in duration-200"
                        aria-modal="true"
                        aria-labelledby="create-role-title"
                    >
                        <div className="border-b border-[#eef2f7] bg-[#f8faff] px-8 py-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-[#4f46e5]/10 rounded-xl p-2 text-[#4f46e5]">
                                        <KeyRound size={20} />
                                    </div>
                                    <h2 id="create-role-title" className="text-[20px] font-bold text-[#0f172a]">Create New Role</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCloseCreateModal}
                                    className="rounded-lg p-2 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#0f172a] transition-all"
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleCreate} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto" noValidate>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                <div className="col-span-2 sm:col-span-1">
                                    <label htmlFor="role-name" className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">
                                        Role Name
                                    </label>
                                    <input
                                        id="role-name"
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
                                    <label htmlFor="role-arn" className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">
                                        ARN (Optional)
                                    </label>
                                    <input
                                        id="role-arn"
                                        type="text"
                                        value={arn}
                                        onChange={(e) => setArn(e.target.value)}
                                        placeholder="arn:aegismesh::role/..."
                                        className="w-full rounded-xl border border-[#d0d7e8] px-4 py-2.5 text-sm focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25 outline-none font-mono"
                                    />
                                </div>

                                <div className="col-span-2">
                                    <label htmlFor="role-description" className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        id="role-description"
                                        rows={2}
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief description of the role's purpose"
                                        className="w-full rounded-xl border border-[#d0d7e8] px-4 py-2.5 text-sm focus:border-[#4f46e5] focus:ring-2 focus:ring-[#4f46e5]/25 outline-none resize-none"
                                    />
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <fieldset className="border border-[#d0d7e8] rounded-xl p-4 bg-[#f8fafc]">
                                        <legend className="px-2 text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-2">
                                            <Users size={14} /> Assign Users
                                        </legend>
                                        <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                                            {users.length === 0 ? (
                                                <p className="text-xs text-[#94a3b8] italic p-2">No users available</p>
                                            ) : users.map(user => (
                                                <label key={user.id} aria-label={`${user.firstName} ${user.lastName}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors border border-transparent hover:border-[#d0d7e8]">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedUsers.includes(user.id)}
                                                        onChange={() => toggleUser(user.id)}
                                                        aria-label={`Select user ${user.firstName} ${user.lastName}`}
                                                        className="w-4 h-4 rounded border-[#d0d7e8] text-[#4f46e5] focus:ring-[#4f46e5]/25"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-[#0f172a] truncate">{user.firstName} {user.lastName}</p>
                                                        <p className="text-[11px] text-[#7a87a8] truncate">{user.email}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                </div>

                                <div className="col-span-2 sm:col-span-1">
                                    <fieldset className="border border-[#d0d7e8] rounded-xl p-4 bg-[#f8fafc]">
                                        <legend className="px-2 text-xs font-bold uppercase tracking-wider text-[#64748b] flex items-center gap-2">
                                            <FileText size={14} /> Attach Policies
                                        </legend>
                                        <div className="mt-2 max-h-48 overflow-y-auto space-y-2">
                                            {policies.length === 0 ? (
                                                <p className="text-xs text-[#94a3b8] italic p-2">No policies available</p>
                                            ) : policies.map(policy => (
                                                <label key={policy.id} aria-label={`Policy ${policy.name}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors border border-transparent hover:border-[#d0d7e8]">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPolicies.includes(policy.id)}
                                                        onChange={() => togglePolicy(policy.id)}
                                                        aria-label={`Select policy ${policy.name}`}
                                                        className="w-4 h-4 rounded border-[#d0d7e8] text-[#4f46e5] focus:ring-[#4f46e5]/25"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-[#0f172a] truncate">{policy.name}</p>
                                                        <p className="text-[11px] text-[#7a87a8] truncate">{policy.effect}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
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
                    </dialog>
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
