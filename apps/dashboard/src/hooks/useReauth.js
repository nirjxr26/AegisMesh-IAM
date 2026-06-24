import { useCallback, useRef, useState } from 'react';

const INITIAL_STATE = {
    isOpen: false,
    pendingCall: null,
    action: null,
    requiresMfa: false,
    actionLabel: '',
};

function getErrorCode(error) {
    return error?.response?.data?.code || error?.response?.data?.error?.code || null;
}

export function useReauth() {
    const [reauthModal, setReauthModal] = useState(INITIAL_STATE);
    const pendingPromiseRef = useRef({ resolve: null, reject: null });

    const resetState = useCallback(() => {
        setReauthModal(INITIAL_STATE);
        pendingPromiseRef.current = { resolve: null, reject: null };
    }, []);

    const withReauth = useCallback(async (apiCall, actionLabel = '') => {
        try {
            return await apiCall({});
        } catch (error) {
            const code = getErrorCode(error);
            const data = error?.response?.data;
            const errorData = data?.error || {};

            if (code !== 'REAUTH_REQUIRED') {
                throw error;
            }

            return new Promise((resolve, reject) => {
                pendingPromiseRef.current = { resolve, reject };

                setReauthModal({
                    isOpen: true,
                    pendingCall: async (credentials) => {
                        try {
                            const result = await apiCall(credentials);
                            resetState();
                            resolve(result);
                            return result;
                        } catch (retryError) {
                            const retryCode = getErrorCode(retryError);
                            if (['INVALID_PASSWORD', 'INVALID_MFA_TOKEN', 'NO_PASSWORD', 'MFA_NOT_ENABLED'].includes(retryCode)) {
                                throw retryError;
                            }

                            resetState();
                            reject(retryError);
                            throw retryError;
                        }
                    },
                    action: data?.action || errorData.action || null,
                    requiresMfa: Boolean(data?.requiresMfa ?? errorData.requiresMfa),
                    actionLabel,
                });
            });
        }
    }, [resetState]);

    const pendingCall = reauthModal.pendingCall;

    const handleReauthSuccess = useCallback((credentials) => {
        return pendingCall?.(credentials);
    }, [pendingCall]);

    const handleReauthClose = useCallback(() => {
        pendingPromiseRef.current.reject?.(new Error('Re-authentication cancelled'));
        resetState();
    }, [resetState]);

    return {
        withReauth,
        reauthModal,
        handleReauthSuccess,
        handleReauthClose,
    };
}