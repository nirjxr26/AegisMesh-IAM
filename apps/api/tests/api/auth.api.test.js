'use strict';

const { request, prisma, tokenService } = require('../helpers/apiSetup');

/* Test-only mock credential — not a real secret */
const TEST_CREDENTIAL = 'Mock-Credential-4-Testing-Only';

describe('Auth API (/api/auth)', () => {
    beforeAll(() => console.log('Starting Auth API tests...'));
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/auth/login', () => {
        it('returns 200 and tokens on successful login', async () => {
            console.log('Running successful login test...');
            const mockUser = { 
                id: 'u1', 
                email: 'test@example.com', 
                passwordHash: 'hashed', 
                status: 'ACTIVE', 
                emailVerified: true,
                firstName: 'Test',
                lastName: 'User',
                userRoles: []
            };
            
            prisma.user.findUnique.mockResolvedValue(mockUser);
            prisma.organizationSettings.findFirst.mockResolvedValue({ maxFailedAttempts: 5 });
            prisma.session.create.mockResolvedValue({ id: 's1' });
            
            tokenService.generateAccessToken.mockReturnValue('access-token');
            tokenService.generateRefreshToken.mockReturnValue('refresh-token');

            const response = await request
                .post('/api/auth/login')
                .send({ email: 'test@example.com', password: TEST_CREDENTIAL });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.accessToken).toBe('access-token');
            expect(response.body.data.refreshToken).toBe('refresh-token');
        });

        it('returns 401 on invalid credentials', async () => {
            prisma.user.findUnique.mockResolvedValue(null);

            const response = await request
                .post('/api/auth/login')
                .send({ email: 'wrong@example.com', password: 'bad' });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/auth/register', () => {
        it('returns 201 on successful registration', async () => {
            prisma.user.findUnique.mockResolvedValue(null);
            prisma.user.create.mockResolvedValue({ id: 'u2', email: 'new@example.com' });

            const response = await request
                .post('/api/auth/register')
                .send({ 
                    email: 'new@example.com', 
                    password: TEST_CREDENTIAL, 
                    firstName: 'New', 
                    lastName: 'User' 
                });

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it('returns 409 if email already exists', async () => {
            prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

            const response = await request
                .post('/api/auth/register')
                .send({ email: 'existing@example.com', password: TEST_CREDENTIAL, firstName: 'E', lastName: 'X' });

            expect(response.status).toBe(409);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('returns 200 on logout', async () => {
            const { authenticatedRequest } = require('../helpers/apiSetup');
            const user = { id: 'u1', email: 'test@example.com', status: 'ACTIVE', emailVerified: true };
            
            prisma.session.findUnique.mockResolvedValue({ id: 's1' });

            const response = await authenticatedRequest('post', '/api/auth/logout', user)
                .send({ refreshToken: 'some-refresh-token' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });
});
