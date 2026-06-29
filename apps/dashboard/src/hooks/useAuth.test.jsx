import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../context/AuthContext';

vi.mock('../services/api', () => ({
    authAPI: {
        getProfile: vi.fn(),
        login: vi.fn(),
        logout: vi.fn(),
        refreshToken: vi.fn(),
    },
    fetchCsrfToken: vi.fn().mockResolvedValue('mock-csrf-token'),
}));

const { authAPI, fetchCsrfToken } = await import('../services/api');

function wrapper({ children }) {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
    );
}

describe('useAuth', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('throws when used outside AuthProvider', () => {
        expect(() => renderHook(() => useAuth())).toThrow(
            'useAuth must be used within an AuthProvider'
        );
    });

    it('starts in loading state', () => {
        authAPI.refreshToken.mockRejectedValue(new Error('no token'));
        fetchCsrfToken.mockResolvedValue('mock-csrf-token');

        const { result } = renderHook(() => useAuth(), { wrapper });

        expect(result.current.isLoading).toBe(true);
    });

    it('provides auth context with default values', async () => {
        authAPI.refreshToken.mockRejectedValue(new Error('no token'));
        fetchCsrfToken.mockResolvedValue('mock-csrf-token');

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(typeof result.current.login).toBe('function');
        expect(typeof result.current.logout).toBe('function');
        expect(typeof result.current.refreshToken).toBe('function');
        expect(typeof result.current.updateUser).toBe('function');
    });

    it('logs in successfully', async () => {
        const mockUser = { id: 1, email: 'test@example.com', firstName: 'Test', lastName: 'User' };
        const mockToken = 'mock-access-token';

        authAPI.refreshToken.mockRejectedValue(new Error('no token'));
        fetchCsrfToken.mockResolvedValue('mock-csrf-token');
        authAPI.login.mockResolvedValue({
            data: {
                data: { accessToken: mockToken, user: mockUser },
            },
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.login({ email: 'test@example.com', password: 'password123' });
        });

        expect(authAPI.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
        expect(result.current.user).toEqual(mockUser);
        expect(result.current.isAuthenticated).toBe(true);
    });

    it('logs out and clears state', async () => {
        authAPI.refreshToken.mockRejectedValue(new Error('no token'));
        fetchCsrfToken.mockResolvedValue('mock-csrf-token');
        authAPI.logout.mockResolvedValue({});

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.logout();
        });

        expect(authAPI.logout).toHaveBeenCalled();
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
    });

    it('updateUser merges user data', async () => {
        authAPI.refreshToken.mockRejectedValue(new Error('no token'));
        fetchCsrfToken.mockResolvedValue('mock-csrf-token');
        authAPI.login.mockResolvedValue({
            data: {
                data: {
                    accessToken: 'token',
                    user: { id: 1, email: 'test@example.com', firstName: 'Test' },
                },
            },
        });

        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => expect(result.current.isLoading).toBe(false));

        await act(async () => {
            await result.current.login({ email: 'test@example.com', password: 'pw' });
        });

        act(() => {
            result.current.updateUser({ firstName: 'Updated' });
        });

        expect(result.current.user?.firstName).toBe('Updated');
        expect(result.current.user?.email).toBe('test@example.com');
    });
});
