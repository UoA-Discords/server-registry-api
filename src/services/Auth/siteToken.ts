// functions that related to site tokens (JWTs)

import { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v10';
import { sign, verify, JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { AuthError } from '../../errors/AuthError';
import { SiteTokenPayload } from '../../types/Auth/SiteTokenPayload';
import { Config } from '../../types/Config';

/**
 * Creates a JsonWebToken of necessary user data.
 * @param {Config} config Config object to get JWT secret from.
 * @param {RESTPostOAuth2AccessTokenResult} discordAuth Discord OAuth payload to get Discord tokens from.
 * @param {String} id Discord user ID.
 * @returns {String} Site token.
 */
export function makeSiteToken({ jwtSecret }: Config, discordAuth: RESTPostOAuth2AccessTokenResult, id: string): string {
    const { access_token, refresh_token, expires_in } = discordAuth;
    const payload: SiteTokenPayload = { id, access_token, refresh_token };

    return sign(payload, jwtSecret, { expiresIn: expires_in });
}

/**
 * Validates an authorization header.
 * @param {Config} config Config object to get JWT secret from.
 * @param {string|undefined} token Authorization header value.
 * @throws Throws an {@link AuthError} for number of reasons.
 */
export function validateSiteToken({ jwtSecret }: Config, token: string | undefined): SiteTokenPayload {
    if (token === undefined) {
        throw new AuthError('Missing Authorization', 'A token was not provided in the authorization header.');
    }

    if (token.toLowerCase().startsWith('bearer ')) token = token.slice('bearer '.length);
    else if (token.toLowerCase().startsWith('token ')) token = token.slice('token '.length);

    let payload;

    try {
        payload = verify(token, jwtSecret);
    } catch (error) {
        if (error instanceof JsonWebTokenError) {
            // see https://www.npmjs.com/package/jsonwebtoken > JsonWebTokenError
            throw new AuthError('Invalid Authorization', `Unable to verify your site token (${error.message}).`);
        }
        if (error instanceof TokenExpiredError) {
            throw new AuthError('Session Expired', 'Site token has expired, logging out is required.');
        }

        throw new AuthError(
            'Unknown Authorization Error',
            `An unexpected error occurred${error instanceof Error ? `: ${error.message}` : '.'}`,
        );
    }

    // all the below conditions are never likely to be true, since we only sign our JWTs with valid paylods
    // (see `AuthService.makeSiteToken`)

    if (typeof payload === 'string') {
        throw new AuthError('Invalid Token Payload Type', 'Got a string, but expected an object.');
    }

    if (payload.exp === undefined) throw new AuthError('Invalid Token', 'Token lacks an expiration date.');

    if (payload['id'] === undefined || typeof payload['id'] !== 'string') {
        throw new AuthError(
            'Invalid Token Payload Shape',
            `Missing 'id' (expected string, got ${typeof payload['id']}).`,
        );
    }

    if (payload['access_token'] === undefined || typeof payload['access_token'] !== 'string') {
        throw new AuthError(
            'Invalid Token Payload Shape',
            `Missing 'access_token' (expected string, got ${typeof payload['access_token']}).`,
        );
    }

    if (payload['refresh_token'] === undefined || typeof payload['refresh_token'] !== 'string') {
        throw new AuthError(
            'Invalid Token Payload Shape',
            `Missing 'refresh_token' (expected string, got ${typeof payload['refresh_token']}).`,
        );
    }

    return {
        id: payload['id'],
        access_token: payload['access_token'],
        refresh_token: payload['refresh_token'],
    };
}
