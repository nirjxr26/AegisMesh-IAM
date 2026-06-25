import React from 'react';
import { useParams } from 'react-router-dom';
import PermissionTree from '../../components/PermissionTree';
import PermissionChecker from '../../components/users/PermissionChecker';
import RoleSelector from '../../components/RoleSelector';

export default function UserPermissions() {
    const { id } = useParams();

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 bg-[#f4f6fb] min-h-screen">
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#0f1623] mb-2">User Permissions</h1>
                    <p className="text-[#7a87a8] text-sm font-mono">User ID: {id}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <PermissionTree userId={id} />
                </div>

                <div className="space-y-8">
                    <PermissionChecker userId={id} />
                    <RoleSelector userId={id} />
                </div>
            </div>
        </div>
    );
}


