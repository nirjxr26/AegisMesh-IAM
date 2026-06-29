import PropTypes from 'prop-types';
import { History } from 'lucide-react';
import { formatDate } from '../../../utils/formatters';

export default function UserActivityCard({ auditLogs, auditLoading }) {
    return (
        <div className="animate-fade-in-up">
            <h3 className="text-lg font-bold text-[#0f1623] mb-4 border-b border-[#d0d7e8] pb-2">Activity Feed</h3>
            {auditLoading && (
                <p className="text-[#7a87a8] py-4 text-center">Loading activity feed...</p>
            )}
            {!auditLoading && auditLogs.length > 0 && (
                <div className="space-y-4">
                    {auditLogs.map(log => (
                        <div key={log.id} className="flex gap-4 p-4 bg-[#ffffff] border border-[#d0d7e8] rounded-lg">
                            <div className="text-[#7a87a8] mt-0.5"><History size={16} /></div>
                            <div>
                                <div className="text-sm font-medium text-slate-200">
                                    {log.action} <span className="text-[#7a87a8]">on</span> {log.resource}
                                </div>
                                <div className="text-xs text-[#7a87a8] mt-1 flex gap-3">
                                    <span>{formatDate(log.createdAt)}</span>
                                    <span>IP: {log.ipAddress}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {!auditLoading && auditLogs.length === 0 && (
                <div className="bg-[#ffffff] border border-[#d0d7e8] rounded-xl p-8 text-center text-[#7a87a8] text-sm">
                    No activity records found for this user.
                </div>
            )}
        </div>
    );
}

UserActivityCard.propTypes = {
    auditLogs: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        action: PropTypes.string.isRequired,
        resource: PropTypes.string.isRequired,
        createdAt: PropTypes.string.isRequired,
        ipAddress: PropTypes.string,
    })).isRequired,
    auditLoading: PropTypes.bool,
};
