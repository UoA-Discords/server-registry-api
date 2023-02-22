import express from 'express';
import request from 'supertest';
import { siteErrorHandler } from '../middleware/siteErrorHandler';
import { makeSiteToken } from '../services/AuthService/siteToken';
import { mockConfig } from '../tests/mockConfig';
import { mockOAuthResult } from '../tests/mockOAuthResult';
import { mockUser } from '../tests/mockUser';
import { AppModels } from '../types/Database/AppModels';
import { EndpointProvider, AuthScopes, DatabaseScopes } from '../types/Express/EndpointProvider';
import { User } from '../types/User';
import { UserPermissions } from '../types/User/UserPermissions';

import { withScopes } from './withScopes';

describe('withScopes', () => {
    const config = mockConfig();

    const providerNoScopes: EndpointProvider<
        AuthScopes.None,
        DatabaseScopes.None,
        void,
        { auth: boolean; user: boolean; db: boolean }
    > = {
        auth: AuthScopes.None,
        database: DatabaseScopes.None,
        permissionsRequired: null,
        applyToRoute: ({ auth, user, db }) => {
            return (_req, res) =>
                res.status(200).send({
                    auth: !!auth,
                    user: !!user,
                    db: !!db,
                });
        },
    };

    describe('no scopes', () => {
        it('functions without a database nor authorization header', async () => {
            const app = express();
            app.get('/', withScopes(providerNoScopes, config));

            const res = await request(app).get('/');

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual({ auth: false, user: false, db: false });
        });
    });

    describe('database scopes', () => {
        describe("scope: 'None'", () => {
            it("doesn't provide a database if present", async () => {
                const app = express();
                app.get('/', withScopes(providerNoScopes, config, {} as AppModels));

                const res = await request(app).get('/');

                expect(res.statusCode).toBe(200);
                expect(res.body).toEqual({ auth: false, user: false, db: false });
            });
        });

        describe("scope: 'Access'", () => {
            const providerAccessScopes: EndpointProvider<
                AuthScopes.None,
                DatabaseScopes.Access,
                void,
                { auth: boolean; user: boolean; db: boolean }
            > = {
                auth: AuthScopes.None,
                database: DatabaseScopes.Access,
                permissionsRequired: null,
                applyToRoute: ({ auth, user, db }) => {
                    return (_req, res) =>
                        res.status(200).send({
                            auth: !!auth,
                            user: !!user,
                            db: !!db,
                        });
                },
            };

            it('functions with a database', async () => {
                const app = express();
                app.get('/', withScopes(providerAccessScopes, config, {} as AppModels));

                const res = await request(app).get('/');

                expect(res.statusCode).toBe(200);
                expect(res.body).toEqual({ auth: false, user: false, db: true });
            });

            it('returns status code 501 when a database is not present', async () => {
                const app = express();
                app.get('/', withScopes(providerAccessScopes, config));

                const res = await request(app).get('/');
                expect(res.statusCode).toBe(501);
            });
        });
    });

    describe('auth scopes', () => {
        const dummyAuthentication = `Bearer ${makeSiteToken(config, mockOAuthResult, 'withScopes test user id')}`;

        describe("scope: 'None'", () => {
            it("doesn't authenticate if an authorization header is provided", async () => {
                const app = express();
                app.get('/', withScopes(providerNoScopes, config));

                const res = await request(app).get('/').set('Authorization', dummyAuthentication);

                expect(res.statusCode).toBe(200);
                expect(res.body).toEqual({ auth: false, user: false, db: false });
            });
        });

        describe("scope: 'TokenOnly'", () => {
            const providerTokenScopes: EndpointProvider<
                AuthScopes.TokenOnly,
                DatabaseScopes.None,
                void,
                { auth: boolean; user: boolean; db: boolean }
            > = {
                auth: AuthScopes.TokenOnly,
                database: DatabaseScopes.None,
                permissionsRequired: null,
                applyToRoute: ({ auth, user, db }) => {
                    return (_req, res) =>
                        res.status(200).send({
                            auth: !!auth,
                            user: !!user,
                            db: !!db,
                        });
                },
            };

            it('functions when an authorization header is provided', async () => {
                const app = express();
                app.get('/', withScopes(providerTokenScopes, config));

                const res = await request(app).get('/').set('Authorization', dummyAuthentication);

                expect(res.statusCode).toBe(200);
                expect(res.body).toEqual({ auth: true, user: false, db: false });
            });

            it('returns status code 401 when an authorization header is not provided', async () => {
                const app = express();
                app.get('/', withScopes(providerTokenScopes, config));
                app.use(siteErrorHandler(config));

                const res = await request(app).get('/');
                expect(res.statusCode).toBe(401);
            });
        });

        describe("scope: 'OptionalUser'", () => {
            const providerOptionalUserScopes: EndpointProvider<
                AuthScopes.OptionalUser,
                DatabaseScopes.None,
                void,
                { auth: boolean; user: boolean; db: boolean }
            > = {
                auth: AuthScopes.OptionalUser,
                database: DatabaseScopes.None,
                permissionsRequired: null,
                applyToRoute: ({ auth, user, db }) => {
                    return (_req, res) =>
                        res.status(200).send({
                            auth: !!auth,
                            user: !!user,
                            db: !!db,
                        });
                },
            };

            it('functions when an authorization header is provided and a valid user exists', async () => {
                const app = express();
                app.get(
                    '/',
                    withScopes(providerOptionalUserScopes, config, {
                        users: { findOne: () => 1 },
                    } as unknown as AppModels),
                );

                const res = await request(app).get('/').set('Authorization', dummyAuthentication);

                expect(res.statusCode).toBe(200);
                expect(res.body).toEqual({ auth: true, user: true, db: false });
            });

            it('functions when no authorization header is provided', async () => {
                const app = express();
                app.get(
                    '/',
                    withScopes(providerOptionalUserScopes, config, {
                        users: { findOne: () => 1 },
                    } as unknown as AppModels),
                );

                const res = await request(app).get('/');

                expect(res.statusCode).toBe(200);
                expect(res.body).toEqual({ auth: false, user: false, db: false });
            });

            it('returns status code 401 when an authorization header is provided but no valid user exists', async () => {
                const app = express();
                app.get(
                    '/',
                    withScopes(providerOptionalUserScopes, config, {
                        users: { findOne: () => null },
                    } as unknown as AppModels),
                );
                app.use(siteErrorHandler(config));

                const res = await request(app).get('/').set('Authorization', dummyAuthentication);
                expect(res.statusCode).toBe(401);
            });

            it('returns status code 501 when a database is not present', async () => {
                const app = express();
                app.get('/', withScopes(providerOptionalUserScopes, config));

                const res = await request(app).get('/').set('Authorization', dummyAuthentication);
                expect(res.statusCode).toBe(501);
            });

            it('returns status code 401 when an invalid authorization header is provided', async () => {
                const app = express();
                app.get(
                    '/',
                    withScopes(providerOptionalUserScopes, config, {
                        users: { findOne: () => null },
                    } as unknown as AppModels),
                );
                app.use(siteErrorHandler(config));

                const res = await request(app).get('/').set('Authorization', 'Bearer abcdefg');
                expect(res.statusCode).toBe(401);
            });
        });

        describe("scope: 'User'", () => {
            describe('without permissions', () => {
                const providerUserNoPermsScopes: EndpointProvider<
                    AuthScopes.User,
                    DatabaseScopes.None,
                    void,
                    { auth: boolean; user: boolean; db: boolean }
                > = {
                    auth: AuthScopes.User,
                    database: DatabaseScopes.None,
                    permissionsRequired: null,
                    applyToRoute: ({ auth, user, db }) => {
                        return (_req, res) =>
                            res.status(200).send({
                                auth: !!auth,
                                user: !!user,
                                db: !!db,
                            });
                    },
                };

                it('functions when an authorization header is provided and a valid user exists', async () => {
                    const app = express();
                    app.get(
                        '/',
                        withScopes(providerUserNoPermsScopes, config, {
                            users: { findOne: () => 1 },
                        } as unknown as AppModels),
                    );

                    const res = await request(app).get('/').set('Authorization', dummyAuthentication);

                    expect(res.statusCode).toBe(200);
                    expect(res.body).toEqual({ auth: true, user: true, db: false });
                });

                it('returns status code 401 when no authorization header is provided', async () => {
                    const app = express();
                    app.get(
                        '/',
                        withScopes(providerUserNoPermsScopes, config, {
                            users: { findOne: () => 1 },
                        } as unknown as AppModels),
                    );
                    app.use(siteErrorHandler(config));

                    const res = await request(app).get('/');
                    expect(res.statusCode).toBe(401);
                });

                it('returns status code 401 when an authorization header is provided but no valid user exists', async () => {
                    const app = express();
                    app.get(
                        '/',
                        withScopes(providerUserNoPermsScopes, config, {
                            users: { findOne: () => null },
                        } as unknown as AppModels),
                    );
                    app.use(siteErrorHandler(config));

                    const res = await request(app).get('/').set('Authorization', dummyAuthentication);
                    expect(res.statusCode).toBe(401);
                });

                it('returns status code 501 when a database is not present', async () => {
                    const app = express();
                    app.get('/', withScopes(providerUserNoPermsScopes, config));

                    const res = await request(app).get('/').set('Authorization', dummyAuthentication);
                    expect(res.statusCode).toBe(501);
                });
            });

            describe('with permissions', () => {
                const providerUserPermsScopes: EndpointProvider<
                    AuthScopes.User,
                    DatabaseScopes.None,
                    void,
                    { auth: boolean; user: boolean; db: boolean }
                > = {
                    auth: AuthScopes.User,
                    database: DatabaseScopes.None,
                    permissionsRequired: UserPermissions.Favourite | UserPermissions.Feature,
                    applyToRoute: ({ auth, user, db }) => {
                        return (_req, res) =>
                            res.status(200).send({
                                auth: !!auth,
                                user: !!user,
                                db: !!db,
                            });
                    },
                };

                it('functions when permissions are valid or invalid', async () => {
                    const tempUser: User<true> = {
                        ...mockUser,
                        permissions:
                            UserPermissions.Favourite | UserPermissions.Feature | UserPermissions.MakeApplications,
                    };

                    const app = express();
                    app.get(
                        '/',
                        withScopes(providerUserPermsScopes, config, {
                            users: { findOne: () => tempUser },
                        } as unknown as AppModels),
                    );
                    app.use(siteErrorHandler(config));

                    const res = await request(app).get('/').set('Authorization', dummyAuthentication);

                    expect(res.statusCode).toBe(200);
                    expect(res.body).toEqual({ auth: true, user: true, db: false });

                    tempUser.permissions = UserPermissions.MakeApplications;

                    const res2 = await request(app).get('/').set('Authorization', dummyAuthentication);
                    expect(res2.statusCode).toBe(403);
                });
            });
        });

        describe('unknown scopes', () => {
            const providerUnknownAuthScopes: EndpointProvider<AuthScopes, DatabaseScopes, void, void> = {
                auth: -1,
                database: DatabaseScopes.None,
                permissionsRequired: null,
                applyToRoute: () => () => null,
            };

            const providerUnknownDatabaseScopes: EndpointProvider<AuthScopes, DatabaseScopes, void, void> = {
                auth: AuthScopes.None,
                database: -1,
                permissionsRequired: null,
                applyToRoute: () => () => null,
            };

            it('throws an error for unknown auth scopes', () => {
                try {
                    withScopes(providerUnknownAuthScopes, config);
                    fail('should have thrown an error');
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                }
            });

            it('throws an error for unknown database scopes', () => {
                try {
                    withScopes(providerUnknownDatabaseScopes, config);
                    fail('should have thrown an error');
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                }
            });
        });
    });
});
