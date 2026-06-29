import PropTypes from 'prop-types';
import { ShieldCheck, ShieldX } from 'lucide-react';
import SessionCard from '../../../components/users/SessionCard';

export default function UserSessionsCard({ user, sessions, sessionsLoading, onRevokeAll, onRevoke, revokingId }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in-up">
            <div className="space-y-6">
                <div className="bg-[#ffffff] border border-[#d0d7e8] rounded-xl p-6">
                    <h3 className="text-lg font-bold text-[#0f1623] mb-4">MFA Status</h3>
                    <div className="flex items-center gap-4 border-t border-[#d0d7e8] pt-4">
                        {user.mfaEnabled ? (
                            <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center shrink-0">
                                <ShieldCheck size={24} />
                            </div>
                        ) : (
                            <div className="w-12 h-12 bg-[#f4f6fb] text-[#7a87a8] rounded-full flex items-center justify-center shrink-0 border border-[#d0d7e8]">
                                <ShieldX size={24} />
                            </div>
                        )}
                        <div>
                            <h4 className={`text-lg font-medium ${user.mfaEnabled ? 'text-green-400' : 'text-[#7a87a8]'}`}>
                                {user.mfaEnabled ? 'Verified & Enabled' : 'MFA Not Configured'}
                            </h4>
                            <p className="text-sm text-[#7a87a8] mt-1">Multi-factor authentication adds an extra layer of security.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <div className="flex items-center justify-between mb-4 border-b border-[#d0d7e8] pb-2">
                    <h3 className="text-lg font-bold text-[#0f1623]">Active Sessions</h3>
                    {(sessions.length > 0) && (
                        <button
                            onClick={onRevokeAll}
                            className="text-xs font-semibold uppercase text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded transition-colors"
                        >
                            Revoke All
                        </button>
                    )}
                </div>
                <div className="space-y-3">
                    {sessionsLoading && (
                        <p className="text-[#7a87a8] text-sm text-center py-4">Loading sessions...</p>
                    )}
                    {!sessionsLoading && sessions.length > 0 && (
                        sessions.map((session) => (
                            <SessionCard
                                key={session.id}
                                session={session}
                                isCurrent={false}
                                onRevoke={onRevoke}
                                isRevoking={revokingId === session.id}
                            />
                        ))
                    )}
                    {!sessionsLoading && sessions.length === 0 && (
                        <div className="bg-[#ffffff] border border-[#d0d7e8] rounded-xl p-8 text-center">
                            <p className="text-[#7a87a8]">User has no active sessions.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

UserSessionsCard.propTypes = {
    user: PropTypes.shape({
        mfaEnabled: PropTypes.bool,
    }).isRequired,
    sessions: PropTypes.arrayOf(PropTypes.object).isRequired,
    sessionsLoading: PropTypes.bool,
    onRevokeAll: PropTypes.func.isRequired,
    onRevoke: PropTypes.func.isRequired,
    revokingId: PropTypes.string,
};
