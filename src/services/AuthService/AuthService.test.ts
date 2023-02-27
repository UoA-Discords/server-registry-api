import axios from 'axios';
import { APIUser, OAuth2Routes, RESTPostOAuth2AccessTokenResult, RouteBases } from 'discord-api-types/v10';
import { JsonWebTokenError, sign, TokenExpiredError, verify } from 'jsonwebtoken';
import { AuthError } from '../../errors/AuthError';
import { NotFoundError } from '../../errors/NotFoundError';
import { SecondaryRequestError } from '../../errors/SecondaryRequestError';
import { mockedConfig } from '../../tests/mockedConfig';
import { mockedOAuthResult } from '../../tests/mockedOAuthResult';
import { mockedUserService } from '../../tests/mockedServices';
import { mockedAPIUser } from '../../tests/mockedAPIUser';
import { LoginOrSignupResponse } from '../../types/Auth/LoginOrSignupResponse';
import { SiteTokenPayload } from '../../types/Auth/SiteTokenPayload';
import { AuthService } from './AuthService';
import { mockedUser } from '../../tests/mockedUser';

jest.mock('axios');
jest.mock('jsonwebtoken');

const mockedAxios = jest.mocked(axios);
const mockedVerify = jest.mocked(verify);
const mockedSign = jest.mocked(sign);

describe('AuthService', () => {
    const userService = mockedUserService;
    const authService = new AuthService(mockedConfig, userService);

    describe(authService.loginOrSignup.name, () => {
        const requestAccessToken: AuthService['requestAccessToken'] = jest.fn(() => Promise.resolve(mockedOAuthResult));
        const getAssociatedUser: AuthService['getAssociatedUser'] = jest.fn(() => Promise.resolve(mockedAPIUser));
        const makeSiteToken: AuthService['makeSiteToken'] = jest.fn(() => 'some token');

        const spies: jest.SpyInstance[] = new Array(3);

        beforeAll(() => {
            spies[0] = jest
                .spyOn(
                    authService as unknown as { requestAccessToken: AuthService['requestAccessToken'] },
                    'requestAccessToken',
                )
                .mockImplementation(requestAccessToken);

            spies[1] = jest
                .spyOn(
                    authService as unknown as { getAssociatedUser: AuthService['getAssociatedUser'] },
                    'getAssociatedUser',
                )
                .mockImplementation(getAssociatedUser);

            spies[2] = jest
                .spyOn(authService as unknown as { makeSiteToken: AuthService['makeSiteToken'] }, 'makeSiteToken')
                .mockImplementation(makeSiteToken);

            userService.refreshExistingUser.mockResolvedValue(mockedUser);
            userService.createNewUser.mockResolvedValue(mockedUser);
        });

        afterAll(() => {
            spies.forEach((e) => e.mockReset());
            userService.refreshExistingUser.mockReset();
            userService.createNewUser.mockReset();
        });

        describe('when the user already exists', () => {
            let returnedLoginOrSignupResponse: LoginOrSignupResponse;

            beforeAll(async () => {
                returnedLoginOrSignupResponse = await authService.loginOrSignup(
                    'some code',
                    'some redirect uri',
                    'some ip',
                );
            });

            afterAll(() => {
                jest.clearAllMocks();
            });

            it('requests an access token', () => {
                expect(requestAccessToken).toBeCalledTimes(1);
                expect(requestAccessToken).toBeCalledWith('some code', 'some redirect uri');
            });

            it('gets the associated user', () => {
                expect(getAssociatedUser).toBeCalledTimes(1);
                expect(getAssociatedUser).toBeCalledWith(mockedOAuthResult.access_token);
            });

            it("calls the 'getUserById' method of the user service", () => {
                expect(userService.getUserById).toBeCalledTimes(1);
                expect(userService.getUserById).toBeCalledWith(mockedAPIUser.id);
            });

            it("calls the 'refreshExistingUser' method of the user service", () => {
                expect(userService.refreshExistingUser).toBeCalledTimes(1);
                expect(userService.refreshExistingUser).toBeCalledWith(mockedAPIUser, 'some ip');
            });

            it('generates a site token', () => {
                expect(makeSiteToken).toBeCalledTimes(1);
                expect(makeSiteToken).toBeCalledWith(mockedOAuthResult, mockedAPIUser.id);
            });

            it('returns the expected response', () => {
                expect(returnedLoginOrSignupResponse).toEqual<LoginOrSignupResponse>({
                    user: mockedUser,
                    discordAuth: mockedOAuthResult,
                    siteAuth: 'some token',
                });
            });
        });

        describe('when the user does not exist', () => {
            let returnedLoginOrSignupResponse: LoginOrSignupResponse;

            beforeAll(async () => {
                userService.getUserById.mockImplementationOnce(() => {
                    throw new NotFoundError('server');
                });

                returnedLoginOrSignupResponse = await authService.loginOrSignup(
                    'some code',
                    'some redirect uri',
                    'some ip',
                );
            });

            afterAll(() => {
                jest.clearAllMocks();
            });

            it('requests an access token', () => {
                expect(requestAccessToken).toBeCalledTimes(1);
                expect(requestAccessToken).toBeCalledWith('some code', 'some redirect uri');
            });

            it('gets the associated user', () => {
                expect(getAssociatedUser).toBeCalledTimes(1);
                expect(getAssociatedUser).toBeCalledWith(mockedOAuthResult.access_token);
            });

            it("calls the 'getUserById' method of the user service", () => {
                expect(userService.getUserById).toBeCalledTimes(1);
                expect(userService.getUserById).toBeCalledWith(mockedAPIUser.id);
            });

            it("calls the 'createNewUser' method of the user service", () => {
                expect(userService.createNewUser).toBeCalledTimes(1);
                expect(userService.createNewUser).toBeCalledWith(mockedAPIUser, 'some ip');
            });

            it('generates a site token', () => {
                expect(makeSiteToken).toBeCalledTimes(1);
                expect(makeSiteToken).toBeCalledWith(mockedOAuthResult, mockedAPIUser.id);
            });

            it('returns the expected response', () => {
                expect(returnedLoginOrSignupResponse).toEqual<LoginOrSignupResponse>({
                    user: mockedUser,
                    discordAuth: mockedOAuthResult,
                    siteAuth: 'some token',
                });
            });

            it('throws all errors other than NotFoundError', async () => {
                userService.getUserById.mockImplementationOnce(() => {
                    throw new Error();
                });

                try {
                    await authService.loginOrSignup('some code', 'some redirect uri', 'some ip');
                    fail('should have thrown an error');
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                }
            });
        });
    });

    describe(authService.refresh.name, () => {
        const refreshAccessToken: AuthService['refreshAccessToken'] = jest.fn(() => Promise.resolve(mockedOAuthResult));
        const getAssociatedUser: AuthService['getAssociatedUser'] = jest.fn(() => Promise.resolve(mockedAPIUser));
        const makeSiteToken: AuthService['makeSiteToken'] = jest.fn(() => 'some token');

        let returnedLoginOrSignupResponse: LoginOrSignupResponse;

        beforeAll(async () => {
            const spy1 = jest
                .spyOn(
                    authService as unknown as { refreshAccessToken: AuthService['refreshAccessToken'] },
                    'refreshAccessToken',
                )
                .mockImplementation(refreshAccessToken);

            const spy2 = jest
                .spyOn(
                    authService as unknown as { getAssociatedUser: AuthService['getAssociatedUser'] },
                    'getAssociatedUser',
                )
                .mockImplementation(getAssociatedUser);

            const spy3 = jest
                .spyOn(authService as unknown as { makeSiteToken: AuthService['makeSiteToken'] }, 'makeSiteToken')
                .mockImplementation(makeSiteToken);

            userService.refreshExistingUser.mockResolvedValue(mockedUser);

            returnedLoginOrSignupResponse = await authService.refresh('some refresh token', 'some ip');

            [spy1, spy2, spy3].forEach((e) => e.mockReset());
        });

        afterAll(() => {
            userService.refreshExistingUser.mockReset();
        });

        it('refreshes an access token', () => {
            expect(refreshAccessToken).toBeCalledTimes(1);
            expect(refreshAccessToken).toBeCalledWith('some refresh token');
        });

        it('gets the associated user', () => {
            expect(getAssociatedUser).toBeCalledTimes(1);
            expect(getAssociatedUser).toBeCalledWith(mockedOAuthResult.access_token);
        });

        it("calls the 'refreshExistingUser' method of the user service", () => {
            expect(userService.refreshExistingUser).toBeCalledTimes(1);
            expect(userService.refreshExistingUser).toBeCalledWith(mockedAPIUser, 'some ip');
        });

        it('generates a site token', () => {
            expect(makeSiteToken).toBeCalledTimes(1);
            expect(makeSiteToken).toBeCalledWith(mockedOAuthResult, mockedAPIUser.id);
        });

        it('returns the expected response', () => {
            expect(returnedLoginOrSignupResponse).toEqual<LoginOrSignupResponse>({
                user: mockedUser,
                discordAuth: mockedOAuthResult,
                siteAuth: 'some token',
            });
        });
    });

    describe(authService.logout.name, () => {
        const revokeAccessToken: AuthService['revokeAccessToken'] = jest.fn();

        beforeAll(async () => {
            const spy = jest
                .spyOn(
                    authService as unknown as { revokeAccessToken: AuthService['revokeAccessToken'] },
                    'revokeAccessToken',
                )
                .mockImplementation(revokeAccessToken);

            await authService.logout('some token');

            spy.mockRestore();
        });

        it("calls the 'revokeAccessToken' method", () => {
            expect(revokeAccessToken).toBeCalledTimes(1);
            expect(revokeAccessToken).toBeCalledWith('some token');
        });
    });

    describe(authService.validateSiteToken.name, () => {
        afterAll(() => {
            mockedVerify.mockReset();
        });

        it('throws an AuthError if the token is missing', () => {
            expect(() => authService.validateSiteToken(undefined)).toThrow(AuthError);
        });

        it('throws an AuthError if the token cannot be verified', () => {
            mockedVerify.mockImplementationOnce(() => {
                throw new JsonWebTokenError('some error');
            });

            expect(() => authService.validateSiteToken('some token')).toThrow(AuthError);
        });

        it('throws an AuthError if the token has expired', () => {
            mockedVerify.mockImplementationOnce(() => {
                throw new TokenExpiredError('some error', new Date());
            });

            expect(() => authService.validateSiteToken('some token')).toThrow(AuthError);
        });

        it('throws an AuthError if token verification throws an unexpected error', () => {
            mockedVerify.mockImplementationOnce(() => {
                throw new Error();
            });

            expect(() => authService.validateSiteToken('some token')).toThrow(AuthError);
        });

        it('throws an AuthError if the token has no expiry date', () => {
            mockedVerify.mockReturnValueOnce({} as unknown as undefined);

            expect(() => authService.validateSiteToken('some token')).toThrow(AuthError);
        });

        it('throws an AuthError if the token payload is a string', () => {
            mockedVerify.mockReturnValueOnce('some payload' as unknown as undefined);

            expect(() => authService.validateSiteToken('some token')).toThrow(AuthError);
        });

        it("throws an AuthError if the token payload has no 'id' field", () => {
            mockedVerify.mockReturnValueOnce({ exp: 0 } as unknown as undefined);

            expect(() => authService.validateSiteToken('some token')).toThrow(AuthError);
        });

        it("throws an AuthError if the token payload has no 'access_token' field", () => {
            mockedVerify.mockReturnValueOnce({ exp: 0, id: 'some id' } as unknown as undefined);

            expect(() => authService.validateSiteToken('some token')).toThrow(AuthError);
        });

        it("throws an AuthError if the token payload has no 'refresh_token' field", () => {
            mockedVerify.mockReturnValueOnce({
                exp: 0,
                id: 'some id',
                access_token: 'some access token',
            } as unknown as undefined);

            expect(() => authService.validateSiteToken('some token')).toThrow(AuthError);
        });

        it('returns a SiteTokenPayload', () => {
            mockedVerify.mockReturnValueOnce({
                exp: 0,
                id: 'some id',
                access_token: 'some access token',
                refresh_token: 'some refresh token',
            } as unknown as undefined);

            expect(authService.validateSiteToken('some token')).toEqual<SiteTokenPayload>({
                id: 'some id',
                access_token: 'some access token',
                refresh_token: 'some refresh token',
            });
        });
    });

    describe(authService['makeSiteToken'].name, () => {
        let returnedToken: string;

        beforeAll(() => {
            mockedSign.mockReturnValueOnce('some site token' as unknown as undefined);

            returnedToken = authService['makeSiteToken'](mockedOAuthResult, 'some id');
        });

        afterAll(() => {
            mockedSign.mockReset();
        });

        it('calls the JWT signing function', () => {
            expect(mockedSign).toBeCalledTimes(1);
            expect(mockedSign).toBeCalledWith(
                {
                    id: 'some id',
                    access_token: mockedOAuthResult.access_token,
                    refresh_token: mockedOAuthResult.refresh_token,
                },
                mockedConfig.jwtSecret,
                { expiresIn: mockedOAuthResult.expires_in },
            );
        });

        it('returns the signed token', () => {
            expect(returnedToken).toBe('some site token');
        });
    });

    describe(authService['getAssociatedUser'].name, () => {
        describe('when the user exists', () => {
            let returnedUser: APIUser;

            beforeAll(async () => {
                mockedAxios.get.mockResolvedValueOnce({ data: mockedAPIUser });

                returnedUser = await authService['getAssociatedUser']('some access token');
            });

            afterAll(() => {
                mockedAxios.get.mockReset();
            });

            it('makes a Discord API call', () => {
                expect(mockedAxios.get).toBeCalledTimes(1);
                expect(mockedAxios.get).toBeCalledWith(`${RouteBases.api}/users/@me`, {
                    headers: {
                        authorization: 'Bearer some access token',
                        'Accept-Encoding': 'application/json',
                    },
                });
            });

            it('returns the user', () => {
                expect(returnedUser).toEqual(mockedAPIUser);
            });
        });

        describe('when the user does not exist', () => {
            beforeAll(() => {
                mockedAxios.get.mockImplementationOnce(() => {
                    throw new Error();
                });
            });

            afterAll(() => {
                mockedAxios.get.mockReset();
            });

            it('throws a SecondaryRequestError', async () => {
                try {
                    await authService['getAssociatedUser']('some access token');
                    fail('should have thrown an error');
                } catch (error) {
                    expect(error).toBeInstanceOf(SecondaryRequestError);
                }
            });
        });
    });

    describe(authService['makeRequestBody'].name, () => {
        it('returns a request body', () => {
            const returnedBody = authService['makeRequestBody']();

            expect(returnedBody.get('client_id')).toEqual(mockedConfig.discordClientId);
            expect(returnedBody.get('client_secret')).toEqual(mockedConfig.discordClientSecret);
        });
    });

    describe(authService['requestAccessToken'].name, () => {
        describe('when the request succeeds', () => {
            let makeRequestBody: jest.SpyInstance;

            let returnedOAuthResult: RESTPostOAuth2AccessTokenResult;

            beforeAll(async () => {
                makeRequestBody = jest.spyOn(
                    authService as unknown as { makeRequestBody: AuthService['makeRequestBody'] },
                    'makeRequestBody',
                );

                mockedAxios.post.mockResolvedValueOnce({ data: mockedOAuthResult });

                returnedOAuthResult = await authService['requestAccessToken']('some code', 'some redirect uri');
            });

            afterAll(() => {
                makeRequestBody.mockRestore();
                mockedAxios.post.mockReset();
            });

            it("calls the 'makeRequestBody' method", () => {
                expect(makeRequestBody).toBeCalledTimes(1);
            });

            it('makes a Discord API call', () => {
                expect(mockedAxios.post).toBeCalledTimes(1);
                expect(mockedAxios.post).toBeCalledWith(OAuth2Routes.tokenURL, expect.any(URLSearchParams), {
                    headers: {
                        'Accept-Encoding': 'application/json',
                    },
                });
            });

            it('returns the OAuth result', () => {
                expect(returnedOAuthResult).toEqual(mockedOAuthResult);
            });
        });

        describe('when the request fails', () => {
            beforeAll(() => {
                mockedAxios.post.mockImplementationOnce(() => {
                    throw new Error();
                });
            });

            afterAll(() => {
                mockedAxios.post.mockReset();
            });

            it('throws a SecondaryRequestError', async () => {
                try {
                    await authService['requestAccessToken']('some code', 'some redirect uri');
                    fail('should have thrown an error');
                } catch (error) {
                    expect(error).toBeInstanceOf(SecondaryRequestError);
                }
            });
        });
    });

    describe(authService['refreshAccessToken'].name, () => {
        describe('when the request succeeds', () => {
            let makeRequestBody: jest.SpyInstance;

            let returnedOAuthResult: RESTPostOAuth2AccessTokenResult;

            beforeAll(async () => {
                makeRequestBody = jest.spyOn(
                    authService as unknown as { makeRequestBody: AuthService['makeRequestBody'] },
                    'makeRequestBody',
                );

                mockedAxios.post.mockResolvedValueOnce({ data: mockedOAuthResult });

                returnedOAuthResult = await authService['refreshAccessToken']('some refresh token');
            });

            afterAll(() => {
                makeRequestBody.mockRestore();
                mockedAxios.post.mockReset();
            });

            it("calls the 'makeRequestBody' method", () => {
                expect(makeRequestBody).toBeCalledTimes(1);
            });

            it('makes a Discord API call', () => {
                expect(mockedAxios.post).toBeCalledTimes(1);
                expect(mockedAxios.post).toBeCalledWith(OAuth2Routes.tokenURL, expect.any(URLSearchParams), {
                    headers: {
                        'Accept-Encoding': 'application/json',
                    },
                });
            });

            it('returns the OAuth result', () => {
                expect(returnedOAuthResult).toEqual(mockedOAuthResult);
            });
        });

        describe('when the request fails', () => {
            beforeAll(() => {
                mockedAxios.post.mockImplementationOnce(() => {
                    throw new Error();
                });
            });

            afterAll(() => {
                mockedAxios.post.mockReset();
            });

            it('throws a SecondaryRequestError', async () => {
                try {
                    await authService['refreshAccessToken']('some refresh token');
                    fail('should have thrown an error');
                } catch (error) {
                    expect(error).toBeInstanceOf(SecondaryRequestError);
                }
            });
        });
    });

    describe(authService['revokeAccessToken'].name, () => {
        describe('when the request succeeds', () => {
            let makeRequestBody: jest.SpyInstance;

            beforeAll(async () => {
                makeRequestBody = jest.spyOn(
                    authService as unknown as { makeRequestBody: AuthService['makeRequestBody'] },
                    'makeRequestBody',
                );

                await authService['revokeAccessToken']('some access token');
            });

            afterAll(() => {
                makeRequestBody.mockRestore();
            });

            it("calls the 'makeRequestBody' method", () => {
                expect(makeRequestBody).toBeCalledTimes(1);
            });

            it('makes a Discord API call', () => {
                expect(mockedAxios.post).toBeCalledTimes(1);
                expect(mockedAxios.post).toBeCalledWith(OAuth2Routes.tokenRevocationURL, expect.any(URLSearchParams));
            });
        });

        describe('when the request fails', () => {
            beforeAll(() => {
                mockedAxios.post.mockImplementationOnce(() => {
                    throw new Error();
                });
            });

            afterAll(() => {
                mockedAxios.post.mockReset();
            });

            it('throws a SecondaryRequestError', async () => {
                try {
                    await authService['revokeAccessToken']('some access token');
                    fail('should have thrown an error');
                } catch (error) {
                    expect(error).toBeInstanceOf(SecondaryRequestError);
                }
            });
        });
    });
});
