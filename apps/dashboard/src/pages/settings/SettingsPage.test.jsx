import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation, useParams, useSearchParams } from 'react-router-dom';

const { mockUser, mockUpdateUser, mockUseAuth } = vi.hoisted(() => {
    const mockUser = {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@aegismesh.io',
        role: 'SuperAdmin',
    };

    const mockUpdateUser = vi.fn();
    const mockUseAuth = vi.fn(() => ({
        user: mockUser,
        updateUser: mockUpdateUser,
    }));

    return { mockUser, mockUpdateUser, mockUseAuth };
});

vi.mock('../../context/AuthContext', () => ({
    useAuth: mockUseAuth,
}));

vi.mock('../../services/api', () => ({
    settingsAPI: {
        getProfile: vi.fn().mockResolvedValue({ data: { data: {} } }),
    },
}));

vi.mock('./tabs/ProfileTab', () => ({
    default: () => <div data-testid="profile-tab">Profile Content</div>,
}));

vi.mock('./tabs/NotificationsTab', () => ({
    default: () => <div data-testid="notifications-tab">Notifications Content</div>,
}));

vi.mock('./tabs/OrganizationTab', () => ({
    default: () => <div data-testid="organization-tab">Organization Content</div>,
}));

vi.mock('./tabs/ApiKeysTab', () => ({
    default: () => <div data-testid="api-keys-tab">API Keys Content</div>,
}));

vi.mock('./tabs/ConnectedAppsTab', () => ({
    default: () => <div data-testid="connected-apps-tab">Connected Apps Content</div>,
}));

const { mockSearchParams, mockSetSearchParams } = vi.hoisted(() => ({
    mockSearchParams: new URLSearchParams(),
    mockSetSearchParams: vi.fn(),
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useLocation: vi.fn().mockReturnValue({ state: {} }),
        useParams: vi.fn().mockReturnValue({}),
        useSearchParams: vi.fn().mockReturnValue([mockSearchParams, mockSetSearchParams]),
    };
});

function renderSettingsPage() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <SettingsPage />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

import SettingsPage from './SettingsPage';

describe('SettingsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useLocation.mockReturnValue({ state: {} });
        useParams.mockReturnValue({});
        useSearchParams.mockReturnValue([new URLSearchParams(), mockSetSearchParams]);
    });

    it('renders the settings page title and description', () => {
        renderSettingsPage();
        expect(screen.getByText('Settings')).toBeInTheDocument();
        expect(screen.getByText('Manage your account and system preferences.')).toBeInTheDocument();
    });

    it('renders all tab navigation items', () => {
        renderSettingsPage();
        expect(screen.getByText('Profile')).toBeInTheDocument();
        expect(screen.getByText('Notifications')).toBeInTheDocument();
        expect(screen.getByText('Organization')).toBeInTheDocument();
        expect(screen.getByText('API Keys')).toBeInTheDocument();
        expect(screen.getByText('Connected Apps')).toBeInTheDocument();
    });

    it('shows profile tab content by default', () => {
        renderSettingsPage();
        expect(screen.getByTestId('profile-tab')).toBeInTheDocument();
    });

    it('switches to notifications tab when clicked', () => {
        renderSettingsPage();

        const notifButton = screen.getByText('Notifications');
        fireEvent.click(notifButton);

        expect(screen.getByTestId('notifications-tab')).toBeInTheDocument();
        expect(screen.queryByTestId('profile-tab')).not.toBeInTheDocument();
    });

    it('switches to API Keys tab when clicked', () => {
        renderSettingsPage();

        const apiKeysButton = screen.getByText('API Keys');
        fireEvent.click(apiKeysButton);

        expect(screen.getByTestId('api-keys-tab')).toBeInTheDocument();
        expect(screen.queryByTestId('profile-tab')).not.toBeInTheDocument();
    });

    it('switches to Connected Apps tab when clicked', () => {
        renderSettingsPage();

        const appsButton = screen.getByText('Connected Apps');
        fireEvent.click(appsButton);

        expect(screen.getByTestId('connected-apps-tab')).toBeInTheDocument();
    });

    it('renders organization tab only for SuperAdmin', () => {
        renderSettingsPage();
        expect(screen.getByText('Organization')).toBeInTheDocument();
        fireEvent.click(screen.getByText('Organization'));
        expect(screen.getByTestId('organization-tab')).toBeInTheDocument();
    });

    it('hides organization tab for non-SuperAdmin users', () => {
        mockUseAuth.mockReturnValue({
            user: { ...mockUser, role: 'Admin' },
            updateUser: mockUpdateUser,
        });

        renderSettingsPage();
        expect(screen.queryByText('Organization')).not.toBeInTheDocument();
        expect(screen.queryByTestId('organization-tab')).not.toBeInTheDocument();
    });

    it('shows user info in the sidebar', () => {
        renderSettingsPage();
        expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    it('shows user initials in avatar', () => {
        renderSettingsPage();
        expect(screen.getByText('AU')).toBeInTheDocument();
    });

    it('uses initialTabOverride when provided', () => {
        const queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <SettingsPage initialTabOverride="api-keys" />
                </MemoryRouter>
            </QueryClientProvider>
        );

        expect(screen.getByTestId('api-keys-tab')).toBeInTheDocument();
        expect(screen.queryByTestId('profile-tab')).not.toBeInTheDocument();
    });
});
