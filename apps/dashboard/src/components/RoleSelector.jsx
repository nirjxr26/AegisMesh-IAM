import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rbacAPI } from '../services/api';

export default function RoleSelector({ userId }) {
    const queryClient = useQueryClient();
    const [selectedRole, setSelectedRole] = useState('');

    const { data: allRolesData } = useQuery({
        queryKey: ['roles'],
        queryFn: () => rbacAPI.getRoles({ limit: 100 })
    });

    const { data: userRolesData } = useQuery({
        queryKey: ['userRoles', userId],
        queryFn: () => rbacAPI.getUserRoles(userId)
    });

    const assignMutation = useMutation({
        mutationFn: (roleId) => rbacAPI.assignUserRole(userId, roleId),
        onSuccess: () => {
            queryClient.invalidateQueries(['userRoles', userId]);
            queryClient.invalidateQueries(['userPermissions', userId]);
            setSelectedRole('');
        }
    });

    const removeMutation = useMutation({
        mutationFn: (roleId) => rbacAPI.removeUserRole(userId, roleId),
        onSuccess: () => {
            queryClient.invalidateQueries(['userRoles', userId]);
            queryClient.invalidateQueries(['userPermissions', userId]);
        }
    });

    const handleAssign = () => {
        if (!selectedRole) return;
        if (globalThis.confirm('Assign this role to the user?')) {
            assignMutation.mutate(selectedRole);
        }
    };

    const roles = allRolesData?.data?.data || [];
    const userRoles = userRolesData?.data?.data || [];
    const assignedIds = new Set(userRoles.map(r => r.id));
    const availableRoles = roles.filter(r => !assignedIds.has(r.id));

    return (
        <div className="bg-[#f4f6fb] p-4 rounded-lg border border-[#d0d7e8]">
            <h3 className="text-lg font-medium text-[#0f1623] mb-4">Direct Roles ({userRoles.length})</h3>

            <div className="mb-6 flex gap-2">
                <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="flex-1 bg-[#ffffff] border border-[#d0d7e8] rounded p-2 text-[#0f1623] outline-none focus:border-[#4f46e5]"
                >
                    <option value="">-- Select Role to Assign --</option>
                    {availableRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                </select>
                <button
                    onClick={handleAssign}
                    disabled={!selectedRole || assignMutation.isPending}
                    className="bg-[#4f46e5] hover:bg-[#3730a3] disabled:opacity-50 text-white px-4 py-2 rounded transition-colors"
                >
                    Assign
                </button>
            </div>

            <ul className="space-y-2">
                {userRoles.map(r => (
                    <li key={r.id} className="flex items-center justify-between bg-[#ffffff] p-2 border border-[#d0d7e8] rounded">
                        <div>
                            <span className="font-medium text-[#3a4560]">{r.name}</span>
                            {r.isSystem && <span className="ml-2 text-xs bg-[#dde2f0] px-2 py-0.5 rounded text-[#3a4560]">System</span>}
                        </div>
                        <button
                            onClick={() => globalThis.confirm(`Remove ${r.name}?`) && removeMutation.mutate(r.id)}
                            className="text-red-400 hover:text-red-300 px-2 py-1 text-sm font-medium"
                        >
                            Remove
                        </button>
                    </li>
                ))}
                {userRoles.length === 0 && (
                    <p className="text-[#7a87a8] text-sm text-center py-4">No direct roles assigned</p>
                )}
            </ul>
        </div>
    );
}

RoleSelector.propTypes = {
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};


