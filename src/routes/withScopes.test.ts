import { AuthError } from '../errors/AuthError';
import { ForbiddenError } from '../errors/ForbiddenError';
import { NotFoundError } from '../errors/NotFoundError';
import { siteErrorHandler } from '../middleware';
import { PermissionService } from '../services/PermissionService';
import { mockedConfig } from '../tests/mockedConfig';
import { mockedAuthService, mockedUserService, mockedServerService } from '../tests/mockedServices';
import { mockedUser } from '../tests/mockedUser';
import { stubApp } from '../tests/stubApp';
import { SiteTokenPayload } from '../types/Auth/SiteTokenPayload';
import { AuthScopes, EndpointProviderReturnValue } from '../types/Express/EndpointProvider';
import { AppServices } from '../types/Services';
import { UserPermissions } from '../types/User/UserPermissions';
import { withScopes } from './withScopes';

interface ScopeTestEndpointReturnValue {
    auth: boolean;
    user: boolean;
}

const services: AppServices = {
    authService: mockedAuthService,
    userService: mockedUserService,
    serverService: mockedServerService,
};

function makeScopedEndpoint<T extends AuthScopes>(
    auth: T,
    permissions?: T extends AuthScopes.User ? UserPermissions : never,
): EndpointProviderReturnValue<unknown, unknown, object, object> {
    return withScopes(
        {
            auth,
            permissionsRequired: permissions !== undefined ? permissions : null,
            applyToRoute({ auth, user }) {
                return (_req, res) =>
                    res.status(200).json({
                        auth: !!auth,
                        user: !!user,
                    });
            },
        },
        mockedConfig,
        services,
    );
}

describe('withScopes', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe(AuthScopes[AuthScopes.None], () => {
        const app = stubApp(mockedConfig, [], [], makeScopedEndpoint(AuthScopes.None));

        it('supplies no scopes to the route', async () => {
            const res = await app.get('/');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual<ScopeTestEndpointReturnValue>({
                auth: false,
                user: false,
            });
        });
    });

    describe(AuthScopes[AuthScopes.TokenOnly], () => {
        const app = stubApp(mockedConfig, [], [siteErrorHandler], makeScopedEndpoint(AuthScopes.TokenOnly));

        it('throws an AuthError when token validation fails', async () => {
            mockedAuthService.validateSiteToken.mockImplementationOnce(() => {
                throw new AuthError('', '');
            });

            const res = await app.get('/');

            expect(res.statusCode).toBe(401);

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(1);
        });

        it('allows valid tokens to access the route', async () => {
            mockedAuthService.validateSiteToken.mockReturnValueOnce({} as SiteTokenPayload);

            const res = await app.get('/');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual<ScopeTestEndpointReturnValue>({
                auth: true,
                user: false,
            });

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(1);
        });
    });

    describe(AuthScopes[AuthScopes.OptionalUser], () => {
        const app = stubApp(mockedConfig, [], [siteErrorHandler], makeScopedEndpoint(AuthScopes.OptionalUser));

        it('throws an AuthError when token validation fails', async () => {
            mockedAuthService.validateSiteToken.mockImplementationOnce(() => {
                throw new AuthError('', '');
            });

            const res = await app.get('/').set('Authorization', 'some bearer token');

            expect(res.statusCode).toBe(401);

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(1);
            expect(mockedUserService.getUserById).toBeCalledTimes(0);
        });

        it("throws a NotFoundError when the user doesn't exist", async () => {
            mockedAuthService.validateSiteToken.mockReturnValueOnce({ id: 'some id' } as SiteTokenPayload);
            mockedUserService.getUserById.mockImplementationOnce(() => {
                throw new NotFoundError('user');
            });

            const res = await app.get('/').set('Authorization', 'some bearer token');

            expect(res.statusCode).toBe(404);

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(1);
            expect(mockedUserService.getUserById).toBeCalledTimes(1);
        });

        it('allows valid tokens to access the route', async () => {
            mockedAuthService.validateSiteToken.mockReturnValueOnce({ id: 'some id' } as SiteTokenPayload);
            mockedUserService.getUserById.mockResolvedValueOnce(mockedUser);

            const res = await app.get('/').set('Authorization', 'some bearer token');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual<ScopeTestEndpointReturnValue>({
                auth: true,
                user: true,
            });

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(1);
            expect(mockedUserService.getUserById).toBeCalledTimes(1);
        });

        it('allows omitted tokens to access the route', async () => {
            const res = await app.get('/');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual<ScopeTestEndpointReturnValue>({
                auth: false,
                user: false,
            });

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(0);
            expect(mockedUserService.getUserById).toBeCalledTimes(0);
        });
    });

    describe(AuthScopes[AuthScopes.User], () => {
        const app = stubApp(mockedConfig, [], [siteErrorHandler], makeScopedEndpoint(AuthScopes.User));

        it('throws an AuthError when token validation fails', async () => {
            mockedAuthService.validateSiteToken.mockImplementationOnce(() => {
                throw new AuthError('', '');
            });

            const res = await app.get('/');

            expect(res.statusCode).toBe(401);

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(1);
            expect(mockedUserService.getUserById).toBeCalledTimes(0);
        });

        it("throws an NotFoundError when user doesn't exist", async () => {
            mockedAuthService.validateSiteToken.mockReturnValueOnce({ id: 'some id' } as SiteTokenPayload);
            mockedUserService.getUserById.mockImplementationOnce(() => {
                throw new NotFoundError('user');
            });

            const res = await app.get('/');

            expect(res.statusCode).toBe(404);

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(1);
            expect(mockedUserService.getUserById).toBeCalledTimes(1);
        });

        it('allows valid tokens to access the route', async () => {
            mockedAuthService.validateSiteToken.mockReturnValueOnce({ id: 'some id' } as SiteTokenPayload);
            mockedUserService.getUserById.mockResolvedValueOnce(mockedUser);

            const res = await app.get('/');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual<ScopeTestEndpointReturnValue>({
                auth: true,
                user: true,
            });

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(1);
            expect(mockedUserService.getUserById).toBeCalledTimes(1);
        });
    });

    describe(AuthScopes[AuthScopes.User] + ' (+ Permissions Required)', () => {
        let checkHasPermissions: jest.SpyInstance;

        beforeAll(() => {
            checkHasPermissions = jest.spyOn(PermissionService, 'checkHasPermissions');
        });

        afterAll(() => {
            checkHasPermissions.mockRestore();
        });

        const app = stubApp(
            mockedConfig,
            [],
            [siteErrorHandler],
            makeScopedEndpoint(AuthScopes.User, UserPermissions.ManageUsers),
        );

        it('throws an AuthError when token validation fails', async () => {
            mockedAuthService.validateSiteToken.mockImplementationOnce(() => {
                throw new AuthError('', '');
            });

            const res = await app.get('/');

            expect(res.statusCode).toBe(401);

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(1);
            expect(mockedUserService.getUserById).toBeCalledTimes(0);
            expect(checkHasPermissions).toBeCalledTimes(0);
        });

        it("throws an NotFoundError when user doesn't exist", async () => {
            mockedAuthService.validateSiteToken.mockReturnValueOnce({ id: 'some id' } as SiteTokenPayload);
            mockedUserService.getUserById.mockImplementationOnce(() => {
                throw new NotFoundError('user');
            });

            const res = await app.get('/');

            expect(res.statusCode).toBe(404);

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(1);
            expect(mockedUserService.getUserById).toBeCalledTimes(1);
            expect(checkHasPermissions).toBeCalledTimes(0);
        });

        it("throws a ForbiddenErrorA when the user doesn't have the required permissions", async () => {
            mockedAuthService.validateSiteToken.mockReturnValueOnce({ id: 'some id' } as SiteTokenPayload);
            mockedUserService.getUserById.mockResolvedValueOnce(mockedUser);
            checkHasPermissions.mockImplementationOnce(() => {
                throw new ForbiddenError(UserPermissions.None);
            });

            const res = await app.get('/');

            expect(res.statusCode).toBe(403);

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(1);
            expect(mockedUserService.getUserById).toBeCalledTimes(1);
            expect(checkHasPermissions).toBeCalledTimes(1);
            expect(checkHasPermissions).toBeCalledWith(mockedUser, UserPermissions.ManageUsers);
        });

        it('allows valid users to access the route', async () => {
            mockedAuthService.validateSiteToken.mockReturnValueOnce({ id: 'some id' } as SiteTokenPayload);
            mockedUserService.getUserById.mockResolvedValueOnce(mockedUser);
            checkHasPermissions.mockReturnValueOnce(true);

            const res = await app.get('/');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual<ScopeTestEndpointReturnValue>({
                auth: true,
                user: true,
            });

            expect(mockedAuthService.validateSiteToken).toBeCalledTimes(1);
            expect(mockedUserService.getUserById).toBeCalledTimes(1);
            expect(checkHasPermissions).toBeCalledTimes(1);
            expect(checkHasPermissions).toBeCalledWith(mockedUser, UserPermissions.ManageUsers);
        });
    });
});
