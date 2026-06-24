import React from 'react';
import PropTypes from 'prop-types';
import { Plus } from 'lucide-react';

export default function EmptyState({ 
    icon: Icon, 
    title, 
    description, 
    actionLabel, 
    onAction 
}) {
    return (
        <div className="py-16 flex flex-col items-center gap-3 text-center px-4 bg-white border border-[#d0d7e8] rounded-2xl shadow-sm">
            <div className="bg-[#f4f6fb] rounded-2xl p-4 text-[#7a87a8]">
                {Icon && <Icon size={32} />}
            </div>
            <p className="text-[15px] font-semibold text-[#0f1623]">{title}</p>
            <p className="text-[13px] text-[#7a87a8]">{description}</p>
            {onAction && actionLabel && (
                <div className="flex gap-2 mt-2">
                    <button
                        type="button"
                        onClick={onAction}
                        className="bg-[#4f46e5] hover:bg-[#3730a3] text-white text-sm font-medium px-4 py-2 rounded-xl flex items-center gap-2 transition-colors"
                    >
                        <Plus size={15} />
                        {actionLabel}
                    </button>
                </div>
            )}
        </div>
    );
}

EmptyState.propTypes = {
    icon: PropTypes.elementType.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    actionLabel: PropTypes.string,
    onAction: PropTypes.func,
};
