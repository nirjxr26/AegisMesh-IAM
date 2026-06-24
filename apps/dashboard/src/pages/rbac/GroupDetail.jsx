import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Layers, Copy, Check, Edit2, X, ChevronDown, KeyRound } from 'lucide-react';
import { rbacAPI, userAPI } from '../../services/api';
import { useDebounce } from '../../hooks/useDebounce';

export default function GroupDetail() {
    const { id: groupId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [selectedRole, setSelectedRole] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [selectedMemberId, setSelectedMemberId] = useState('');
    const [copiedArn, setCopiedArn] = useState(false);
    const debouncedUserSearch = useDebounce(searchInput, 300);

    useEffect(() => {
        if (!groupId) {
            navigate('/dashboard/groups');
        }
    }, [groupId, navigate]);

    const { data: groupData, isLoading: groupLoading, error: groupError, refetch: refetchGroup } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => rbacAPI.getGroup(groupId),
        enabled: !!groupId,
    });

    const { data: rolesData } = useQuery({
        queryKey: ['roles'],
        queryFn: () => rbacAPI.getRoles({ limit: 100 }),
    });

    const { data: usersData, isFetching: isSearchingUsers } = useQuery({
        queryKey: ['group-member-search', debouncedUserSearch],
        queryFn: () => userAPI.getUsers({ search: debouncedUserSearch, page: 1, limit: 8 }).then((res) => res.data?.data || []),
        enabled: debouncedUserSearch.trim().length >= 2,
    });

    const addMemberMutation = useMutation({
        mutationFn: (userId) => rbacAPI.addGroupMember(groupId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group', groupId] });
            setSearchInput('');
            setSelectedMemberId('');
        },
        onError: (err) => alert(err.response?.data?.error?.message || 'Error adding member')
    });

    const removeMemberMutation = useMutation({
        mutationFn: (userId) => rbacAPI.removeGroupMember(groupId, userId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', groupId] }),
    });

    const attachRoleMutation = useMutation({
        mutationFn: (roleId) => rbacAPI.attachRoleToGroup(groupId, roleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['group', groupId] });
            setSelectedRole('');
        },
    });

    const detachRoleMutation = useMutation({
        mutationFn: (roleId) => rbacAPI.detachRoleFromGroup(groupId, roleId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group', groupId] }),
    });

    const deleteGroupMutation = useMutation({
        mutationFn: () => rbacAPI.deleteGroup(groupId),
        onSuccess: () => navigate('/dashboard/groups'),
        onError: (err) => alert(err.response?.data?.error?.message || 'Error deleting group')
    });

    const handleCopyArn = () => {
        const arn = `arn:aws:iam::account:group/${group.name}`;
        navigator.clipboard.writeText(arn);
        setCopiedArn(true);
        setTimeout(() => setCopiedArn(false), 1500);
    };

    const group = groupData?.data?.data || null;
    const allRoles = rolesData?.data?.data || [];
    const existingMemberIds = useMemo(() => {
        return new Set((group?.userGroups || []).map((entry) => entry.user?.id).filter(Boolean));
    }, [group]);
    const availableUsers = useMemo(() => {
        const items = usersData || [];
        return items.filter((user) => !existingMemberIds.has(user.id));
    }, [existingMemberIds, usersData]);

    if (!groupId) {
        return null;
    }

    if (groupLoading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-4">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[#7a87a8] text-sm">Loading group details...</p>
                </div>
            </div>
        );
    }

    if (groupError) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-red-500 text-sm">Failed to load group</p>
                    <button
                        type="button"
                        onClick={() => refetchGroup()}
                        className="mt-3 px-3 py-1.5 rounded-lg border border-[#d0d7e8] text-sm text-[#3a4560] hover:bg-[#f4f6fb]"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!group) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center px-4">
                <div className="text-center">
                    <p className="text-red-500 text-sm">Group not found</p>
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard/groups')}
                        className="mt-3 px-3 py-1.5 rounded-lg border border-[#d0d7e8] text-sm text-[#3a4560] hover:bg-[#f4f6fb]"
                    >
                        Back to Groups
                    </button>
                </div>
            </div>
        );
    }

    const attachedRoleIds = new Set(group.groupRoles?.map(gr => gr.role.id));
    const availableRoles = allRoles.filter(r => !attachedRoleIds.has(r.id));
    const arn = `arn:aws:iam::account:group/${group.name}`;

    // Get user initials
    const getInitials = (firstName, lastName) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
    };

    const truncateId = (id) => {
        return id ? `${id.substring(0, 8)}...` : '';
    };

    let dropdownContent = null;
    if (searchInput.trim().length >= 2) {
        if (isSearchingUsers) {
            dropdownContent = <div className="px-3 py-2 text-xs text-[#7a87a8]">Searching users...</div>;
        } else if (availableUsers.length > 0) {
            dropdownContent = availableUsers.map((user) => {
                const isSelected = selectedMemberId === user.id;
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email;

                return (
                    <button
                        key={user.id}
                        type="button"
                        onClick={() => {
                            setSelectedMemberId(user.id);
                            setSearchInput(fullName);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm border-b border-[#f0f2f8] last:border-b-0 ${isSelected ? 'bg-[#4f46e5]/8 text-[#4f46e5]' : 'hover:bg-[#f8f9fd] text-[#3a4560]'}`}
                    >
                        <div className="font-medium">{fullName}</div>
                        <div className="text-xs text-[#7a87a8]">{user.email}</div>
                    </button>
                );
            });
        } else {
            dropdownContent = <div className="px-3 py-2 text-xs text-[#7a87a8]">No matching users found</div>;
        }
    }

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Back Navigation */}
                <Link
                    to="/dashboard/groups"
                    className="flex items-center gap-1.5 text-sm text-[#7a87a8] hover:text-[#4f46e5] transition-colors mb-5 w-fit cursor-pointer group"
                >
                    <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
                    Back to Groups
                </Link>

                {/* Page Header Card */}
                <div className="bg-white border border-[#d0d7e8] rounded-2xl px-7 py-5 mb-6 shadow-sm">
                    <div className="flex items-start justify-between">
                        {/* Left Cluster */}
                        <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className="bg-[#4f46e5]/10 rounded-xl p-2.5 inline-flex mt-1">
                                <Layers size={20} className="text-[#4f46e5]" />
                            </div>

                            {/* Content */}
                            <div>
                                <h1 className="text-[22px] font-bold text-[#0f1623]">{group.name}</h1>
                                <p className="text-[13px] text-[#7a87a8] mt-1">{group.description || 'No description provided'}</p>

                                {/* ARN */}
                                <div className="mt-3 font-mono text-xs text-[#3a4560] bg-[#f4f6fb] border border-[#d0d7e8] rounded-lg px-3 py-1.5 inline-flex items-center gap-2">
                                    <code>{arn}</code>
                                    <button
                                        onClick={handleCopyArn}
                                        className="ml-1 inline-flex items-center justify-center transition-colors hover:text-[#4f46e5]"
                                        title="Copy ARN"
                                    >
                                        {copiedArn ? (
                                            <Check size={12} className="text-green-500" />
                                        ) : (
                                            <Copy size={12} className="text-[#7a87a8]" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Cluster - Action Buttons */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                disabled
                                className="border border-[#d0d7e8] text-[#9aa4bb] rounded-xl px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 cursor-not-allowed"
                                title="Edit Group is not available yet"
                            >
                                <Edit2 size={14} />
                                Edit Group
                            </button>
                            <button
                                onClick={() => {
                                    if (globalThis.confirm(`Are you sure you want to delete "${group.name}"?`)) {
                                        deleteGroupMutation.mutate();
                                    }
                                }}
                                disabled={deleteGroupMutation.isPending}
                                className="border border-red-200 text-red-500 hover:bg-red-50 rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                                title="Delete Group"
                            >
                                Delete Group
                            </button>
                        </div>
                    </div>
                </div>

                {/* Two-Column Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* LEFT CARD - Group Members */}
                    <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm">
                        {/* Card Header */}
                        <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center justify-between">
                            <p className="text-[15px] font-semibold text-[#0f1623]">Group Members</p>
                            <span className="bg-[#4f46e5]/8 text-[#4f46e5] text-xs font-semibold px-2.5 py-1 rounded-full">
                                {group.userGroups.length} Users
                            </span>
                        </div>

                        {/* Add Member Row */}
                        <div className="px-6 py-4 border-b border-[#f0f2f8] flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    placeholder="Search users by name or email"
                                    value={searchInput}
                                    onChange={(e) => {
                                        setSearchInput(e.target.value);
                                        setSelectedMemberId('');
                                    }}
                                    className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm placeholder:text-[#7a87a8] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] text-[#0f1623]"
                                />

                                {searchInput.trim().length >= 2 && (
                                    <div className="absolute z-20 mt-2 w-full rounded-xl border border-[#d0d7e8] bg-white shadow-lg overflow-hidden">
                                        {dropdownContent}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => selectedMemberId && addMemberMutation.mutate(selectedMemberId)}
                                disabled={!selectedMemberId || addMemberMutation.isPending}
                                className="bg-[#4f46e5] hover:bg-[#3730a3] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                            >
                                Add
                            </button>
                        </div>

                        {/* Member List */}
                        {group.userGroups.length === 0 ? (
                            <div className="px-6 py-8 text-center">
                                <p className="text-[#7a87a8] text-sm">No members in this group yet</p>
                            </div>
                        ) : (
                            <div>
                                {group.userGroups.map(({ user }, index) => (
                                    <div
                                        key={user.id}
                                        className={`px-6 py-3.5 flex items-center justify-between hover:bg-[#f8f9fd] transition-colors ${
                                            index === group.userGroups.length - 1 ? '' : 'border-b border-[#f0f2f8]'
                                        }`}
                                    >
                                        {/* User Info */}
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="w-8 h-8 rounded-full bg-[#4f46e5]/10 text-[#4f46e5] text-xs font-bold flex items-center justify-center shrink-0">
                                                {getInitials(user.firstName, user.lastName)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[14px] font-semibold text-[#0f1623]">{user.firstName} {user.lastName}</p>
                                                <p className="text-[11px] font-mono text-[#7a87a8]">{truncateId(user.id)}</p>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Link
                                                to={`/dashboard/users/${user.id}`}
                                                className="bg-[#f4f6fb] hover:bg-[#e6eaf4] border border-[#d0d7e8] text-[#3a4560] text-xs px-3 py-1.5 rounded-lg transition-colors font-medium"
                                            >
                                                View
                                            </Link>
                                            <button
                                                onClick={() => {
                                                    if (globalThis.confirm(`Remove ${user.firstName} ${user.lastName}?`)) {
                                                        removeMemberMutation.mutate(user.id);
                                                    }
                                                }}
                                                className="border border-[#d0d7e8] text-[#3a4560] hover:bg-red-50 hover:border-red-200 hover:text-red-500 rounded-lg p-1.5 transition-colors"
                                                title="Remove member"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* RIGHT CARD - Attached Roles */}
                    <div className="bg-white border border-[#d0d7e8] rounded-2xl overflow-hidden shadow-sm">
                        {/* Card Header */}
                        <div className="px-6 py-4 border-b border-[#f0f2f8] flex items-center justify-between">
                            <p className="text-[15px] font-semibold text-[#0f1623]">Attached Roles</p>
                            <span className="bg-[#16a34a]/8 text-[#16a34a] text-xs font-semibold px-2.5 py-1 rounded-full">
                                {group.groupRoles.length} Roles
                            </span>
                        </div>

                        {/* Attach Role Row */}
                        <div className="px-6 py-4 border-b border-[#f0f2f8] flex gap-2">
                            <div className="flex-1 relative">
                                <select
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    className="w-full border border-[#d0d7e8] rounded-xl px-4 py-2.5 text-sm bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] text-[#0f1623]"
                                >
                                    <option value="">Select a role</option>
                                    {availableRoles.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#7a87a8] pointer-events-none" />
                            </div>
                            <button
                                onClick={() => selectedRole && attachRoleMutation.mutate(selectedRole)}
                                disabled={!selectedRole || attachRoleMutation.isPending}
                                className="bg-[#4f46e5] hover:bg-[#3730a3] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
                            >
                                Attach
                            </button>
                        </div>

                        {/* Roles List */}
                        {group.groupRoles.length === 0 ? (
                            <div className="px-6 py-12 flex flex-col items-center gap-2 text-center">
                                <div className="bg-[#f4f6fb] rounded-2xl p-3 inline-flex">
                                    <KeyRound size={24} className="text-[#7a87a8]" />
                                </div>
                                <p className="text-[14px] font-semibold text-[#0f1623]">No roles attached</p>
                                <p className="text-[12px] text-[#7a87a8]">Attach a role to grant this group permissions.</p>
                            </div>
                        ) : (
                            <div>
                                {group.groupRoles.map(({ role }, index) => (
                                    <div
                                        key={role.id}
                                        className={`px-6 py-3.5 flex items-center justify-between hover:bg-[#f8f9fd] transition-colors ${
                                            index === group.groupRoles.length - 1 ? '' : 'border-b border-[#f0f2f8]'
                                        }`}
                                    >
                                        {/* Role Info */}
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-[#16a34a]/10 text-[#16a34a] text-xs font-bold flex items-center justify-center shrink-0">
                                                R
                                            </div>
                                            <div className="min-w-0">
                                                <Link
                                                    to={`/dashboard/roles/${role.id}`}
                                                    className="text-[14px] font-semibold text-[#4f46e5] hover:text-[#3730a3] transition-colors block truncate"
                                                >
                                                    {role.name}
                                                </Link>
                                                <p className="text-[11px] text-[#7a87a8] truncate">{role.description || '—'}</p>
                                            </div>
                                        </div>

                                        {/* Detach Button */}
                                        <button
                                            onClick={() => {
                                                if (globalThis.confirm(`Detach role "${role.name}"?`)) {
                                                    detachRoleMutation.mutate(role.id);
                                                }
                                            }}
                                            className="border border-[#d0d7e8] text-[#3a4560] hover:bg-red-50 hover:border-red-200 hover:text-red-500 rounded-lg p-1.5 transition-colors shrink-0 ml-2"
                                            title="Detach role"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

GroupDetail.propTypes = {
    // No direct props as it uses useParams
};
