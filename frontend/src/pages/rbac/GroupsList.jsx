import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { KeyRound, Layers, Pencil, Search, Trash2, Users, X } from 'lucide-react';
import { rbacAPI, userAPI } from '../../services/api';
import toast from 'react-hot-toast';

export default function GroupsList() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [arn, setArn] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [errors, setErrors] = useState({});

    const { data: groupsData, isLoading } = useQuery({
        queryKey: ['groups'],
        queryFn: () => rbacAPI.getGroups(),
    });

    const { data: usersData } = useQuery({
        queryKey: ['users-for-group-creation'],
        queryFn: () => userAPI.getUsers({ limit: 100 }),
        enabled: showForm,
    });

    const { data: rolesData } = useQuery({
        queryKey: ['roles-for-group-creation'],
        queryFn: () => rbacAPI.getRoles({ limit: 100 }),
        enabled: showForm,
    });

    const users = usersData?.data?.data?.users || [];
    const rolesList = rolesData?.data?.data || [];

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const groupResponse = await rbacAPI.createGroup({
                name: data.name,
                description: data.description,
                arn: data.arn,
            });
            const groupId = groupResponse.data?.data?.id;
            
            if (groupId) {
                // Attach users and roles in parallel for efficiency
                const memberAssignments = data.userIds.map(userId => rbacAPI.addGroupMember(groupId, userId));
                const roleAttachments = data.roleIds.map(roleId => rbacAPI.attachRoleToGroup(groupId, roleId));
                
                await Promise.all([...memberAssignments, ...roleAttachments]);
            }
            return groupResponse;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['groups']);
            toast.success('Group created successfully');
            handleCloseForm();
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to create group');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => rbacAPI.deleteGroup(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['groups']);
            toast.success('Group deleted');
        },
        onError: (err) => {
            toast.error(err.response?.data?.error || 'Failed to delete group');
        }
    });

    const handleCreate = (e) => {
        e.preventDefault();
        const newErrors = {};
        
        if (!name.trim()) {
            newErrors.name = 'Group name is required';
        }
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        
        setErrors({});
        createMutation.mutate({ 
            name: name.trim(), 
            description: description.trim(),
            arn: arn.trim(),
            userIds: selectedUsers,
            roleIds: selectedRoles
        });
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setName('');
        setDescription('');
        setArn('');
        setSelectedUsers([]);
        setSelectedRoles([]);
        setErrors({});
    };

    const toggleUser = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const toggleRole = (roleId) => {
        setSelectedRoles(prev => 
            prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
        );
    };

    const groups = groupsData?.data?.data || [];

    return (
        <div className="w-full">
                {/* Page Header */}
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-[20px] font-semibold text-[#0f1623]">Groups</h1>
                        <p className="text-[13px] text-[#7a87a8] mt-1">Organize users into groups and assign roles collectively.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="w-full rounded-xl bg-[#4f46e5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3730a3] sm:w-auto"
                    >
                        + New Group
                    </button>
                </div>

                {showForm ? (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1623]/45 backdrop-blur-sm p-4 animate-in fade-in duration-200"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) {
                                handleCloseForm();
                            }
                        }}
                    >
                        <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in zoom-in duration-200" onMouseDown={(event) => event.stopPropagation()}>
                            <div className="px-8 py-6 border-b border-[#f0f2f8] flex items-center justify-between bg-[#f8faff]">
                                <div className="flex items-center gap-3">
                                    <div className="bg-[#4f46e5]/10 rounded-xl p-2 inline-flex">
                                        <Layers size={20} className="text-[#4f46e5]" />
                                    </div>
                                    <h2 className="text-[20px] font-bold text-[#0f1623]">Create New Group</h2>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleCloseForm}
                                    className="text-[#7a87a8] hover:text-[#0f1623] p-2 rounded-lg hover:bg-[#f4f6fb] transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="p-8 space-y-6 max-h-[75vh] overflow-y-auto">
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">Group Name</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => {
                                                setName(e.target.value);
                                                if (errors.name) {
                                                    setErrors({ ...errors, name: '' });
                                                }
                                            }}
                                            placeholder="e.g. Administrators"
                                            className={`w-full border ${errors.name ? 'border-red-300' : 'border-[#d0d7e8]'} rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] text-[#0f1623] placeholder-[#b8c2d8]`}
                                        />
                                        {errors.name && (
                                            <p className="text-[#dc2626] text-xs mt-1">{errors.name}</p>
                                        )}
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">ARN (Optional)</label>
                                        <input
                                            type="text"
                                            value={arn}
                                            onChange={(e) => setArn(e.target.value)}
                                            placeholder="arn:aegismesh::group/..."
                                            className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] text-[#0f1623] placeholder-[#b8c2d8] font-mono"
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2">Description</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Brief description of the group's purpose"
                                            rows={2}
                                            className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] text-[#0f1623] placeholder-[#b8c2d8] resize-none"
                                        />
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-[#64748b] mb-2 flex items-center gap-2">
                                            <Users size={14} /> Assign Members
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
                                            <KeyRound size={14} /> Assign Roles
                                        </label>
                                        <div className="border border-[#d0d7e8] rounded-xl p-3 max-h-48 overflow-y-auto space-y-2 bg-[#f8fafc]">
                                            {rolesList.length === 0 ? (
                                                <p className="text-xs text-[#94a3b8] italic p-2">No roles available</p>
                                            ) : rolesList.map(role => (
                                                <label key={role.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white cursor-pointer transition-colors border border-transparent hover:border-[#d0d7e8]">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRoles.includes(role.id)}
                                                        onChange={() => toggleRole(role.id)}
                                                        className="w-4 h-4 rounded border-[#d0d7e8] text-[#4f46e5] focus:ring-[#4f46e5]/25"
                                                    />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-[#0f172a] truncate">{role.name}</p>
                                                        <p className="text-[11px] text-[#7a87a8] truncate">{role.isSystem ? 'System' : 'Custom'}</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-[#f0f2f8]">
                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        className="rounded-xl border border-[#d0d7e8] px-6 py-2.5 text-sm font-bold text-[#334155] hover:bg-[#f8faff] transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending}
                                        className="rounded-xl bg-[#4f46e5] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 hover:bg-[#3730a3] transition-all disabled:opacity-50"
                                    >
                                        {createMutation.isPending ? 'Creating...' : 'Create Group'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : null}

                {/* Groups Grid */}
                {isLoading ? (
                    <div className="py-24 text-center">
                        <div className="inline-block w-8 h-8 border-3 border-[#4f46e5] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-sm text-[#7a87a8]">Loading groups...</p>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="py-16 flex flex-col items-center gap-3 text-center px-4 bg-white border border-[#d0d7e8] rounded-2xl shadow-sm">
                        <div className="bg-[#f4f6fb] rounded-2xl p-4 text-[#7a87a8]">
                            <Layers size={32} />
                        </div>
                        <p className="text-[15px] font-semibold text-[#0f1623]">No groups yet</p>
                        <p className="text-[13px] text-[#7a87a8]">Create your first group to organize users and assign roles.</p>
                        <button
                            type="button"
                            onClick={() => setShowForm(true)}
                            className="mt-2 bg-[#4f46e5] hover:bg-[#3730a3] text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
                        >
                            + New Group
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups.map((group) => (
                            <div
                                key={group.id}
                                className="group bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#4f46e5]/30 transition-all duration-200 flex flex-col h-full"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#ede9fe] text-[#7c3aed] flex items-center justify-center shrink-0">
                                        <Layers size={18} />
                                    </div>
                                    <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Link
                                            to={`/dashboard/groups/${group.id}`}
                                            className="p-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#eef2ff] hover:text-[#6366f1] hover:border-[#6366f1] transition-all"
                                            title="Edit"
                                        >
                                            <Pencil size={14} />
                                        </Link>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (window.confirm(`Are you sure you want to delete "${group.name}"?`)) {
                                                    deleteMutation.mutate(group.id);
                                                }
                                            }}
                                            className="p-2 rounded-lg border border-[#e2e8f0] text-[#64748b] hover:bg-[#fef2f2] hover:text-[#ef4444] hover:border-[#fca5a5] transition-all"
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>

                                <div className="mb-4 flex-1">
                                    <h3 className="text-sm font-bold text-[#0f172a] mb-1 truncate">
                                        {group.name}
                                    </h3>
                                    <p className="text-[12px] text-[#64748b] line-clamp-2 leading-relaxed">
                                        {group.description || 'No description provided'}
                                    </p>
                                </div>

                                <div className="pt-4 border-t border-[#f1f5f9] flex items-center justify-between">
                                    <div className="flex gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-tight">Members</span>
                                            <span className="text-[13px] font-semibold text-[#334155]">{group._count?.userGroups || 0}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-tight">Roles</span>
                                            <span className="text-[13px] font-semibold text-[#334155]">{group._count?.groupRoles || 0}</span>
                                        </div>
                                    </div>
                                    <Link
                                        to={`/dashboard/groups/${group.id}`}
                                        className="text-[12px] font-bold text-[#4f46e5] hover:text-[#3730a3] transition-colors"
                                    >
                                        Manage Group →
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
        </div>
    );
}
