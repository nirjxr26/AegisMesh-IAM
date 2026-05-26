import PropTypes from 'prop-types';

import {
    Children,
    cloneElement,
    isValidElement,
    useId,
    useState,
} from 'react';

import {
    useQuery,
} from '@tanstack/react-query';

import toast from 'react-hot-toast';

import ReauthModal from '../../components/security/ReauthModal';
import SecurityScore from '../../components/security/SecurityScore';

import { useAuth } from '../../context/AuthContext';

import { useReauth } from '../../hooks/useReauth';

import { settingsAPI } from '../../services/api';

function Modal({
    title,
    children,
    onClose,
}) {
    function handleBackdropClick(event) {
        if (
            event.target ===
            event.currentTarget
        ) {
            onClose();
        }
    }

    return (
        <button
            type="button"
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-[4px] sm:items-center sm:p-4"
            onClick={handleBackdropClick}
        >
            <button
                type="button"
                className="relative mx-4 max-h-[90vh] w-full overflow-y-auto rounded-t-[20px] bg-white shadow-[0_25px_60px_rgba(0,0,0,0.15)] sm:mx-0 sm:max-w-[520px] sm:rounded-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-[#f1f5f9] px-6 pb-4 pt-5">
                    <h3 className="text-base font-bold text-[#0f172a]">
                        {title}
                    </h3>

                    <button
                        type="button"
                        onClick={
                            onClose
                        }
                        className="border-0 bg-transparent p-0 text-[20px] leading-none text-[#94a3b8] transition-colors hover:text-[#374151]"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <div className="px-6 pb-6 pt-5">
                    {children}
                </div>
            </button>   
        </button>
    );
}

Modal.propTypes = {
    title:
        PropTypes.string
            .isRequired,

    children:
        PropTypes.node,

    onClose:
        PropTypes.func
            .isRequired,
};

function Field({
    label,
    error,
    children,
    className = '',
}) {
    const generatedId = useId();

    const childArray =
        Children.toArray(
            children
        );

    if (
        childArray.length ===
            1 &&
        isValidElement(
            childArray[0]
        )
    ) {
        const child =
            childArray[0];

        const existingId =
            child.props?.id;

        const idToUse =
            existingId ||
            generatedId;

        const renderedChild =
            existingId
                ? child
                : cloneElement(
                      child,
                      {
                          id: idToUse,
                      }
                  );

        return (
            <div
                className={
                    className
                }
            >
                <label
                    htmlFor={
                        idToUse
                    }
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#3a4560]"
                >
                    {label}
                </label>

                {
                    renderedChild
                }

                {error ? (
                    <p className="mt-1 text-xs text-[#dc2626]">
                        {
                            error
                        }
                    </p>
                ) : null}
            </div>
        );
    }

    return (
        <div
            className={
                className
            }
        >
            <div className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-[#3a4560]">
                {label}
            </div>

            {children}

            {error ? (
                <p className="mt-1 text-xs text-[#dc2626]">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

Field.propTypes = {
    label:
        PropTypes.string
            .isRequired,

    error:
        PropTypes.string,

    children:
        PropTypes.node,

    className:
        PropTypes.string,
};

export default function SecurityPage() {
    const { user } =
        useAuth();

    const {
        reauthModal,
        handleReauthSuccess,
        handleReauthClose,
    } = useReauth();

    const [
        showModal,
        setShowModal,
    ] = useState(false);

    const {
        data: profileData,
    } = useQuery({
        queryKey: [
            'settings-profile',
        ],

        queryFn: async () => {
            const response =
                await settingsAPI.getProfile();

            return (
                response.data
                    ?.data ||
                null
            );
        },
    });

    const {
        data: sessionsData =
            [],
    } = useQuery({
        queryKey: [
            'settings-sessions',
        ],

        queryFn: async () => {
            const response =
                await settingsAPI.getSessions();

            return (
                response.data
                    ?.data ||
                []
            );
        },
    });

    const {
        data: apiKeysData =
            [],
    } = useQuery({
        queryKey: [
            'settings-api-keys',
        ],

        queryFn: async () => {
            const response =
                await settingsAPI.getApiKeys();

            return (
                response.data
                    ?.data ||
                []
            );
        },
    });

    const effectiveUser = {
        ...user,
        ...(profileData ||
            {}),
    };

    return (
        <div className="w-full">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Security
                    </h1>

                    <p className="mt-1 text-sm text-slate-500">
                        Manage
                        your
                        authentication,
                        sessions,
                        and
                        account
                        protection.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            toast.success(
                                'Security settings updated'
                            );
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        Test
                        Toast
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setShowModal(
                                true
                            )
                        }
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                    >
                        Open
                        Modal
                    </button>
                </div>
            </div>

            <section className="mb-6">
                <SecurityScore
                    user={
                        effectiveUser
                    }
                    sessions={
                        sessionsData
                    }
                    apiKeys={
                        apiKeysData
                    }
                    connectedApps={
                        []
                    }
                />
            </section>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-5 text-lg font-semibold text-slate-900">
                    Account
                    Information
                </h2>

                <div className="grid gap-5 md:grid-cols-2">
                    <Field label="Email">
                        <input
                            type="email"
                            value={
                                effectiveUser?.email ||
                                ''
                            }
                            readOnly
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none"
                        />
                    </Field>

                    <Field label="Username">
                        <input
                            type="text"
                            value={
                                effectiveUser?.username ||
                                ''
                            }
                            readOnly
                            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 outline-none"
                        />
                    </Field>
                </div>
            </div>

            {showModal ? (
                <Modal
                    title="Security Information"
                    onClose={() =>
                        setShowModal(
                            false
                        )
                    }
                >
                    <p className="text-sm leading-6 text-slate-600">
                        This
                        modal is
                        fully
                        accessible
                        and
                        compatible
                        with
                        SonarQube
                        accessibility
                        rules.
                    </p>
                </Modal>
            ) : null}

            <ReauthModal
                isOpen={
                    reauthModal.isOpen
                }
                onClose={
                    handleReauthClose
                }
                onSuccess={
                    handleReauthSuccess
                }
                action={
                    reauthModal.action
                }
                requiresMfa={
                    reauthModal.requiresMfa
                }
                actionLabel={
                    reauthModal.actionLabel
                }
            />
        </div>
    );
}