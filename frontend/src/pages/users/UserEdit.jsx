import PropTypes from 'prop-types';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { rbacAPI, userAPI } from '../../services/api';

function readTextField(formData, fieldName, fallback = '') {
    const value = formData.get(fieldName);
    return typeof value === 'string' ? value.trim() : fallback;
}

export default function UserEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const inputClass = 'w-full border border-[#d0d7e8] rounded-xl px-3 py-2.5 text-sm text-[#0f1623] focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none';

    const { data: userData, isLoading: userLoading, isError: userError } = useQuery({
        queryKey: ['user', id, 'edit'],
        queryFn: () => userAPI.getUser(id).then((res) => res.data?.data),
        enabled: Boolean(id),
    });

    const { data: roles = [], isLoading: rolesLoading } = useQuery({
        queryKey: ['roles', 'for-user-edit'],
        queryFn: () => rbacAPI.getRoles({ limit: 200 }).then((res) => res.data?.data || []),
    });

    const updateMutation = useMutation({
        mutationFn: (payload) => userAPI.updateUser(id, payload),
        onSuccess: () => {
            toast.success('User updated successfully');
            navigate(`/dashboard/users/${id}`);
        },
        onError: (error) => {
            const message = error?.response?.data?.error?.message || error?.response?.data?.error || 'Failed to update user';
            toast.error(message);
        },
    });

    if (userLoading) {
        return <div className="min-h-[calc(100vh-64px)] bg-[#f4f6fb] px-6 py-8 text-[#7a87a8]">Loading user...</div>;
    }

    if (userError || !userData) {
        return <div className="min-h-[calc(100vh-64px)] bg-[#f4f6fb] px-6 py-8 text-red-500">Failed to load user.</div>;
    }

    const currentRoleIds = new Set((userData.roles || []).map((role) => role.id));

    const handleSubmit = (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const roleIds = formData.getAll('roleIds').filter((value) => typeof value === 'string');

        const payload = {
            firstName: readTextField(formData, 'firstName'),
            lastName: readTextField(formData, 'lastName'),
            email: readTextField(formData, 'email'),
            status: readTextField(formData, 'status', userData.status),
            roleIds,
        };

        updateMutation.mutate(payload);
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#f4f6fb] px-6 py-8">
            <div className="max-w-3xl mx-auto">
                <Link to={`/dashboard/users/${id}`} className="text-sm text-[#7a87a8] hover:text-[#0f1623]">
                    &larr; Back to User
                </Link>

                <div className="mt-4 bg-white border border-[#d0d7e8] rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#f0f2f8]">
                        <h1 className="text-[20px] font-semibold text-[#0f1623]">Edit User</h1>
                        <p className="text-[13px] text-[#7a87a8] mt-1">Update identity details and role assignments.</p>
                    </div>

                    <form key={userData.id} onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="First Name">
                                <input name="firstName" required defaultValue={userData.firstName || ''} className={inputClass} />
                            </Field>
                            <Field label="Last Name">
                                <input name="lastName" required defaultValue={userData.lastName || ''} className={inputClass} />
                            </Field>
                        </div>

                        <Field label="Email">
                            <input name="email" type="email" required defaultValue={userData.email || ''} className={inputClass} />
                        </Field>

                        <Field label="Status">
                            <select name="status" defaultValue={userData.status || 'ACTIVE'} className={inputClass}>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                                <option value="LOCKED">Locked</option>
                            </select>
                        </Field>

                        <div>
                            <p className="text-sm font-medium text-[#3a4560] mb-2">Assigned Roles</p>
                            {rolesLoading ? (
                                <p className="text-sm text-[#7a87a8]">Loading roles...</p>
                            ) : roles.length === 0 ? (
                                <p className="text-sm text-[#7a87a8]">No roles found.</p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {roles.map((role) => (
                                        <label key={role.id} className="flex items-start gap-2 border border-[#e3e8f4] rounded-lg px-3 py-2">
                                            <input
                                                type="checkbox"
                                                name="roleIds"
                                                value={role.id}
                                                defaultChecked={currentRoleIds.has(role.id)}
                                                className="mt-1"
                                            />
                                            <span>
                                                <span className="block text-sm font-medium text-[#0f1623]">{role.name}</span>
                                                <span className="block text-xs text-[#7a87a8]">{role.description || 'No description'}</span>
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => navigate(`/dashboard/users/${id}`)}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#eef1f8] text-[#3a4560] hover:bg-[#e2e8f4]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={updateMutation.isPending}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#4f46e5] text-white hover:bg-[#3730a3] disabled:opacity-60"
                            >
                                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label className="block text-sm font-medium text-[#3a4560]">
            <span className="mb-1.5 block">{label}</span>
            {children}
        </label>
    );
}

Field.propTypes = {
    label: PropTypes.string.isRequired,
    children: PropTypes.node,
};
