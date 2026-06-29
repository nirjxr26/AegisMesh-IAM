import PropTypes from 'prop-types';
import { Users } from 'lucide-react';
import PermissionChecker from '../../../components/users/PermissionChecker';

export default function UserInfoCard({ user, groups, userId }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-[#0f1623] mb-4 border-b border-[#d0d7e8] pb-2">User Details</h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                        <div>
                            <dt className="text-xs text-[#7a87a8] font-medium uppercase mb-1">First Name</dt>
                            <dd className="text-sm text-slate-200">{user.firstName}</dd>
                        </div>
                        <div>
                            <dt className="text-xs text-[#7a87a8] font-medium uppercase mb-1">Last Name</dt>
                            <dd className="text-sm text-slate-200">{user.lastName}</dd>
                        </div>
                        <div className="col-span-2">
                            <dt className="text-xs text-[#7a87a8] font-medium uppercase mb-1">Email Address</dt>
                            <dd className="text-sm text-slate-200">{user.email}</dd>
                        </div>
                    </dl>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-[#0f1623] mb-4 border-b border-[#d0d7e8] pb-2">Assigned Groups</h3>
                    {groups.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {groups.map(g => (
                                <div key={g.id} className="bg-[#ffffff] border border-[#d0d7e8] px-3 py-1.5 rounded-lg text-sm text-[#3a4560] flex items-center gap-2">
                                    <Users size={14} className="text-[#4f46e5]" />
                                    {g.name}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[#7a87a8] text-sm italic">User is not assigned to any groups.</p>
                    )}
                </div>
            </div>
            <div>
                <PermissionChecker userId={userId} />
            </div>
        </div>
    );
}

UserInfoCard.propTypes = {
    user: PropTypes.shape({
        firstName: PropTypes.string,
        lastName: PropTypes.string,
        email: PropTypes.string,
    }).isRequired,
    groups: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
    })).isRequired,
    userId: PropTypes.string.isRequired,
};
