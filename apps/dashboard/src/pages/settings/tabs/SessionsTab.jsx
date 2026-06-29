import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Info, Monitor, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { settingsAPI } from '../../../services/api';
import { formatDate, formatRelative } from '../../../utils/formatters';
import { CardShell } from '../../../components/common/CardShell';

export default function SessionsTab() {
    const queryClient = useQueryClient();

    const { data: sessions = [] } = useQuery({
        queryKey: ['settings-sessions'],
        queryFn: () => settingsAPI.getSessions().then((res) => res.data?.data || []),
    });

    const revokeMutation = useMutation({
        mutationFn: (sessionId) => settingsAPI.revokeSession(sessionId),
        onSuccess: async () => { toast.success('Session revoked'); await queryClient.invalidateQueries({ queryKey: ['settings-sessions'] }); },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to revoke session'),
    });

    const revokeAllMutation = useMutation({
        mutationFn: () => settingsAPI.revokeAllOtherSessions(),
        onSuccess: async () => { toast.success('All other sessions revoked'); await queryClient.invalidateQueries({ queryKey: ['settings-sessions'] }); },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to revoke sessions'),
    });

    const current = sessions.find((session) => session.isCurrent);

    return (
        <div className="w-full">
            <div className="bg-[#4f46e5]/5 border border-[#4f46e5]/15 rounded-xl px-4 py-3 flex items-center gap-3 mb-5">
                <Info size={16} className="text-[#4f46e5]" />
                <p className="text-[13px] text-[#374151] flex-1">
                    You are currently signed in from {current?.deviceName || 'this device'} · {current?.ip || 'Unknown IP'}
                </p>
                <button type="button" onClick={() => revokeAllMutation.mutate()} className="text-sm text-[#dc2626] hover:underline font-medium">Revoke All Others</button>
            </div>

            <CardShell className="divide-y divide-[#f0f2f8]">
                {sessions.map((session) => (
                    <div key={session.id} className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#f4f6fb] flex items-center justify-center text-[#7a87a8]">
                                {session.device === 'Mobile' ? <Smartphone size={16} /> : <Monitor size={16} />}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-[#0f1623]">{session.browser} on {session.os}</p>
                                <p className="text-xs text-[#7a87a8]">{session.ip} · Created {formatRelative(session.createdAt)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            {session.isCurrent ? (
                                <span className="text-xs font-semibold bg-[#16a34a]/10 text-[#16a34a] px-2 py-1 rounded-full">Current</span>
                            ) : (
                                <button type="button" onClick={() => revokeMutation.mutate(session.id)} className="px-3 py-1.5 text-xs border border-red-200 text-[#dc2626] rounded-lg hover:bg-red-50">Revoke</button>
                            )}
                            <p className="text-xs text-[#7a87a8] mt-1">Expires {formatDate(session.expiresAt)}</p>
                        </div>
                    </div>
                ))}
                {sessions.length === 0 ? <div className="px-6 py-6 text-sm text-[#7a87a8]">No active sessions found.</div> : null}
            </CardShell>
        </div>
    );
}
