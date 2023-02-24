/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import {
    APIUser,
    OAuth2Routes,
    RESTPostOAuth2AccessTokenResult,
    RESTPostOAuth2RefreshTokenResult,
    RouteBases,
} from 'discord-api-types/v10';
import jwt, { JsonWebTokenError, sign, TokenExpiredError, verify } from 'jsonwebtoken';
import { AuthError } from '../errors/AuthError';
import { SecondaryRequestError } from '../errors/SecondaryRequestError';
import { mockConfig } from '../tests/mockConfig';
import { mockedOAuthResult } from '../tests/mockedOAuthResult';
import { mockedAPIUser, mockedUser } from '../tests/mockedUser';
import { LoginOrSignupResponse } from '../types/Auth/LoginOrSignupResponse';
import { SiteTokenPayload } from '../types/Auth/SiteTokenPayload';
import { User } from '../types/User';
import { AuthService } from './AuthService';
import { UserService } from './UserService';

jest.mock('axios');
jest.mock('jsonwebtoken');

const { sign: actualSign, verify: actualVerify } = jest.requireActual<typeof jwt>('jsonwebtoken');

const mockedAxios = jest.mocked(axios);
const mockedVerify = jest.mocked(verify);
const mockedSign = jest.mocked(sign);

describe('AuthService', () => {
    const config = mockConfig();
    const authService = new AuthService(config, {} as UserService);

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('loginOrSignUp', () => {
        const requestAccessToken = jest.fn<RESTPostOAuth2AccessTokenResult, any>(() => mockedOAuthResult);
        const getAssociatedUser = jest.fn<APIUser, any>(() => mockedAPIUser);
        const getUserById = jest.fn<User<true> | null, any>();
        const makeSiteToken = jest.fn(() => 'some new site token');

        it('calls signup methods when no existing user is found', async () => {
            const registerNewUser = jest.fn<User<true>, any>(() => mockedUser);
            getUserById.mockReturnValueOnce(null);

            const authService = new AuthService(config, { getUserById, registerNewUser } as unknown as UserService);

            jest.spyOn(authService as any, 'requestAccessToken').mockImplementationOnce(requestAccessToken);
            jest.spyOn(authService as any, 'getAssociatedUser').mockImplementationOnce(getAssociatedUser);
            jest.spyOn(authService as any, 'makeSiteToken').mockImplementationOnce(makeSiteToken);

            const res = await authService.loginOrSignup('some authorization code', 'some redirect URI', 'some ip');

            expect(res).toMatchObject<LoginOrSignupResponse>({
                user: mockedUser,
                discordAuth: mockedOAuthResult,
                siteAuth: 'some new site token',
            });

            expect(requestAccessToken).toBeCalledTimes(1);
            expect(requestAccessToken).toBeCalledWith('some authorization code', 'some redirect URI');

            expect(getAssociatedUser).toBeCalledTimes(1);
            expect(getAssociatedUser).toBeCalledWith(mockedOAuthResult.access_token);

            expect(registerNewUser).toBeCalledTimes(1);
            expect(registerNewUser).toBeCalledWith(mockedAPIUser, 'some ip');

            expect(makeSiteToken).toBeCalledTimes(1);
            expect(makeSiteToken).toBeCalledWith(mockedOAuthResult, mockedAPIUser.id);
        });

        it('calls refresh methods when an existing user is found', async () => {
            const refreshExistingUser = jest.fn<User<true>, any>(() => mockedUser);
            getUserById.mockReturnValueOnce(mockedUser);

            const authService = new AuthService(config, { getUserById, refreshExistingUser } as unknown as UserService);

            jest.spyOn(authService as any, 'requestAccessToken').mockImplementationOnce(requestAccessToken);
            jest.spyOn(authService as any, 'getAssociatedUser').mockImplementationOnce(getAssociatedUser);
            jest.spyOn(authService as any, 'makeSiteToken').mockImplementationOnce(makeSiteToken);

            const res = await authService.loginOrSignup('some authorization code', 'some redirect URI', 'some ip');

            expect(res).toMatchObject<LoginOrSignupResponse>({
                user: mockedUser,
                discordAuth: mockedOAuthResult,
                siteAuth: 'some new site token',
            });

            expect(requestAccessToken).toBeCalledTimes(1);
            expect(requestAccessToken).toBeCalledWith('some authorization code', 'some redirect URI');

            expect(getAssociatedUser).toBeCalledTimes(1);
            expect(getAssociatedUser).toBeCalledWith(mockedOAuthResult.access_token);

            expect(refreshExistingUser).toBeCalledTimes(1);
            expect(refreshExistingUser).toBeCalledWith(mockedAPIUser, 'some ip');

            expect(makeSiteToken).toBeCalledTimes(1);
            expect(makeSiteToken).toBeCalledWith(mockedOAuthResult, mockedAPIUser.id);
        });
    });

    describe('refresh', () => {
        it('calls all required helper methods correctly', async () => {
            const refreshAccessToken = jest.fn<RESTPostOAuth2RefreshTokenResult, any>(() => mockedOAuthResult);
            const getAssociatedUser = jest.fn<APIUser, any>(() => mockedAPIUser);
            const refreshExistingUser = jest.fn<User<true>, any>(() => mockedUser);
            const makeSiteToken = jest.fn(() => 'some new site token');

            const authService = new AuthService(config, { refreshExistingUser } as unknown as UserService);

            jest.spyOn(authService as any, 'refreshAccessToken').mockImplementationOnce(refreshAccessToken);
            jest.spyOn(authService as any, 'getAssociatedUser').mockImplementationOnce(getAssociatedUser);
            jest.spyOn(authService as any, 'makeSiteToken').mockImplementationOnce(makeSiteToken);

            const res = await authService.refresh('some refresh token', 'some ip');

            expect(res).toMatchObject<LoginOrSignupResponse>({
                user: mockedUser,
                discordAuth: mockedOAuthResult,
                siteAuth: 'some new site token',
            });

            expect(refreshAccessToken).toBeCalledTimes(1);
            expect(refreshAccessToken).toBeCalledWith('some refresh token');

            expect(getAssociatedUser).toBeCalledTimes(1);
            expect(getAssociatedUser).toBeCalledWith(mockedOAuthResult.access_token);

            expect(refreshExistingUser).toBeCalledTimes(1);
            expect(refreshExistingUser).toBeCalledWith(mockedAPIUser, 'some ip');

            expect(makeSiteToken).toBeCalledTimes(1);
            expect(makeSiteToken).toBeCalledWith(mockedOAuthResult, mockedAPIUser.id);
        });
    });

    describe('logout', () => {
        it('calls the revocation method', async () => {
            const revokeAccessToken = jest.fn();

            jest.spyOn(authService as any, 'revokeAccessToken').mockImplementationOnce(revokeAccessToken);

            await authService.logout('some access token');

            expect(revokeAccessToken).toBeCalledWith('some access token');
            expect(revokeAccessToken).toBeCalledTimes(1);
        });
    });

    describe('validateSiteToken', () => {
        beforeAll(() => {
            mockedSign.mockImplementation(actualSign);
        });

        it('throws an AuthError if the token is missing', () => {
            try {
                authService.validateSiteToken(undefined);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(AuthError);
            }
        });

        it('throws an AuthError if the token cannot be verified', () => {
            mockedVerify.mockImplementationOnce(() => {
                throw new JsonWebTokenError('');
            });

            try {
                authService.validateSiteToken('clearly not a valid token');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(AuthError);
            }
        });

        it('throws an AuthError if the token is expired', () => {
            mockedVerify.mockImplementationOnce(() => {
                throw new TokenExpiredError('', new Date());
            });

            try {
                authService.validateSiteToken('some expired token');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(AuthError);
            }
        });

        it('throws an AuthError if verification throws an unexpected error', () => {
            mockedVerify
                .mockImplementationOnce(() => {
                    throw new Error('test error');
                })
                .mockImplementationOnce(() => {
                    throw 'not an error but still thrown';
                });

            // attempt 1: should show error message since an error instance was thrown
            try {
                authService.validateSiteToken('some invalid token');
                fail('should have thrown an error');
            } catch (error) {
                expect(error instanceof AuthError && error.message.includes('test error'));
            }

            // attempt 2: should not show an error message since a non-error was thrown
            try {
                authService.validateSiteToken('some invalid token');
                fail('should have thrown an error');
            } catch (error) {
                expect(error instanceof AuthError && !error.message.includes('not an error but still thrown'));
            }
        });

        it('throws an AuthError if token payload is a string', () => {
            mockedVerify.mockReturnValueOnce('string payload' as unknown as undefined);

            try {
                authService.validateSiteToken('some invalid token');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(AuthError);
            }
        });

        it('throws an AuthError if token has no expiry date', () => {
            mockedVerify.mockReturnValueOnce({ exp: undefined } as unknown as undefined);

            try {
                authService.validateSiteToken('some invalid token');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(AuthError);
            }
        });

        it("throws an AuthError if token payload has no 'id' field", () => {
            mockedVerify.mockReturnValueOnce({ exp: 0 } as unknown as undefined);

            try {
                authService.validateSiteToken('some invalid token');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(AuthError);
            }
        });

        it("throws an AuthError if token payload has no 'access_token' field", () => {
            mockedVerify.mockReturnValueOnce({ exp: 0, id: '' } as unknown as undefined);

            try {
                authService.validateSiteToken('some invalid token');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(AuthError);
            }
        });

        it("throws an AuthError if token payload has no 'refresh_token' field", () => {
            mockedVerify.mockReturnValueOnce({ exp: 0, id: '', access_token: '' } as unknown as undefined);

            try {
                authService.validateSiteToken('some invalid token');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(AuthError);
            }
        });

        it('returns a SiteTokenPayload when the token is valid', () => {
            mockedVerify.mockImplementationOnce(actualVerify);

            const validToken = authService['makeSiteToken'](mockedOAuthResult, 'some id');

            expect(authService.validateSiteToken(validToken)).toMatchObject<SiteTokenPayload>({
                id: 'some id',
                access_token: mockedOAuthResult.access_token,
                refresh_token: mockedOAuthResult.refresh_token,
            });
        });

        it("sees tokens starting with 'Bearer ' or 'Token ' as valid", () => {
            mockedVerify.mockImplementationOnce(actualVerify).mockImplementationOnce(actualVerify);

            const validToken = authService['makeSiteToken'](mockedOAuthResult, 'some id');

            expect(authService.validateSiteToken(`BEArER ${validToken}`)).toMatchObject<SiteTokenPayload>({
                id: 'some id',
                access_token: mockedOAuthResult.access_token,
                refresh_token: mockedOAuthResult.refresh_token,
            });

            expect(authService.validateSiteToken(`ToKeN ${validToken}`)).toMatchObject<SiteTokenPayload>({
                id: 'some id',
                access_token: mockedOAuthResult.access_token,
                refresh_token: mockedOAuthResult.refresh_token,
            });
        });
    });

    describe('makeSiteToken', () => {
        it('signs the payload correctly', () => {
            mockedSign.mockImplementationOnce(actualSign);

            const siteToken = authService['makeSiteToken'](mockedOAuthResult, 'some id');

            expect(actualVerify(siteToken, config.jwtSecret)).toMatchObject<SiteTokenPayload>({
                id: 'some id',
                access_token: mockedOAuthResult.access_token,
                refresh_token: mockedOAuthResult.refresh_token,
            });
        });
    });

    describe('getAssociatedUser', () => {
        it('makes a request to the Discord users endpoint', async () => {
            mockedAxios.get.mockResolvedValueOnce({ data: mockedAPIUser });

            const res = await authService['getAssociatedUser']('some access token');

            // hits the right endpoint with correct body
            expect(mockedAxios.get).toBeCalledWith(`${RouteBases.api}/users/@me`, expect.anything());

            // only makes 1 API request
            expect(mockedAxios.get).toBeCalledTimes(1);

            // returns expected data
            expect(res).toMatchObject(mockedAPIUser);
        });

        it('throws a SecondaryRequestError when the request fails', async () => {
            mockedAxios.get.mockImplementationOnce(() => {
                throw new Error();
            });

            try {
                await authService['getAssociatedUser']('some access token');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(SecondaryRequestError);
            }
        });
    });

    describe('requestAccessToken', () => {
        it('makes a request to the Discord OAuth token endpoint', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: mockedOAuthResult });

            const res = await authService['requestAccessToken']('some authorization code', 'some redirect URI');

            // hits the right endpoint with correct body
            expect(mockedAxios.post).toBeCalledWith(
                OAuth2Routes.tokenURL,
                expect.any(URLSearchParams),
                expect.anything(),
            );

            // only makes 1 API request
            expect(mockedAxios.post).toBeCalledTimes(1);

            // returns expected data
            expect(res).toMatchObject(mockedOAuthResult);
        });

        it('throws a SecondaryRequestError when the request fails', async () => {
            mockedAxios.post.mockImplementationOnce(() => {
                throw new Error();
            });

            try {
                await authService['requestAccessToken']('some authorization code', 'some redirect URI');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(SecondaryRequestError);
            }
        });
    });

    describe('refreshAccessToken', () => {
        it('makes a request to the Discord OAuth token endpoint', async () => {
            mockedAxios.post.mockResolvedValueOnce({ data: mockedOAuthResult });

            const res = await authService['refreshAccessToken']('some refresh token');

            // hits the right endpoint with correct body
            expect(mockedAxios.post).toBeCalledWith(
                OAuth2Routes.tokenURL,
                expect.any(URLSearchParams),
                expect.anything(),
            );

            // only makes 1 API request
            expect(mockedAxios.post).toBeCalledTimes(1);

            // returns expected data
            expect(res).toMatchObject(mockedOAuthResult);
        });

        it('throws a SecondaryRequestError when the request fails', async () => {
            mockedAxios.post.mockImplementationOnce(() => {
                throw new Error();
            });

            try {
                await authService['refreshAccessToken']('some refresh token');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(SecondaryRequestError);
            }
        });
    });

    describe('revokeAccessToken', () => {
        it('makes a request to the Discord OAuth token revocation endpoint', async () => {
            mockedAxios.post.mockResolvedValueOnce({});

            await authService['revokeAccessToken']('some access token');

            // hits the right endpoint with correct body
            expect(mockedAxios.post).toBeCalledWith(OAuth2Routes.tokenRevocationURL, expect.any(URLSearchParams));

            // only makes 1 API request
            expect(mockedAxios.post).toBeCalledTimes(1);
        });

        it('throws a SecondaryRequestError when the request fails', async () => {
            mockedAxios.post.mockImplementationOnce(() => {
                throw new Error();
            });

            try {
                await authService['revokeAccessToken']('some access token');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(SecondaryRequestError);
            }
        });
    });
});
