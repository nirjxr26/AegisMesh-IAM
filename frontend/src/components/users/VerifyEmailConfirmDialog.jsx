import React from 'react';
import PropTypes from 'prop-types';
import { Mail, X } from 'lucide-react';

export default function VerifyEmailConfirmDialog({ user, onConfirm, onCancel }) {
    if (!user) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 animate-fade-in-up sm:items-center sm:p-4">
            <div className="mx-4 w-full max-w-md overflow-hidden rounded-t-[20px] border border-[#d0d7e8] bg-[#f4f6fb] shadow-2xl sm:mx-0 sm:rounded-xl">
                <div className="flex justify-between items-center p-4 border-b border-[#d0d7e8]">
                    <h3 className="text-lg font-bold text-[#0f1623] flex items-center gap-2">
                        <Mail className="w-5 h-5 text-[#4f46e5]" /> Verify Email
                    </h3>
                    <button onClick={onCancel} className="text-[#7a87a8] hover:text-[#0f1623]">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6">
                    <p className="text-[#3a4560]">
                        Are you sure you want to manually verify <strong>{user.email}</strong>?
                    </p>
                    <div className="bg-blue-500/10 border border-[#4f46e5]/20 rounded-lg p-3 my-4">
                        <p className="text-sm text-[#4f46e5]">
                            This action overrides the verification link process. Only do this if you have manually confirmed the user's identity.
                        </p>
                    </div>
                </div>
                <div className="flex flex-col-reverse gap-3 border-t border-[#d0d7e8] bg-[#f4f6fb] p-4 sm:flex-row sm:justify-end">
                    <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-[#3a4560] hover:text-[#0f1623] bg-[#dde2f0] hover:bg-[#d0d7e8] transition-colors">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-sm font-medium text-[#0f1623] bg-[#4f46e5] hover:bg-[#3730a3] transition-colors">
                        Verify Email
                    </button>
                </div>
            </div>
        </div>
    );
}

VerifyEmailConfirmDialog.propTypes = {
    user: PropTypes.shape({
        email: PropTypes.string.isRequired,
    }).isRequired,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};


