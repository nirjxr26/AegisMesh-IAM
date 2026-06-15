import React from 'react';
import PropTypes from 'prop-types';

const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500',
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500',
    'bg-cyan-500', 'bg-sky-500', 'bg-blue-500',
    'bg-indigo-500', 'bg-violet-500', 'bg-purple-500',
    'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
];

export default function UserAvatar({ user, size = 'md' }) {
    if (!user) return null;

    const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || '?';

    // Hash based on UUID or simple string to pick color
    let hash = 0;
    const id = user.id || '';
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    const colorClass = colors[colorIndex];

    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-20 h-20 text-2xl',
    }[size] || 'w-12 h-12 text-sm';

    return (
        <div className={`${sizeClasses} ${colorClass} text-[#0f1623] rounded-full flex items-center justify-center font-bold shrink-0 shadow-sm border border-[#d0d7e8]`}>
            {initials}
        </div>
    );
}

UserAvatar.propTypes = {
    user: PropTypes.shape({
        id: PropTypes.string,
        firstName: PropTypes.string,
        lastName: PropTypes.string,
    }),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
};


