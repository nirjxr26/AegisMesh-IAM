import PropTypes from 'prop-types';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { rbacAPI, userAPI } from '../../services/api';

function readTextField(formData, fieldName, fallback = '') {
    const value = formData.get(fieldName);
    return typeof value === 'string' ? value.trim() : fallback;
}

export default function UserCreate() {
    const navigate = useNavigate();
    const inputClass = 'w-full border border-[#d0d7e8] rounded-xl px-3 py-2.5 text-sm text-[#0f1623] focus:ring-2 focus:ring-[#4f46e5]/25 focus:border-[#4f46e5] outline-none';

    const { data: roles = [], isLoading: rolesLoading } = useQuery({
        queryKey: ['roles', 'for-user-create'],
        queryFn: () => rbacAPI.getRoles({ limit: 200 }).then((res) => res.data?.data || []),
    });

    const createMutation = useMutation({
        mutationFn: (payload) => userAPI.createUser(payload),
        onSuccess: (response) => {
            const createdUserId = response?.data?.data?.id;
            toast.success('User created successfully');
            navigate(createdUserId ? `/dashboard/users/${createdUserId}` : '/dashboard/users');
        },
        onError: (error) => {
            const message = error?.response?.data?.error?.message || error?.response?.data?.error || 'Failed to create user';
            toast.error(message);
        },
    });

    const handleSubmit = (event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const roleIds = formData.getAll('roleIds').filter((value) => typeof value === 'string');

        const payload = {
            firstName: readTextField(formData, 'firstName'),
            lastName: readTextField(formData, 'lastName'),
            email: readTextField(formData, 'email'),
            password: readTextField(formData, 'password', ''),
            status: readTextField(formData, 'status', 'ACTIVE'),
            roleIds,
            sendWelcomeEmail: formData.get('sendWelcomeEmail') === 'on',
        };

        createMutation.mutate(payload);
    };

    let rolesContent;

    if (rolesLoading) {
        rolesContent = <p className="text-sm text-[#7a87a8]">Loading roles...</p>;
    } else if (roles.length === 0) {
        rolesContent = <p className="text-sm text-[#7a87a8]">No roles found.</p>;
    } else {
        rolesContent = (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {roles.map((role) => (
                    <div key={role.id} className="flex items-start gap-2 border border-[#e3e8f4] rounded-lg px-3 py-2">
                        <input
                            id={`role-${role.id}`}
                            type="checkbox"
                            name="roleIds"
                            value={role.id}
                            className="mt-1"
                        />
                        <label htmlFor={`role-${role.id}`} className="cursor-pointer">
                            <span className="block text-sm font-medium text-[#0f1623]">{role.name}</span>
                            <span className="block text-xs text-[#7a87a8]">{role.description || 'No description'}</span>
                        </label>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#f4f6fb] px-6 py-8">
            <div className="max-w-3xl mx-auto">
                <Link to="/dashboard/users" className="text-sm text-[#7a87a8] hover:text-[#0f1623]">
                    &larr; Back to Users
                </Link>

                <div className="mt-4 bg-white border border-[#d0d7e8] rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#f0f2f8]">
                        <h1 className="text-[20px] font-semibold text-[#0f1623]">Create User</h1>
                        <p className="text-[13px] text-[#7a87a8] mt-1">Add a new user and assign initial access roles.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="First Name" htmlFor="user-first-name">
                                <input id="user-first-name" name="firstName" required className={inputClass} />
                            </Field>
                            <Field label="Last Name" htmlFor="user-last-name">
                                <input id="user-last-name" name="lastName" required className={inputClass} />
                            </Field>
                        </div>

                        <Field label="Email" htmlFor="user-email">
                            <input id="user-email" name="email" type="email" required className={inputClass} />
                        </Field>

                        <Field label="Temporary Password" htmlFor="user-password">
                            <input id="user-password" name="password" type="password" required minLength={8} className={inputClass} />
                        </Field>

                        <Field label="Status" htmlFor="user-status">
                            <select id="user-status" name="status" defaultValue="ACTIVE" className={inputClass}>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                                <option value="LOCKED">Locked</option>
                            </select>
                        </Field>

                        <div>
                            <p className="text-sm font-medium text-[#3a4560] mb-2">Assign Roles</p>
                            {rolesContent}
                        </div>

                        <div className="flex items-center gap-2">
                            <input id="send-welcome-email" type="checkbox" name="sendWelcomeEmail" />
                            <label htmlFor="send-welcome-email" className="text-sm text-[#3a4560] cursor-pointer">
                                Send welcome email
                            </label>
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => navigate('/dashboard/users')}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#eef1f8] text-[#3a4560] hover:bg-[#e2e8f4]"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={createMutation.isPending}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-[#4f46e5] text-white hover:bg-[#3730a3] disabled:opacity-60"
                            >
                                {createMutation.isPending ? 'Creating...' : 'Create User'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

function Field({ label, htmlFor, children }) {
    return (
        <div>
            <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[#3a4560]">{label}</label>
            {children}
        </div>
    );
}

Field.propTypes = {
    label: PropTypes.string.isRequired,
    htmlFor: PropTypes.string,
    children: PropTypes.node,
};
