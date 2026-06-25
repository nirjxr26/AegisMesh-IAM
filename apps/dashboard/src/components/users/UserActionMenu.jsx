import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { MoreHorizontal, Eye, Edit, CheckCircle, Lock, Mail, Key, Trash2 } from 'lucide-react';


export default function UserActionMenu({ user, onAction }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggle = (e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    const handleAction = (e, action) => {
        e.stopPropagation();
        setIsOpen(false);
        onAction(action, user);
    };

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={toggle}
                className="p-1 text-[#7a87a8] hover:text-[#0f1623] hover:bg-[#f4f6fb] rounded transition-colors"
                aria-label="Actions"
            >
                <MoreHorizontal className="w-5 h-5" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-[#f4f6fb] border border-[#d0d7e8] rounded-lg shadow-xl z-50 py-1 font-medium overflow-hidden animate-fade-in-up">
                    <button onClick={(e) => handleAction(e, 'view')} className="w-full text-left px-4 py-2 text-sm text-[#3a4560] hover:bg-[#dde2f0] hover:text-[#0f1623] flex items-center gap-2">
                        <Eye className="w-4 h-4" /> View Details
                    </button>
                    {/* Placeholder Edit */}
                    <button onClick={(e) => handleAction(e, 'edit')} className="w-full text-left px-4 py-2 text-sm text-[#3a4560] hover:bg-[#dde2f0] hover:text-[#0f1623] flex items-center gap-2">
                        <Edit className="w-4 h-4" /> Edit User
                    </button>

                    <div className="h-px bg-[#dde2f0] my-1"></div>

                    {(user.status === 'INACTIVE' || user.status === 'LOCKED') && (
                        <button onClick={(e) => handleAction(e, 'activate')} className="w-full text-left px-4 py-2 text-sm text-green-400 hover:bg-[#dde2f0] flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Activate
                        </button>
                    )}

                    {user.status === 'ACTIVE' && (
                        <button onClick={(e) => handleAction(e, 'lock')} className="w-full text-left px-4 py-2 text-sm text-[#4f46e5] hover:bg-[#dde2f0] flex items-center gap-2">
                            <Lock className="w-4 h-4" /> Lock Account
                        </button>
                    )}

                    {!user.emailVerified && (
                        <button onClick={(e) => handleAction(e, 'verify-email')} className="w-full text-left px-4 py-2 text-sm text-[#4f46e5] hover:bg-[#dde2f0] flex items-center gap-2">
                            <Mail className="w-4 h-4" /> Verify Email
                        </button>
                    )}

                    {/* Placeholder Reset Password */}
                    <button onClick={(e) => handleAction(e, 'reset-password')} className="w-full text-left px-4 py-2 text-sm text-[#3a4560] hover:bg-[#dde2f0] hover:text-[#0f1623] flex items-center gap-2">
                        <Key className="w-4 h-4" /> Reset Password
                    </button>

                    <div className="h-px bg-[#dde2f0] my-1"></div>

                    <button onClick={(e) => handleAction(e, 'delete')} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-[#dde2f0] flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Delete User
                    </button>
                </div>
            )}
        </div>
    );
}

UserActionMenu.propTypes = {
    user: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        status: PropTypes.string,
        emailVerified: PropTypes.bool,
    }).isRequired,
    onAction: PropTypes.func.isRequired,
};


