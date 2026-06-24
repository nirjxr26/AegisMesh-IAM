import React from 'react';

import PropTypes from 'prop-types';

import {
    Lock,
    X,
} from 'lucide-react';

export default function LockConfirmDialog({
    user,
    onConfirm,
    onCancel,
}) {
    if (!user) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm animate-fade-in-up sm:items-center sm:p-4">
            <div className="mx-4 w-full max-w-md overflow-hidden rounded-t-[20px] border border-[#d0d7e8] bg-[#f4f6fb] shadow-2xl sm:mx-0 sm:rounded-xl">
                <div className="flex items-center justify-between border-b border-[#d0d7e8] p-4">
                    <h3 className="flex items-center gap-2 text-lg font-bold text-[#0f1623]">
                        <Lock className="h-5 w-5 text-[#4f46e5]" />

                        Lock
                        Account
                    </h3>

                    <button
                        type="button"
                        onClick={
                            onCancel
                        }
                        className="text-[#7a87a8] transition-colors hover:text-[#0f1623]"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    <p className="text-[#3a4560]">
                        Are you sure
                        you want to
                        lock{' '}
                        <strong>
                            {
                                user.firstName
                            }{' '}
                            {
                                user.lastName
                            }
                            's
                        </strong>{' '}
                        account?
                    </p>

                    <div className="my-4 rounded-lg border border-[#4f46e5]/25 bg-orange-500/10 p-3">
                        <p className="text-sm text-[#4f46e5]">
                            The user
                            will be
                            immediately
                            logged out
                            of all
                            devices and
                            will not be
                            able to log
                            in until
                            activated
                            again.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-3 border-t border-[#d0d7e8] bg-[#f4f6fb] p-4 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={
                            onCancel
                        }
                        className="rounded-lg bg-[#dde2f0] px-4 py-2 text-sm font-medium text-[#3a4560] transition-colors hover:bg-[#d0d7e8] hover:text-[#0f1623]"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={
                            onConfirm
                        }
                        className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-[#0f1623] transition-colors hover:bg-orange-700"
                    >
                        Lock
                        Account
                    </button>
                </div>
            </div>
        </div>
    );
}

LockConfirmDialog.propTypes = {
    user: PropTypes.shape({
        firstName:
            PropTypes.string
                .isRequired,

        lastName:
            PropTypes.string
                .isRequired,
    }),

    onConfirm:
        PropTypes.func
            .isRequired,

    onCancel:
        PropTypes.func
            .isRequired,
};

LockConfirmDialog.defaultProps = {
    user: null,
};