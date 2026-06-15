import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Layers, Pencil, Trash2, X } from 'lucide-react';
import { rbacAPI } from '../../services/api';

export default function GroupsList() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [errors, setErrors] = useState({});

    const { data: groupsData, isLoading } = useQuery({
        queryKey: ['groups'],
        queryFn: () => rbacAPI.getGroups(),
    });

    const createMutation = useMutation({
        mutationFn: (data) => rbacAPI.createGroup(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['groups']);
            setName('');
            setDescription('');
            setErrors({});
            setShowForm(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: (id) => rbacAPI.deleteGroup(id),
        onSuccess: () => queryClient.invalidateQueries(['groups'])
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
        createMutation.mutate({ name: name.trim(), description: description.trim() });
    };

    const handleCloseForm = () => {
        setShowForm(false);
        setName('');
        setDescription('');
        setErrors({});
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
                        onClick={() => setShowForm(true)}
                        className="w-full rounded-xl bg-[#4f46e5] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#3730a3] sm:w-auto"
                    >
                        + New Group
                    </button>
                </div>

                {showForm ? (
                    <div
                        className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f1623]/45 backdrop-blur-sm p-0 sm:items-center sm:p-4"
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) {
                                handleCloseForm();
                            }
                        }}
                    >
                        <div className="mx-4 w-full max-w-3xl overflow-hidden rounded-t-[20px] bg-white shadow-2xl sm:mx-0 sm:rounded-2xl" onMouseDown={(event) => event.stopPropagation()}>
                            <div className="px-6 py-5 border-b border-[#f0f2f8] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-[#4f46e5]/10 rounded-lg p-2 inline-flex">
                                        <Layers size={18} className="text-[#4f46e5]" />
                                    </div>
                                    <h2 className="text-[18px] font-semibold text-[#0f1623]">Create New Group</h2>
                                </div>
                                <button
                                    onClick={handleCloseForm}
                                    className="text-[#7a87a8] hover:text-[#0f1623] p-1.5 rounded-lg hover:bg-[#f4f6fb] transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleCreate} className="space-y-5 px-6 py-5">
                                <div>
                                    <label className="block text-[12px] font-semibold text-[#3a4560] mb-2">Group Name</label>
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
                                        className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] text-[#0f1623] placeholder-[#b8c2d8]"
                                    />
                                    {errors.name && (
                                        <p className="text-[#dc2626] text-xs mt-1">{errors.name}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[12px] font-semibold text-[#3a4560] mb-2">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Brief description of the group's purpose"
                                        rows={4}
                                        className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/30 focus:border-[#4f46e5] text-[#0f1623] placeholder-[#b8c2d8] resize-none"
                                    />
                                </div>

                                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={handleCloseForm}
                                        className="text-[#3a4560] hover:text-[#0f1623] hover:bg-[#f4f6fb] border border-[#d0d7e8] rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createMutation.isPending}
                                        className="bg-[#4f46e5] hover:bg-[#3730a3] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
                                    >
                                        {createMutation.isPending ? 'Creating...' : 'Create Group'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                ) : null}

                {/* Groups Table */}
                {isLoading ? (
                    <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm py-16 flex justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-[#7a87a8] text-sm">Loading groups...</p>
                        </div>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm py-16 flex flex-col items-center gap-3">
                        <div className="bg-[#f4f6fb] rounded-2xl p-4">
                            <Layers size={32} className="text-[#7a87a8]" />
                        </div>
                        <p className="text-[15px] font-semibold text-[#0f1623]">No groups yet</p>
                        <p className="text-[13px] text-[#7a87a8]">Create your first group to organize users and assign roles.</p>
                        <button
                            onClick={() => setShowForm(true)}
                            className="mt-2 bg-[#4f46e5] hover:bg-[#3730a3] text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
                        >
                            + New Group
                        </button>
                    </div>
                ) : (
                    <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="min-w-[600px] w-full border-collapse table-fixed">
                            <colgroup>
                                <col style={{ width: '40%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '15%' }} />
                            </colgroup>
                            <thead>
                                <tr className="h-10 border-b border-[#e2e8f0] bg-[#f8fafc]">
                                    <th className="h-10 px-4 text-left align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">GROUP NAME</th>
                                    <th className="h-10 px-4 text-center align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">MEMBERS</th>
                                    <th className="h-10 px-4 text-center align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">ROLES</th>
                                    <th className="h-10 px-4 text-center align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">CREATED</th>
                                    <th className="h-10 px-4 text-center align-middle text-[11px] font-semibold tracking-[0.06em] uppercase text-[#94a3b8] whitespace-nowrap">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groups.map((group) => (
                                    <tr
                                        key={group.id}
                                        className="h-16 border-b border-[#f1f5f9] hover:bg-[#f8fafc] transition-colors duration-100"
                                    >
                                        <td className="h-16 px-4 align-middle overflow-hidden">
                                            <div className="flex items-center gap-3 h-16 min-w-0">
                                                <div className="w-8 h-8 rounded-lg bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center shrink-0">
                                                    <Layers size={14} />
                                                </div>
                                                <Link to={`/dashboard/groups/${group.id}`} className="block min-w-0 flex-1">
                                                    <p className="text-[13px] font-semibold text-[#0f172a] leading-[1.3] whitespace-nowrap overflow-hidden text-ellipsis hover:text-[#4f46e5] transition-colors">
                                                        {group.name}
                                                    </p>
                                                    <p className="text-[11px] text-[#94a3b8] whitespace-nowrap overflow-hidden text-ellipsis">
                                                        {group.description || '—'}
                                                    </p>
                                                </Link>
                                            </div>
                                        </td>

                                        <td className="h-16 px-4 align-middle overflow-hidden text-center">
                                            <span className="inline-flex items-center justify-center bg-[#ede9fe] text-[#7c3aed] rounded-[20px] px-[10px] py-[3px] text-[11px] font-semibold whitespace-nowrap">
                                                {group._count?.userGroups || 0}
                                            </span>
                                        </td>

                                        <td className="h-16 px-4 align-middle overflow-hidden text-center">
                                            <span className="inline-flex items-center justify-center bg-[#dcfce7] text-[#16a34a] rounded-[20px] px-[10px] py-[3px] text-[11px] font-semibold whitespace-nowrap">
                                                {group._count?.groupRoles || 0}
                                            </span>
                                        </td>

                                        <td className="h-16 px-4 align-middle overflow-hidden text-center">
                                            <p className="text-[12px] text-[#64748b] whitespace-nowrap">
                                                {group.createdAt ? new Date(group.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                                            </p>
                                        </td>

                                        <td className="h-16 px-4 align-middle overflow-hidden text-center">
                                            <div className="flex items-center justify-center gap-[6px]">
                                                <Link
                                                    to={`/dashboard/groups/${group.id}`}
                                                    className="w-7 h-7 rounded-[7px] border border-[#e2e8f0] bg-white text-[#94a3b8] flex items-center justify-center cursor-pointer transition-all duration-150 hover:border-[#6366f1] hover:text-[#6366f1] hover:bg-[#eef2ff]"
                                                    title="Edit"
                                                >
                                                    <Pencil size={13} />
                                                </Link>
                                                <button
                                                    onClick={() => {
                                                        if (globalThis.confirm(`Are you sure you want to delete "${group.name}"?`)) {
                                                            deleteMutation.mutate(group.id);
                                                        }
                                                    }}
                                                    className="w-7 h-7 rounded-[7px] border border-[#e2e8f0] bg-white text-[#94a3b8] flex items-center justify-center cursor-pointer transition-all duration-150 hover:border-[#fca5a5] hover:text-[#ef4444] hover:bg-[#fef2f2]"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            </table>
                        </div>
                    </div>
                )}
        </div>
    );
}


