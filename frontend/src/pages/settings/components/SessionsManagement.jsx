import { useState, useEffect } from 'react';
import { settingsAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import SessionCard from '../../../components/users/SessionCard';

export default function SessionsManagement() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [revokingSession, setRevokingSession] = useState(null);

    useEffect(() => {
        fetchSessions();
    }, []);

    async function fetchSessions() {
        try {
            const { data } = await settingsAPI.getSessions();
            setSessions(data.data);
        } catch (err) {
            console.error('Failed to fetch sessions', err);
            toast.error('Failed to load sessions');
        } finally {
            setLoading(false);
        }
    }

    const handleRevokeSession = async (sessionId) => {
        setRevokingSession(sessionId);
        try {
            await settingsAPI.revokeSession(sessionId);
            setSessions((prev) => prev.filter((s) => s.id !== sessionId));
            toast.success('Session revoked');
        } catch (err) {
            console.error('Failed to revoke session', err);
            toast.error('Failed to revoke session');
        } finally {
            setRevokingSession(null);
        }
    };

    const handleRevokeAllOtherSessions = async () => {
        try {
            await settingsAPI.revokeAllOtherSessions();
            await fetchSessions();
            toast.success('Signed out from all other devices');
        } catch (err) {
            console.error('Failed to revoke other sessions', err);
            toast.error('Failed to revoke other sessions');
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-[#0f1623] mb-2">Active Sessions</h1>
                <p className="text-aws-text-dim text-sm">
                    Manage the devices currently logged into your account.
                </p>
            </div>

            <div className="glass rounded-xl p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-[#0f1623] flex items-center gap-2">
                            <span>🖥️</span> Devices
                        </h2>
                        <p className="text-sm text-aws-text-dim mt-1">
                            {sessions.length} active session{sessions.length !== 1 ? 's' : ''}.
                        </p>
                    </div>
                    {sessions.length > 1 && (
                        <button
                            onClick={handleRevokeAllOtherSessions}
                            className="text-sm font-medium text-aws-red hover:text-red-400 bg-aws-red/5 hover:bg-aws-red/10 px-4 py-2 rounded-lg border border-aws-red/20 transition-all whitespace-nowrap"
                        >
                            Sign out of all other devices
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-2 border-aws-orange border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="p-8 text-center bg-aws-navy-light rounded-xl border border-aws-border">
                            <p className="text-aws-text-dim">No active sessions found.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3 animate-fade-in-up">
                            {sessions.map((session, index) => (
                                <SessionCard
                                    key={session.id}
                                    session={session}
                                    isCurrent={index === 0}
                                    onRevoke={handleRevokeSession}
                                    isRevoking={revokingSession === session.id}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


