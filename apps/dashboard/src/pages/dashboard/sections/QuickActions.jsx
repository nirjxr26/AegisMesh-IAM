import PropTypes from 'prop-types';
import { ArrowRight } from 'lucide-react';

export default function QuickActions({ actions }) {
    return (
        <div className="bg-white border border-[#d0d7e8] rounded-2xl p-5 shadow-sm">
            <h2 className="text-[16px] font-semibold text-[#0f1623] mb-4">Quick Actions</h2>
            <div className="space-y-2">
                {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                        <button key={action.label} type="button" onClick={action.onClick} className="w-full flex items-center justify-between p-3 rounded-xl border border-[#edf0f7] bg-[#f8f9fd] hover:bg-[#eef2ff] transition-colors">
                            <span className="inline-flex items-center gap-2 text-sm font-medium text-[#0f1623]">
                                <Icon size={14} className="text-[#4f46e5]" />
                                {action.label}
                            </span>
                            <ArrowRight size={14} className="text-[#7a87a8]" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

QuickActions.propTypes = {
    actions: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        icon: PropTypes.elementType.isRequired,
        onClick: PropTypes.func.isRequired,
    })).isRequired,
};
