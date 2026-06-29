import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatDate, formatRelativeTime } from '../../../utils/formatters';

export default function UserChart({ user, fullName, initials, roleBadge, sessions, topActiveUsers, weeklyLogsQuery }) {
    const navigate = useNavigate();

    return (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm">
                <h2 className="text-[16px] font-semibold text-[#0f1623] mb-4">Current User Profile</h2>
                <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#4f46e5] text-white font-bold flex items-center justify-center text-sm">
                        {initials}
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0f1623] truncate">{fullName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="inline-flex items-center rounded-full bg-[#4f46e5]/10 px-2 py-0.5 text-xs font-semibold text-[#4f46e5]">{roleBadge}</span>
                            {user?.emailVerified ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><CheckCircle2 size={12} /> Verified</span>
                            ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600"><AlertTriangle size={12} /> Unverified</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-[#7a87a8]">Email</span>
                        <span className="text-[#3a4560] truncate max-w-[65%] text-right">{user?.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[#7a87a8]">MFA</span>
                        <span className={`font-medium ${user?.mfaEnabled ? 'text-emerald-600' : 'text-red-600'}`}>{user?.mfaEnabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    {!user?.mfaEnabled && (
                        <button type="button" onClick={() => navigate('/dashboard/security', { state: { activeTab: 'mfa' } })} className="text-xs text-[#4f46e5] hover:text-[#3730a3] font-medium inline-flex items-center gap-1">
                            Enable Now <ArrowRight size={12} />
                        </button>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="text-[#7a87a8]">Last login</span>
                        <span className="text-[#3a4560] text-right">{formatDate(sessions[0]?.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[#7a87a8]">Account created</span>
                        <span className="text-[#3a4560] text-right">{formatDate(user?.createdAt)}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm">
                <h2 className="text-[16px] font-semibold text-[#0f1623] mb-4">Top Active Users (This Week)</h2>
                {(() => {
                    if (weeklyLogsQuery.isLoading) return <p className="text-sm text-[#7a87a8]">Loading active users...</p>;
                    if (topActiveUsers.length === 0) return <p className="text-sm text-[#7a87a8]">No user activity in the selected window.</p>;
                    return (
                        <div className="space-y-3">
                            {topActiveUsers.map((activeUser) => {
                                const initialsText = (activeUser.name || activeUser.email).split(' ').map((chunk) => chunk[0]).join('').slice(0, 2).toUpperCase();
                                return (
                                    <div key={activeUser.id} className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-8 h-8 rounded-full bg-[#4f46e5]/10 text-[#4f46e5] text-[11px] font-semibold flex items-center justify-center">{initialsText}</div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium text-[#0f1623] truncate">{activeUser.name}</p>
                                                <p className="text-xs text-[#7a87a8] truncate">{activeUser.email}</p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <span className="inline-flex items-center rounded-full bg-[#f4f6fb] border border-[#d0d7e8] px-2 py-0.5 text-xs font-semibold text-[#3a4560]">{activeUser.count} evts</span>
                                            <p className="text-[11px] text-[#7a87a8] mt-1">{formatRelativeTime(activeUser.lastActiveAt)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}

UserChart.propTypes = {
    user: PropTypes.object,
    fullName: PropTypes.string.isRequired,
    initials: PropTypes.string.isRequired,
    roleBadge: PropTypes.string.isRequired,
    sessions: PropTypes.array.isRequired,
    topActiveUsers: PropTypes.array.isRequired,
    weeklyLogsQuery: PropTypes.shape({ isLoading: PropTypes.bool }).isRequired,
};
