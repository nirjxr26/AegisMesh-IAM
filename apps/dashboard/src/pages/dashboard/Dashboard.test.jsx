import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        user: {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@aegismesh.io',
            role: { name: 'SuperAdmin' },
            mfaEnabled: true,
        },
    }),
}));

vi.mock('../../services/api', () => ({
    authAPI: {
        getSessions: vi.fn().mockRejectedValue(new Error('no session')),
        revokeSession: vi.fn(),
    },
}));

vi.mock('../../components/users/SessionCard', () => ({
    default: () => <div data-testid="session-card">Session Card</div>,
}));

vi.mock('../users/UsersList', () => ({
    default: () => <div data-testid="users-list">Users List</div>,
}));

vi.mock('../rbac/RolesList', () => ({
    default: () => <div data-testid="roles-list">Roles List</div>,
}));

vi.mock('../rbac/PoliciesList', () => ({
    default: () => <div data-testid="policies-list">Policies List</div>,
}));

vi.mock('../rbac/GroupsList', () => ({
    default: () => <div data-testid="groups-list">Groups List</div>,
}));

const mockUseQuery = vi.fn();

vi.mock('@tanstack/react-query', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useQuery: (...args) => mockUseQuery(...args),
    };
});

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

function buildQueryResult(data) {
    return { data, isLoading: false, error: null };
}

function renderDashboard() {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    mockUseQuery.mockImplementation(({ queryKey }) => {
        if (queryKey[0] === 'overview-users') {
            return buildQueryResult({
                data: [
                    { id: 1, email: 'alice@test.com', firstName: 'Alice', lastName: 'Smith', status: 'ACTIVE', mfaEnabled: true, emailVerified: true, roles: [{ name: 'Admin' }], lastLoginAt: new Date().toISOString() },
                    { id: 2, email: 'bob@test.com', firstName: 'Bob', lastName: 'Jones', status: 'ACTIVE', mfaEnabled: false, emailVerified: true, roles: [{ name: 'User' }], lastLoginAt: null },
                ],
                summary: { total: 2, unverified: 0 },
            });
        }
        if (queryKey[0] === 'overview-roles') {
            return buildQueryResult({
                data: [
                    { id: 1, name: 'Admin', _count: { rolePolicies: 3 }, rolePolicies: [] },
                    { id: 2, name: 'User', _count: { rolePolicies: 1 }, rolePolicies: [] },
                ],
            });
        }
        if (queryKey[0] === 'overview-policies') {
            return buildQueryResult({
                data: [
                    { id: 1, name: 'FullAccess', updatedAt: new Date(Date.now() - 3600000).toISOString(), actions: ['*'], resources: ['*'] },
                ],
            });
        }
        if (queryKey[0] === 'overview-groups') {
            return buildQueryResult({ data: [] });
        }
        if (queryKey[0] === 'overview-recent-logs') {
            return buildQueryResult({ data: [] });
        }
        if (queryKey[0] === 'overview-weekly-logs') {
            return buildQueryResult({ data: [] });
        }
        if (queryKey[0] === 'overview-security-alerts') {
            return buildQueryResult({
                data: {
                    alerts: [],
                    totalAlerts: 0,
                },
            });
        }
        return buildQueryResult({ data: [] });
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <Dashboard />
            </MemoryRouter>
        </QueryClientProvider>
    );
}

import Dashboard from '../Dashboard';

describe('Dashboard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the overview section by default', async () => {
        renderDashboard();

        expect(screen.getByText('AegisMesh Console')).toBeInTheDocument();
        expect(screen.getByText('All Systems Operational')).toBeInTheDocument();
    });

    it('renders stats cards with correct data', async () => {
        renderDashboard();

        expect(screen.getByText('Total Users')).toBeInTheDocument();
        expect(screen.getByText('Active Sessions')).toBeInTheDocument();
        expect(screen.getByText('Policies Attached')).toBeInTheDocument();
        expect(screen.getByText('Security Alerts')).toBeInTheDocument();
    });

    it('renders security posture checks', async () => {
        renderDashboard();

        expect(screen.getByText('Security Posture')).toBeInTheDocument();
        expect(screen.getByText('MFA Coverage')).toBeInTheDocument();
        expect(screen.getByText('Inactive Users')).toBeInTheDocument();
        expect(screen.getByText('Overprivileged Roles')).toBeInTheDocument();
        expect(screen.getByText('Unverified Emails')).toBeInTheDocument();
    });

    it('renders recent activity section', async () => {
        renderDashboard();

        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    });

    it('renders quick actions', async () => {
        renderDashboard();

        expect(screen.getByText('Invite New User')).toBeInTheDocument();
        expect(screen.getByText('Create Role')).toBeInTheDocument();
        expect(screen.getByText('Attach Policy')).toBeInTheDocument();
        expect(screen.getByText('View Audit Logs')).toBeInTheDocument();
        expect(screen.getByText('Export User Report')).toBeInTheDocument();
    });

    it('displays metric values', async () => {
        renderDashboard();

        const twos = screen.getAllByText('2');
        expect(twos.length).toBeGreaterThan(0);
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBeGreaterThan(0);
    });
});
