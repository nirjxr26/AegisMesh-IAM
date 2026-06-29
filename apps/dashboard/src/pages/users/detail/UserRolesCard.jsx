import PropTypes from 'prop-types';
import { ShieldCheck, Lock } from 'lucide-react';

export default function UserRolesCard({ roles, permissions }) {
    return (
        <div className="animate-fade-in-up space-y-8">
            <div>
                <h3 className="text-lg font-bold text-[#0f1623] mb-4 flex items-center gap-2 border-b border-[#d0d7e8] pb-2">
                    <ShieldCheck className="text-green-400" /> Assigned Roles
                </h3>
                {roles.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {roles.map(r => (
                            <div key={r.id} className="bg-[#ffffff] border border-[#d0d7e8] rounded-lg p-4">
                                <h4 className="font-bold text-slate-200 mb-1">{r.name}</h4>
                                <p className="text-xs text-[#7a87a8] line-clamp-2">{r.description || 'No description provided.'}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-lg p-6 text-center text-[#7a87a8]">
                        No roles are directly assigned to this user.
                    </div>
                )}
            </div>

            <div>
                <h3 className="text-lg font-bold text-[#0f1623] mb-4 flex items-center gap-2 border-b border-[#d0d7e8] pb-2">
                    <Lock className="text-[#4f46e5]" /> Direct Permissions
                </h3>
                {permissions.length > 0 ? (
                    <div className="bg-[#ffffff] border border-[#d0d7e8] rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-[#f4f6fb]">
                                <tr>
                                    <th className="px-4 py-2 font-medium text-[#3a4560] text-left">Action</th>
                                    <th className="px-4 py-2 font-medium text-[#3a4560] text-center">Resource</th>
                                    <th className="px-4 py-2 font-medium text-[#3a4560] text-center">Effect</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {permissions.map((p) => (
                                    <tr key={`${p.action}-${p.resource}`}>
                                        <td className="px-4 py-2 text-[#3a4560] font-mono text-xs text-left">{p.action}</td>
                                        <td className="px-4 py-2 text-[#7a87a8] font-mono text-xs text-center">{p.resource}</td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`inline-flex text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${p.effect === 'ALLOW' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {p.effect}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="bg-[#f4f6fb] border border-[#d0d7e8] rounded-lg p-6 text-center text-[#7a87a8] text-sm">
                        No direct permissions found. Access is managed via Groups or Roles.
                    </div>
                )}
            </div>
        </div>
    );
}

UserRolesCard.propTypes = {
    roles: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
    })).isRequired,
    permissions: PropTypes.arrayOf(PropTypes.shape({
        action: PropTypes.string.isRequired,
        resource: PropTypes.string.isRequired,
        effect: PropTypes.string.isRequired,
    })).isRequired,
};
