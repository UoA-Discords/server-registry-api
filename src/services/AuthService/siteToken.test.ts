import { JsonWebTokenError, verify, TokenExpiredError, sign } from 'jsonwebtoken';
import { AuthError } from '../../errors/AuthError';
import { mockConfig } from '../../tests/mockConfig';
import { mockedOAuthResult } from '../../tests/mockedOAuthResult';
import { SiteTokenPayload } from '../../types/Auth/SiteTokenPayload';
import { makeSiteToken, validateSiteToken } from './siteToken';

jest.mock('jsonwebtoken');

const jwt = jest.requireActual('jsonwebtoken');

const mockedVerify = jest.mocked(verify);
const mockedSign = jest.mocked(sign);

const config = mockConfig();

describe('makeSiteToken', () => {
    beforeAll(() => {
        mockedSign.mockImplementationOnce(jwt.sign);
        mockedVerify.mockImplementationOnce(jwt.verify);
    });

    it('signs the payload correctly', () => {
        const token = makeSiteToken(config, mockedOAuthResult, 'test id');

        expect(verify(token, config.jwtSecret)).toMatchObject<SiteTokenPayload>({
            id: 'test id',
            access_token: mockedOAuthResult.access_token,
            refresh_token: mockedOAuthResult.refresh_token,
        });
    });
});

describe('validateSiteToken', () => {
    beforeAll(() => {
        mockedSign.mockImplementation(jwt.sign);
    });
    it('throws an AuthError if the token is missing', () => {
        try {
            validateSiteToken(config, undefined);
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
            validateSiteToken(config, 'clearly not a valid token');
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
            validateSiteToken(config, 'some expired token');
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
            validateSiteToken(config, 'some invalid token');
            fail('should have thrown an error');
        } catch (error) {
            expect(error instanceof AuthError && error.message.includes('test error'));
        }

        // attempt 2: should not show an error message since a non-error was thrown
        try {
            validateSiteToken(config, 'some invalid token');
            fail('should have thrown an error');
        } catch (error) {
            expect(error instanceof AuthError && !error.message.includes('not an error but still thrown'));
        }
    });

    it('throws an AuthError if token payload is a string', () => {
        mockedVerify.mockReturnValueOnce('string payload' as unknown as undefined);

        try {
            validateSiteToken(config, 'some invalid token');
            fail('should have thrown an error');
        } catch (error) {
            expect(error).toBeInstanceOf(AuthError);
        }
    });

    it('throws an AuthError if token has no expiry date', () => {
        mockedVerify.mockReturnValueOnce({ exp: undefined } as unknown as undefined);

        try {
            validateSiteToken(config, 'some invalid token');
            fail('should have thrown an error');
        } catch (error) {
            expect(error).toBeInstanceOf(AuthError);
        }
    });

    it("throws an AuthError if token payload has no 'id' field", () => {
        mockedVerify.mockReturnValueOnce({ exp: 0 } as unknown as undefined);

        try {
            validateSiteToken(config, 'some invalid token');
            fail('should have thrown an error');
        } catch (error) {
            expect(error).toBeInstanceOf(AuthError);
        }
    });

    it("throws an AuthError if token payload has no 'access_token' field", () => {
        mockedVerify.mockReturnValueOnce({ exp: 0, id: '' } as unknown as undefined);

        try {
            validateSiteToken(config, 'some invalid token');
            fail('should have thrown an error');
        } catch (error) {
            expect(error).toBeInstanceOf(AuthError);
        }
    });

    it("throws an AuthError if token payload has no 'refresh_token' field", () => {
        mockedVerify.mockReturnValueOnce({ exp: 0, id: '', access_token: '' } as unknown as undefined);

        try {
            validateSiteToken(config, 'some invalid token');
            fail('should have thrown an error');
        } catch (error) {
            expect(error).toBeInstanceOf(AuthError);
        }
    });

    it('returns a SiteTokenPayload when the token is valid', () => {
        mockedSign.mockImplementationOnce(jwt.sign);
        mockedVerify.mockImplementationOnce(jwt.verify);

        const validToken = makeSiteToken(config, mockedOAuthResult, 'test id');

        expect(validateSiteToken(config, validToken)).toMatchObject<SiteTokenPayload>({
            id: 'test id',
            access_token: mockedOAuthResult.access_token,
            refresh_token: mockedOAuthResult.refresh_token,
        });
    });

    it("sees tokens starting with 'Bearer ' or 'Token ' as valid", () => {
        mockedSign.mockImplementationOnce(jwt.sign);
        mockedVerify.mockImplementationOnce(jwt.verify).mockImplementationOnce(jwt.verify);

        const validToken = makeSiteToken(config, mockedOAuthResult, 'test id');

        expect(validateSiteToken(config, `BEArER ${validToken}`)).toMatchObject<SiteTokenPayload>({
            id: 'test id',
            access_token: mockedOAuthResult.access_token,
            refresh_token: mockedOAuthResult.refresh_token,
        });

        expect(validateSiteToken(config, `ToKeN ${validToken}`)).toMatchObject<SiteTokenPayload>({
            id: 'test id',
            access_token: mockedOAuthResult.access_token,
            refresh_token: mockedOAuthResult.refresh_token,
        });
    });

    // it('throws if token is malformed', () => {
    //     const token = 'garbage token';
    //     try {
    //         validateSiteToken(config, token);
    //         fail('should have thrown an error');
    //     } catch (error) {
    //         if (error instanceof JsonWebTokenError) {
    //             expect(error.message).toBe('jwt malformed');
    //         } else fail('should have thrown a JsonWebTokenError');
    //     }
    // });

    // it('throws if token is signed with a different secret', () => {
    //     const token = sign({}, config.jwtSecret);

    //     try {
    //         validateSiteToken(mockConfig({ jwtSecret: 'another secret' }), token);
    //         fail('should have thrown an error');
    //     } catch (error) {
    //         if (error instanceof JsonWebTokenError) {
    //             expect(error.message).toBe('invalid signature');
    //         } else fail('should have thrown a JsonWebTokenError');
    //     }
    // });

    // it('throws if token payload is not an object', () => {
    //     const tokenString = sign('string payload', config.jwtSecret);

    //     try {
    //         validateSiteToken(config, tokenString);
    //         fail('should have thrown an error');
    //     } catch (error) {
    //         if (error instanceof SiteAuthError) {
    //             expect(error.message).toContain('Token has invalid payload type');
    //         } else fail('should have thrown a SiteAuthError');
    //     }
    // });

    // it('throws if token lacks an expiration date', () => {
    //     const tokenString = sign({}, config.jwtSecret);

    //     try {
    //         validateSiteToken(config, tokenString);
    //         fail('should have thrown an error');
    //     } catch (error) {
    //         if (error instanceof SiteAuthError) {
    //             expect(error.message).toContain('Token lacks an expiration date');
    //         } else fail('should have thrown a SiteAuthError');
    //     }
    // });

    // it('throws if token is expired', () => {
    //     const token = sign({}, config.jwtSecret, { expiresIn: 0 });

    //     try {
    //         validateSiteToken(config, token);
    //         fail('should have thrown an error');
    //     } catch (error) {
    //         if (error instanceof TokenExpiredError) {
    //             expect(error.message).toBe('jwt expired');
    //         } else fail('should have thrown a TokenExpiredError');
    //     }
    // });

    // it('throws if token payload has bad shape', () => {
    //     // no ID
    //     const tokenA = sign({}, config.jwtSecret, { expiresIn: 10 });

    //     // no access token
    //     const tokenB = sign({ id: 'test id' }, config.jwtSecret, { expiresIn: 10 });

    //     // no refresh token
    //     const tokenC = sign({ id: 'test id', access_token: 'test access token' }, config.jwtSecret, {
    //         expiresIn: 10,
    //     });

    //     try {
    //         validateSiteToken(config, tokenA);
    //         fail('should have thrown an error');
    //     } catch (error) {
    //         if (error instanceof SiteAuthError) {
    //             expect(error.message).toBe('No ID in payload');
    //         } else fail('should have thrown a SiteAuthError');
    //     }

    //     try {
    //         validateSiteToken(config, tokenB);
    //         fail('should have thrown an error');
    //     } catch (error) {
    //         if (error instanceof SiteAuthError) {
    //             expect(error.message).toBe('No access_token in payload');
    //         } else fail('should have thrown a SiteAuthError');
    //     }

    //     try {
    //         validateSiteToken(config, tokenC);
    //         fail('should have thrown an error');
    //     } catch (error) {
    //         if (error instanceof SiteAuthError) {
    //             expect(error.message).toBe('No refresh_token in payload');
    //         } else fail('should have thrown a SiteAuthError');
    //     }
    // });

    // it('returns expected object for a valid token', () => {
    //     const testPayload: SiteTokenPayload = {
    //         id: 'test id',
    //         access_token: 'test access token',
    //         refresh_token: 'test refresh token',
    //     };

    //     const token = sign(testPayload, config.jwtSecret, { expiresIn: 10 });

    //     const res = validateSiteToken(config, token);

    //     expect(res).toEqual(testPayload);
    // });

    // it('removes leading "bearer " if present', () => {
    //     const testPayload: SiteTokenPayload = {
    //         id: 'test id',
    //         access_token: 'test access token',
    //         refresh_token: 'test refresh token',
    //     };

    //     const token = sign(testPayload, config.jwtSecret, { expiresIn: 10 });

    //     const res = validateSiteToken(config, `bearer ${token}`);

    //     expect(res).toEqual(testPayload);
    // });
});
