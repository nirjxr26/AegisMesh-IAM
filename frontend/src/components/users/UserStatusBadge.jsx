import React from 'react';
import PropTypes from 'prop-types';

export default function UserStatusBadge({ status }) {
    if (!status) return null;

    const styles = {
        ACTIVE: {
            bg: 'bg-green-500/10',
            text: 'text-green-400',
            dot: 'bg-green-400',
            label: 'Active'
        },
        INACTIVE: {
            bg: 'bg-gray-500/10',
            text: 'text-[#7a87a8]',
            dot: 'bg-gray-400',
            label: 'Inactive'
        },
        LOCKED: {
            bg: 'bg-red-500/10',
            text: 'text-red-400',
            dot: 'bg-red-400',
            label: 'Locked'
        }
    };

    const style = styles[status] || styles.INACTIVE;

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-white/5 ${style.bg} ${style.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
            {style.label}
        </div>
    );
}

UserStatusBadge.propTypes = {
    status: PropTypes.oneOf(['ACTIVE', 'INACTIVE', 'LOCKED']).isRequired,
};


