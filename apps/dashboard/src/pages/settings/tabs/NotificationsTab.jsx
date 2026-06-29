import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { settingsAPI } from '../../../services/api';
import { NOTIFICATION_ROWS, NotificationPrefRow, CardShell, CardHeader } from './shared';

export default function NotificationsTab() {
    const queryClient = useQueryClient();

    const { data: prefs = {} } = useQuery({
        queryKey: ['settings-notifications'],
        queryFn: () => settingsAPI.getNotifications().then((res) => res.data?.data || {}),
    });

    const [localPrefs, setLocalPrefs] = useState({});
    const mergedPrefs = useMemo(() => ({ ...prefs, ...localPrefs }), [prefs, localPrefs]);

    const updateMutation = useMutation({
        mutationFn: (payload) => settingsAPI.updateNotifications(payload),
        onSuccess: async () => { toast.success('Notification preferences saved'); setLocalPrefs({}); await queryClient.invalidateQueries({ queryKey: ['settings-notifications'] }); },
        onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to update preferences'),
    });

    const renderCard = (title, rows) => (
        <CardShell>
            <CardHeader title={title} />
            <div>
                {rows.map((row) => (<NotificationPrefRow key={row.keyEmail} row={row} mergedPrefs={mergedPrefs} setLocalPrefs={setLocalPrefs} />))}
            </div>
        </CardShell>
    );

    return (
        <div className="w-full space-y-5">
            {renderCard('Security Notifications', NOTIFICATION_ROWS.security)}
            {renderCard('Activity Notifications', NOTIFICATION_ROWS.activity)}
            <div className="flex justify-end pt-2">
                <button type="button" onClick={() => updateMutation.mutate(localPrefs)} className="px-4 py-2 rounded-lg text-sm bg-[#4f46e5] text-white hover:bg-[#3730a3]" disabled={!Object.keys(localPrefs).length || updateMutation.isPending}>Save Preferences</button>
            </div>
        </div>
    );
}
