import { AccountDeletedError } from '../errors/AccountDeletedError';
import { AuthError } from '../errors/AuthError';
import { siteErrorHandler } from '../middleware/siteErrorHandler';
import { AuthService } from '../services/AuthService';
import { ServerService } from '../services/ServerService';
import { UserService } from '../services/UserService';
import { mockConfig } from '../tests/mockConfig';
import { stubApp } from '../tests/stubApp';
import { SiteTokenPayload } from '../types/Auth/SiteTokenPayload';
import { AuthScopes, EndpointProvider } from '../types/Express/EndpointProvider';
import { AppServices } from '../types/Services/AppServices';
import { User } from '../types/User';
import { UserPermissions } from '../types/User/UserPermissions';
import { withScopes } from './withScopes';

interface ScopeTestEndpointReturnValue {
    auth: boolean;
    user: boolean;
    authService: boolean;
    userService: boolean;
    serverService: boolean;
}

describe('withScopes', () => {
    const config = mockConfig();

    const validateSiteToken = jest.fn<
        ReturnType<AuthService['validateSiteToken']>,
        Parameters<AuthService['validateSiteToken']>
    >();
    const getUserById = jest.fn<ReturnType<UserService['getUserById']>, Parameters<UserService['getUserById']>>();

    const authService = { validateSiteToken } as unknown as AuthService;
    const userService = { getUserById } as unknown as UserService;
    const serverService = {} as ServerService;
    const services: AppServices = { authService, userService, serverService };

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('AuthScopes: None', () => {
        const endpointNoScopes: EndpointProvider<AuthScopes.None, void, ScopeTestEndpointReturnValue> = {
            auth: AuthScopes.None,
            permissionsRequired: null,
            applyToRoute({ auth, user, authService, userService, serverService }) {
                return (_req, res) =>
                    res.status(200).send({
                        auth: !!auth,
                        user: !!user,
                        authService: !!authService,
                        userService: !!userService,
                        serverService: !!serverService,
                    });
            },
        };
        const app = stubApp(config, [], [], withScopes(endpointNoScopes, config, services));

        it('applies the route as expected', async () => {
            const res = await app.get('/');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual<ScopeTestEndpointReturnValue>({
                auth: false,
                user: false,
                authService: true,
                userService: true,
                serverService: true,
            });
        });
    });

    describe('AuthScopes: TokenOnly', () => {
        const endpointTokenOnlyScopes: EndpointProvider<AuthScopes.TokenOnly, void, ScopeTestEndpointReturnValue> = {
            auth: AuthScopes.TokenOnly,
            permissionsRequired: null,
            applyToRoute({ auth, user, authService, userService, serverService }) {
                return (_req, res) =>
                    res.status(200).send({
                        auth: !!auth,
                        user: !!user,
                        authService: !!authService,
                        userService: !!userService,
                        serverService: !!serverService,
                    });
            },
        };

        const app = stubApp(config, [], [siteErrorHandler], withScopes(endpointTokenOnlyScopes, config, services));

        it('throws an AuthError when token validation fails', async () => {
            validateSiteToken.mockImplementationOnce(() => {
                throw new AuthError('', '');
            });

            const res = await app.get('/');

            expect(res.statusCode).toBe(401);
            expect(res.body).toEqual({
                message: expect.any(String),
                hint: expect.any(String),
            });

            expect(validateSiteToken).toBeCalledTimes(1);
        });

        it('allows valid tokens to access the route', async () => {
            validateSiteToken.mockReturnValueOnce({} as SiteTokenPayload);

            const res = await app.get('/');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual<ScopeTestEndpointReturnValue>({
                auth: true,
                user: false,
                authService: true,
                userService: true,
                serverService: true,
            });

            expect(validateSiteToken).toBeCalledTimes(1);
        });
    });

    describe('AuthScopes: OptionalUser', () => {
        const endpointOptionalUserScopes: EndpointProvider<
            AuthScopes.OptionalUser,
            void,
            ScopeTestEndpointReturnValue
        > = {
            auth: AuthScopes.OptionalUser,
            permissionsRequired: null,
            applyToRoute({ auth, user, authService, userService, serverService }) {
                return (_req, res) =>
                    res.status(200).send({
                        auth: !!auth,
                        user: !!user,
                        authService: !!authService,
                        userService: !!userService,
                        serverService: !!serverService,
                    });
            },
        };

        const app = stubApp(config, [], [siteErrorHandler], withScopes(endpointOptionalUserScopes, config, services));

        it('throws an AuthError when token validation fails', async () => {
            validateSiteToken.mockImplementationOnce(() => {
                throw new AuthError('', '');
            });

            const res = await app.get('/').set('Authorization', 'some bearer token');

            expect(res.statusCode).toBe(401);
            expect(res.body).toEqual({
                message: expect.any(String),
                hint: expect.any(String),
            });

            expect(validateSiteToken).toBeCalledTimes(1);
            expect(getUserById).toBeCalledTimes(0);
        });

        it("throws an AccountDeletedError when user doesn't exist", async () => {
            validateSiteToken.mockReturnValueOnce({ id: 'some id' } as SiteTokenPayload);
            getUserById.mockImplementationOnce(() => {
                throw new AccountDeletedError();
            });

            const res = await app.get('/').set('Authorization', 'some bearer token');

            expect(res.statusCode).toBe(401);
            expect(res.body).toEqual({
                message: expect.any(String),
                hint: expect.any(String),
            });

            expect(validateSiteToken).toBeCalledTimes(1);
            expect(getUserById).toBeCalledTimes(1);
        });

        it('allows valid tokens to access the route', async () => {
            validateSiteToken.mockReturnValueOnce({ id: 'some id' } as SiteTokenPayload);
            getUserById.mockReturnValueOnce(Promise.resolve({} as User<true>));

            const res = await app.get('/').set('Authorization', 'some bearer token');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual<ScopeTestEndpointReturnValue>({
                auth: true,
                user: true,
                authService: true,
                userService: true,
                serverService: true,
            });

            expect(validateSiteToken).toBeCalledTimes(1);
            expect(getUserById).toBeCalledTimes(1);
        });

        it('allows omitted tokens to access the route', async () => {
            const res = await app.get('/');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual<ScopeTestEndpointReturnValue>({
                auth: false,
                user: false,
                authService: true,
                userService: true,
                serverService: true,
            });

            expect(validateSiteToken).toBeCalledTimes(0);
            expect(getUserById).toBeCalledTimes(0);
        });
    });

    describe('AuthScopes: User', () => {
        const endpointUserScopes: EndpointProvider<AuthScopes.User, void, ScopeTestEndpointReturnValue> = {
            auth: AuthScopes.User,
            permissionsRequired: null,
            applyToRoute({ auth, user, authService, userService, serverService }) {
                return (_req, res) =>
                    res.status(200).send({
                        auth: !!auth,
                        user: !!user,
                        authService: !!authService,
                        userService: !!userService,
                        serverService: !!serverService,
                    });
            },
        };

        const app = stubApp(config, [], [siteErrorHandler], withScopes(endpointUserScopes, config, services));

        it('throws an AuthError when token validation fails', async () => {
            validateSiteToken.mockImplementationOnce(() => {
                throw new AuthError('', '');
            });

            const res = await app.get('/');

            expect(res.statusCode).toBe(401);
            expect(res.body).toEqual({
                message: expect.any(String),
                hint: expect.any(String),
            });

            expect(validateSiteToken).toBeCalledTimes(1);
            expect(getUserById).toBeCalledTimes(0);
        });

        it("throws an AccountDeletedError when user doesn't exist", async () => {
            validateSiteToken.mockReturnValueOnce({ id: 'some id' } as SiteTokenPayload);
            getUserById.mockImplementationOnce(() => {
                throw new AccountDeletedError();
            });

            const res = await app.get('/');

            expect(res.statusCode).toBe(401);
            expect(res.body).toEqual({
                message: expect.any(String),
                hint: expect.any(String),
            });

            expect(validateSiteToken).toBeCalledTimes(1);
            expect(getUserById).toBeCalledTimes(1);
        });

        it('allows valid tokens to access the route', async () => {
            validateSiteToken.mockReturnValueOnce({ id: 'some id' } as SiteTokenPayload);
            getUserById.mockReturnValueOnce(Promise.resolve({} as User<true>));

            const res = await app.get('/');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual<ScopeTestEndpointReturnValue>({
                auth: true,
                user: true,
                authService: true,
                userService: true,
                serverService: true,
            });

            expect(validateSiteToken).toBeCalledTimes(1);
            expect(getUserById).toBeCalledTimes(1);
        });
    });

    describe('AuthScopes: User (+ PermissionsRequired)', () => {
        const endpointUserScopes: EndpointProvider<AuthScopes.User, void, ScopeTestEndpointReturnValue> = {
            auth: AuthScopes.User,
            permissionsRequired: UserPermissions.Feature | UserPermissions.MakeLotsOfApplications,
            applyToRoute({ auth, user, authService, userService, serverService }) {
                return (_req, res) =>
                    res.status(200).send({
                        auth: !!auth,
                        user: !!user,
                        authService: !!authService,
                        userService: !!userService,
                        serverService: !!serverService,
                    });
            },
        };

        const app = stubApp(config, [], [siteErrorHandler], withScopes(endpointUserScopes, config, services));

        it('rejects users who do not have all the required permissions', async () => {
            validateSiteToken.mockReturnValueOnce({ id: 'some id' } as SiteTokenPayload);
            getUserById.mockReturnValueOnce(
                Promise.resolve({ permissions: UserPermissions.Feature | UserPermissions.ManageServers } as User<true>),
            );

            const res = await app.get('/');

            expect(res.statusCode).toBe(403);
            expect(res.body).toEqual({
                requiredPermissions: expect.arrayContaining([
                    UserPermissions[UserPermissions.Feature],
                    UserPermissions[UserPermissions.MakeLotsOfApplications],
                ]),
                currentPermissions: expect.arrayContaining([
                    UserPermissions[UserPermissions.Feature],
                    UserPermissions[UserPermissions.ManageServers],
                ]),
                missingPermissions: expect.arrayContaining([UserPermissions[UserPermissions.MakeLotsOfApplications]]),
            });
        });
    });

    describe('AuthScopes: Other', () => {
        const endpointUnknownScopes: EndpointProvider<AuthScopes, void, void> = {
            auth: -1,
            permissionsRequired: UserPermissions.Feature | UserPermissions.MakeLotsOfApplications,
            applyToRoute() {
                return () => void 0;
            },
        };

        it('throws an error on creation', () => {
            try {
                withScopes(endpointUnknownScopes, config, services);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(Error);
            }
        });
    });
});
