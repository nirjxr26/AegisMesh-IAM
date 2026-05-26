import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';
import { Trash2, X } from 'lucide-react';

function classNames(...values) {
    return values.filter(Boolean).join(' ');
}

export default function DeleteConfirmDialog({
    user,
    onConfirm,
    onCancel,
}) {
    const [confirmText, setConfirmText] = useState('');

    const confirmValue = useMemo(() => {
        return user?.email || 'DELETE';
    }, [user]);

    const isDisabled = confirmText !== confirmValue;

    if (!user) {
        return null;
    }

    return (
        <dialog
            open
            className="fixed inset-0 z-50 bg-transparent p-4"
        >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />

            <div className="fixed inset-0 flex items-center justify-center">
                <div className="w-full max-w-md overflow-hidden rounded-xl border border-[#d0d7e8] bg-[#f4f6fb] shadow-2xl">
                    <div className="flex items-center justify-between border-b border-[#d0d7e8] p-4">
                        <h3 className="flex items-center gap-2 text-lg font-bold text-[#0f1623]">
                            <Trash2 className="h-5 w-5 text-red-500" />
                            Delete Account
                        </h3>

                        <button
                            type="button"
                            onClick={onCancel}
                            aria-label="Close dialog"
                            className="text-[#7a87a8] transition-colors hover:text-[#0f1623]"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6">
                        <p className="mb-4 text-[#3a4560]">
                            This action is permanent and
                            cannot be undone. All data
                            associated with{' '}
                            <strong>
                                {user.email}
                            </strong>{' '}
                            will be permanently removed.
                        </p>

                        <div className="rounded-lg border border-[#d0d7e8] bg-[#ffffff] p-4">
                            <label
                                htmlFor="delete-confirm-input"
                                className="mb-2 block text-sm font-medium text-[#7a87a8]"
                            >
                                Type{' '}
                                <strong className="text-[#3a4560]">
                                    {confirmValue}
                                </strong>{' '}
                                to confirm
                            </label>

                            <input
                                id="delete-confirm-input"
                                type="text"
                                value={confirmText}
                                onChange={(event) => {
                                    setConfirmText(
                                        event.target.value
                                    );
                                }}
                                placeholder={confirmValue}
                                className={classNames(
                                    'w-full rounded border px-3 py-2 text-sm font-mono transition-all',
                                    'focus:outline-none focus:ring-1',
                                    isDisabled
                                        ? 'border-[#b8c2d8] bg-[#f4f6fb] text-[#0f1623] focus:border-red-500 focus:ring-red-500'
                                        : 'border-emerald-400 bg-[#f4f6fb] text-[#0f1623] focus:border-emerald-500 focus:ring-emerald-500'
                                )}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-[#d0d7e8] bg-[#f4f6fb] p-4">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="rounded-lg bg-[#dde2f0] px-4 py-2 text-sm font-medium text-[#3a4560] transition-colors hover:bg-[#d0d7e8] hover:text-[#0f1623]"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isDisabled}
                            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Delete Permanently
                        </button>
                    </div>
                </div>
            </div>
        </dialog>
    );
}

DeleteConfirmDialog.propTypes = {
    user: PropTypes.shape({
        email: PropTypes.string,
    }),

    onConfirm: PropTypes.func.isRequired,

    onCancel: PropTypes.func.isRequired,
};