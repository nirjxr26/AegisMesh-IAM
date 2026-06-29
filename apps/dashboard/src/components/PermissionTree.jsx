import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { rbacAPI } from '../services/api';

export default function PermissionTree({ userId }) {
    const { data: permissionsData, isLoading } = useQuery({
        queryKey: ['userPermissions', userId],
        queryFn: () => rbacAPI.getUserPermissions(userId)
    });

    if (isLoading) return <div className="text-[#7a87a8] p-4 animate-pulse">Loading permissions tree...</div>;

    const data = permissionsData?.data?.data;
    if (!data) return <div className="text-[#7a87a8]">No permissions data available</div>;

    const { roles, groups, policies, effectivePermissions } = data;

    return (
        <div className="bg-[#f4f6fb] p-6 rounded-lg border border-[#d0d7e8]">
            <h3 className="text-lg font-medium text-[#0f1623] mb-6 border-b border-[#d0d7e8] pb-2">Effective Permissions Tree</h3>

            <div className="space-y-6 text-sm">
                <div>
                    <h4 className="text-[#4f46e5] font-semibold mb-2">👤 User Inheritance</h4>
                    <div className="pl-4 border-l-2 border-[#d0d7e8] space-y-4">

                        {/* Direct Roles */}
                        {roles.length > 0 && (
                            <div>
                                <span className="text-[#3a4560] font-medium">↳ Direct Roles:</span>
                                <div className="pl-6 mt-1 space-y-1">
                                    {roles.map(r => (
                                        <div key={r.id} className="text-[#7a87a8] flex items-center">
                                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2"></span>
                                            {r.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Inherited from Groups */}
                        {groups.length > 0 && (
                            <div>
                                <span className="text-[#3a4560] font-medium">↳ Group Memberships:</span>
                                <div className="pl-6 mt-1 space-y-2">
                                    {groups.map(g => (
                                        <div key={g.id}>
                                            <div className="text-[#7a87a8] flex items-center mb-1">
                                                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mr-2"></span>
                                                {g.name}
                                            </div>
                                            {g.roles?.length > 0 && (
                                                <div className="pl-5 border-l border-[#d0d7e8] ml-1 space-y-1">
                                                    <span className="text-[#7a87a8] text-xs mt-1 block">Provides Roles:</span>
                                                    {g.roles.map(r => (
                                                        <div key={r.id} className="text-[#7a87a8] flex items-center text-xs">
                                                            <span className="text-gray-600 mr-2">↳</span>
                                                            {r.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {roles.length === 0 && groups.length === 0 && (
                            <p className="text-[#7a87a8] italic pl-4">No roles or groups assigned</p>
                        )}
                    </div>
                </div>

                <div>
                    <h4 className="text-green-400 font-semibold mb-2">🛡️ Evaluated Policies ({policies.length})</h4>
                    <div className="pl-4 border-l-2 border-[#d0d7e8] space-y-2">
                        {policies.map(p => (
                            <div key={p.id} className="bg-[#ffffff] border border-gray-800 p-3 rounded text-xs flex gap-4 my-2">
                                <div className="min-w-[120px]">
                                    <span className="text-[#3a4560] font-medium block">{p.name}</span>
                                    <span className={`mt-1 inline-block px-1.5 py-0.5 rounded text-[10px] ${p.effect === 'ALLOW' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>{p.effect}</span>
                                </div>
                                <div className="flex-1">
                                    <span className="text-[#7a87a8] block">Actions:</span>
                                    <span className="text-blue-300 font-mono tracking-tight">{p.actions.join(', ')}</span>
                                </div>
                                <div className="flex-1">
                                    <span className="text-[#7a87a8] block">Resources:</span>
                                    <span className="text-yellow-300 font-mono tracking-tight">{p.resources.join(', ')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h4 className="text-purple-400 font-semibold mb-2">⚡ Net Effective Actions</h4>
                    <div className="pl-4">
                        <div className="bg-[#ffffff] p-4 rounded border border-gray-800 flex gap-6">
                            <div className="flex-1 border-r border-[#d0d7e8] pr-4">
                                <h5 className="text-green-500 font-medium mb-2 border-b border-gray-800 pb-1">✅ Allowed ({effectivePermissions.allowed.length})</h5>
                                <ul className="list-disc pl-4 mt-2 text-[#3a4560] font-mono text-xs">
                                    {effectivePermissions.allowed.length > 0 ? effectivePermissions.allowed.map(a => <li key={a} className="py-0.5">{a}</li>) : <li className="text-[#7a87a8] list-none -ml-4">None</li>}
                                </ul>
                            </div>
                            <div className="flex-1 pr-4">
                                <h5 className="text-red-500 font-medium mb-2 border-b border-gray-800 pb-1">❌ Explicitly Denied ({effectivePermissions.denied.length})</h5>
                                <ul className="list-disc pl-4 mt-2 text-[#3a4560] font-mono text-xs">
                                    {effectivePermissions.denied.length > 0 ? effectivePermissions.denied.map(a => <li key={a} className="py-0.5">{a}</li>) : <li className="text-[#7a87a8] list-none -ml-4">None</li>}
                                </ul>
                            </div>
                        </div>
                        <p className="text-xs text-[#7a87a8] mt-2">Note: Any action not explicitly ALLOWED is implicitly DENIED. Explicit DENY overrides ALLOW.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

PermissionTree.propTypes = {
    userId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
};


