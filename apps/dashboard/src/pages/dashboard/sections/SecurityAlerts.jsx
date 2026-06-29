import PropTypes from 'prop-types';
import { ShieldCheck } from 'lucide-react';
import { getStatusChip } from './shared';

export default function SecurityAlerts({ postureChecks }) {
    return (
        <div className="bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-[16px] font-semibold text-[#0f1623]">Security Posture</h2>
                    <p className="text-xs text-[#7a87a8] mt-1">Live checks for MFA adoption, inactive identities, privilege risks, and email trust.</p>
                </div>
                <ShieldCheck size={18} className="text-[#4f46e5]" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {postureChecks.map((check) => {
                    const chip = getStatusChip(check.status);
                    const Icon = check.icon;
                    return (
                        <div key={check.label} className="border border-[#e5eaf3] rounded-xl p-3 bg-[#f8f9fd]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-white border border-[#e3e7f1] text-[#4f46e5]"><Icon size={14} /></div>
                                    <p className="text-xs font-semibold text-[#3a4560]">{check.label}</p>
                                </div>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${chip.className}`}>{chip.label}</span>
                            </div>
                            <p className="text-sm font-semibold text-[#0f1623] mt-2">{check.value}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

SecurityAlerts.propTypes = {
    postureChecks: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        icon: PropTypes.elementType.isRequired,
        value: PropTypes.string.isRequired,
        status: PropTypes.string.isRequired,
    })).isRequired,
};
