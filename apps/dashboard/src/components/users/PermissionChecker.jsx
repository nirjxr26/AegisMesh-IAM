import React, {
    useId,
    useMemo,
    useState,
} from 'react';

import PropTypes from 'prop-types';

import {
    CheckCircle2,
    Loader2,
    ShieldCheck,
    XCircle,
} from 'lucide-react';

import toast from 'react-hot-toast';

import { rbacAPI } from '../../services/api';

export default function PermissionChecker({
    userId,
    action: initialAction = 'users:read',
    resource: initialResource = 'users/*',
    onResult,
}) {
    const [
        actionInput,
        setActionInput,
    ] = useState(null);

    const [
        resourceInput,
        setResourceInput,
    ] = useState(null);

    const [result, setResult] =
        useState(null);

    const [status, setStatus] =
        useState('idle');

    const action =
        actionInput ??
        initialAction;

    const resource =
        resourceInput ??
        initialResource;

    const loading =
        status === 'loading';

    const statusCard =
        useMemo(() => {
            if (!result) {
                return null;
            }

            const allowed =
                Boolean(
                    result.allowed
                );

            return {
                allowed,

                title: allowed
                    ? 'Access Granted'
                    : 'Access Denied',

                subtitle: allowed
                    ? `This user CAN perform ${action} on ${resource}`
                    : `This user CANNOT perform ${action} on ${resource}`,

                className: allowed
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                    : 'border-red-200 bg-red-50 text-red-900',

                subClass:
                    allowed
                        ? 'text-emerald-800'
                        : 'text-red-900',

                icon: allowed ? (
                    <CheckCircle2
                        size={18}
                        className="mt-0.5 shrink-0 text-emerald-500"
                    />
                ) : (
                    <XCircle
                        size={18}
                        className="mt-0.5 shrink-0 text-red-500"
                    />
                ),
            };
        }, [
            action,
            resource,
            result,
        ]);

    async function handleCheck() {
        if (
            !action ||
            !resource
        ) {
            toast.error(
                'Action and Resource are required'
            );

            return;
        }

        setStatus(
            'loading'
        );

        try {
            const response =
                await rbacAPI.simulatePolicy(
                    {
                        userId,
                        action,
                        resource,
                    }
                );

            const simulation =
                response.data
                    ?.data;

            setResult(
                simulation
            );

            setStatus(
                'result'
            );

            onResult?.(
                Boolean(
                    simulation?.allowed
                )
            );
        } catch (
            error
        ) {
            toast.error(
                error.response
                    ?.data
                    ?.error
                    ?.message ||
                    'Failed to check permissions'
            );

            setResult(null);

            setStatus(
                'idle'
            );
        }
    }

    const actionId = useId();

    const resourceId = useId();

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 flex items-center gap-2 font-medium text-slate-900">
                <ShieldCheck className="h-4 w-4 text-indigo-600" />

                Permission
                Simulator
            </h3>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                <div className="flex-1">
                    <label
                        htmlFor={
                            actionId
                        }
                        className="mb-1 block text-xs font-medium text-slate-500"
                    >
                        Action
                    </label>

                    <input
                        id={
                            actionId
                        }
                        type="text"
                        value={
                            action
                        }
                        onChange={(
                            event
                        ) =>
                            setActionInput(
                                event
                                    .target
                                    .value
                            )
                        }
                        placeholder="e.g. users:read"
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900"
                    />
                </div>

                <div className="flex-1">
                    <label
                        htmlFor={
                            resourceId
                        }
                        className="mb-1 block text-xs font-medium text-slate-500"
                    >
                        Resource
                    </label>

                    <input
                        id={
                            resourceId
                        }
                        type="text"
                        value={
                            resource
                        }
                        onChange={(
                            event
                        ) =>
                            setResourceInput(
                                event
                                    .target
                                    .value
                            )
                        }
                        placeholder="e.g. users/*"
                        className="w-full rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-900"
                    />
                </div>

                <div className="flex items-end pt-1">
                    <button
                        type="button"
                        onClick={
                            handleCheck
                        }
                        disabled={
                            loading ||
                            !action ||
                            !resource
                        }
                        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
                    >
                        {loading ? (
                            <Loader2
                                size={
                                    14
                                }
                                className="animate-spin"
                            />
                        ) : null}

                        {loading
                            ? 'Checking...'
                            : 'Check'}
                    </button>
                </div>
            </div>

            {statusCard &&
            status ===
                'result' ? (
                <div
                    className={`mt-4 flex items-start gap-3 rounded-lg border p-4 ${statusCard.className}`}
                >
                    {
                        statusCard.icon
                    }

                    <div>
                        <h4 className="text-[14px] font-bold">
                            {
                                statusCard.title
                            }
                        </h4>

                        <p
                            className={`mt-1 text-[12px] ${statusCard.subClass}`}
                        >
                            {
                                statusCard.subtitle
                            }
                        </p>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

PermissionChecker.propTypes = {
    userId:
        PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.number,
        ]).isRequired,

    action:
        PropTypes.string,

    resource:
        PropTypes.string,

    onResult:
        PropTypes.func,
};

PermissionChecker.defaultProps = {
    action:
        'users:read',

    resource:
        'users/*',

    onResult:
        undefined,
};