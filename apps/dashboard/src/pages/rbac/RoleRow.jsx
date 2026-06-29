import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { Eye, Key, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RoleRow({ role, onDelete }) {
    const navigate = useNavigate();

    const handleDelete = () => {
        if (role.isSystem) {
            toast.error('System roles cannot be deleted');
            return;
        }

        if (globalThis.confirm(`Are you sure you want to delete "${role.name}"?`)) {
            onDelete(role.id);
        }
    };

    return (
        <div className="group bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#4f46e5]/30 transition-all duration-200 flex flex-col h-full">
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
                            onClick={handleDelete}
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
    );
}

RoleRow.propTypes = {
    role: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        description: PropTypes.string,
        isSystem: PropTypes.bool,
        _count: PropTypes.shape({
            rolePolicies: PropTypes.number,
            userRoles: PropTypes.number,
        }),
    }).isRequired,
    onDelete: PropTypes.func.isRequired,
};
