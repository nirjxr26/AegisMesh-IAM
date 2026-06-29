import { Activity, LogIn, ShieldOff, UserPlus, Users } from 'lucide-react';
import StatCard from './StatCard';

export default function AuditStatCards({ totalUsers, currentStats }) {
    return (
        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <StatCard
                icon={<Users size={18} className="text-[#4f46e5]" />}
                iconBg="bg-[#4f46e5]/10"
                label="Total Users"
                value={totalUsers}
            />

            <StatCard
                icon={<Activity size={18} className="text-[#2563eb]" />}
                iconBg="bg-[#2563eb]/10"
                label="Total Events"
                value={currentStats.totalEvents || 0}
            />

            <StatCard
                icon={<LogIn size={18} className="text-[#dc2626]" />}
                iconBg="bg-[#dc2626]/10"
                label="Failed Logins"
                value={currentStats.failedLogins || 0}
                valueClass={
                    (currentStats.failedLogins || 0) === 0
                        ? 'text-[#16a34a]'
                        : 'text-[#0f1623]'
                }
            />

            <StatCard
                icon={<UserPlus size={18} className="text-[#16a34a]" />}
                iconBg="bg-[#16a34a]/10"
                label="New Users"
                value={currentStats.newUsers || 0}
            />

            <StatCard
                icon={<ShieldOff size={18} className="text-[#d97706]" />}
                iconBg="bg-[#d97706]/10"
                label="Permission Denied"
                value={currentStats.permissionDenied || 0}
                valueClass={
                    (currentStats.permissionDenied || 0) === 0
                        ? 'text-[#16a34a]'
                        : 'text-[#0f1623]'
                }
            />
        </div>
    );
}
