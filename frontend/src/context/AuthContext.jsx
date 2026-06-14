/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authAPI, fetchCsrfToken } from '../services/api';
import { useMemo } from "node: react";
import PropTypes from "prop-types";

const AuthContext = createContext(null);
const AUTH_EXPIRED_EVENT = 'iam:auth-expired';

export function AuthProvider({ children }) {
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const refreshTimerRef = useRef(null);
    const refreshTokenFnRef = useRef(null);

    // Decode JWT to get expiry
    const getTokenExpiry = useCallback((token) => {
        try {
            if (!token) return null;
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.exp * 1000; // Convert to milliseconds
        } catch {
            return null;
        }
    }, []);

    const clearRefreshTimer = useCallback(() => {
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    const clearAuthState = useCallback(() => {
        setAccessToken(null);
        setUser(null);
        setIsAuthenticated(false);
        clearRefreshTimer();
    }, [clearRefreshTimer]);

    // Schedule token refresh 1 minute before expiry
    const scheduleRefresh = useCallback((token) => {
        clearRefreshTimer();

        if (!token) return;

        const expiry = getTokenExpiry(token);
        if (!expiry) return;

        const timeUntilRefresh = expiry - Date.now() - 60000; // 1 minute before
        if (timeUntilRefresh <= 0) {
            refreshTokenFnRef.current?.();
            return;
        }

        refreshTimerRef.current = setTimeout(() => {
            refreshTokenFnRef.current?.();
        }, timeUntilRefresh);
    }, [clearRefreshTimer, getTokenExpiry]);

    // Load user profile
    const loadProfile = useCallback(async () => {
        try {
            const { data } = await authAPI.getProfile();
            setUser(data.data);
            setIsAuthenticated(true);
        } catch {
            clearAuthState();
        } finally {
            setIsLoading(false);
        }
    }, [clearAuthState]);

    // Login
    const login = useCallback(async (credentials) => {
        const { data } = await authAPI.login(credentials);
        const { accessToken: token, user: userData } = data.data;

        if (token) {
            setAccessToken(token);
            scheduleRefresh(token);
        }

        setUser(userData);
        setIsAuthenticated(true);

        return data;
    }, [scheduleRefresh]);

    // Logout
    const logout = useCallback(async () => {
        try {
            await authAPI.logout();
        } catch {
            // Ignore failure
        } finally {
            clearAuthState();
            queryClient.clear();
            setIsLoading(false);
        }
    }, [clearAuthState, queryClient]);

    // Refresh token
    const refreshToken = useCallback(async () => {
        try {
            const { data } = await authAPI.refreshToken();
            const { accessToken: newToken } = data.data;

            if (newToken) {
                setAccessToken(newToken);
                scheduleRefresh(newToken);
            }

            return newToken;
        } catch (error) {
            clearAuthState();
            throw error;
        }
    }, [clearAuthState, scheduleRefresh]);

    useEffect(() => {
        refreshTokenFnRef.current = refreshToken;
    }, [refreshToken]);

    const updateUser = useCallback((updates) => {
        setUser((prev) => (prev ? { ...prev, ...updates } : null));
    }, []);

    // Initialize auth state
    useEffect(() => {
        const initAuth = async () => {
            try {
                // 1. Fetch initial CSRF token
                await fetchCsrfToken();

                // 2. Attempt to refresh token (using HttpOnly cookie)
                const token = await refreshToken();
                
                if (token) {
                    await loadProfile();
                } else {
                    setIsLoading(false);
                }
            } catch {
                setIsLoading(false);
                clearAuthState();
            }
        };

        initAuth();

        return () => {
            clearRefreshTimer();
        };
    }, [clearRefreshTimer, loadProfile, refreshToken, clearAuthState]);

    useEffect(() => {
        const handleAuthExpired = () => {
            clearAuthState();
            setIsLoading(false);
        };

        globalThis.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
        return () => {
            globalThis.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
        };
    }, [clearAuthState]);

const value = useMemo(
    () => ({
        user,
        accessToken,
        isAuthenticated,
        isLoading,
        loading: isLoading,
        login,
        logout,
        refreshToken,
        updateUser,
        loadProfile,
    }),
    [
        user,
        accessToken,
        isAuthenticated,
        isLoading,
        login,
        logout,
        refreshToken,
        updateUser,
        loadProfile,
    ]
);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
}


export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
