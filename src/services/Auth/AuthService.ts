import axios from 'axios';
import { APIUser, RouteBases, RESTPostOAuth2AccessTokenResult, OAuth2Routes } from 'discord-api-types/v10';
import { JsonWebTokenError, sign, TokenExpiredError, verify } from 'jsonwebtoken';
import { UserService } from '..';
import { UserModel } from '../../models/UserModel';
import { Config } from '../../types/Config';
import { LoginOrSignupResponse } from '../../types/Auth/LoginOrSignupResponse';
import { SiteTokenPayload } from '../../types/Auth/SiteTokenPayload';
import { SecondaryRequestError } from '../../errors/SecondaryRequestError';
import { AuthError } from '../../errors/AuthError';

export async function loginOrSignup(
    config: Config,
    userModel: UserModel,
    code: string,
    redirectUri: string,
    ip: string,
): Promise<LoginOrSignupResponse> {
    const discordAuth = await getAccessToken(config, code, redirectUri);

    const discordUser = await getCurrentUserInfo(discordAuth.access_token);

    const user = await UserService.getUserbyId(userModel, discordUser.id);

    if (user === null) {
        // user did not exist previously = signup
        return {
            user: await UserService.registerUser(userModel, discordUser, ip),
            discordAuth,
            siteAuth: makeSiteToken(config, discordAuth, discordUser.id),
        };
    }

    // otherwise it is an existing user logging back in
    return {
        user: await UserService.updateUserDiscordData(userModel, discordUser, ip),
        discordAuth,
        siteAuth: makeSiteToken(config, discordAuth, discordUser.id),
    };
}

export async function refresh(
    config: Config,
    userModel: UserModel,
    refreshToken: string,
    ip: string,
): Promise<LoginOrSignupResponse> {
    const discordAuth = await refreshAccessToken(config, refreshToken);

    const discordUser = await getCurrentUserInfo(discordAuth.access_token);

    const updatedUser = await UserService.updateUserDiscordData(userModel, discordUser, ip);

    return {
        user: updatedUser,
        discordAuth,
        siteAuth: makeSiteToken(config, discordAuth, discordUser.id),
    };
}

export async function logout(config: Config, accessToken: string) {
    await revokeAccessToken(config, accessToken);
}

/**
 * Attempts to get a {@link APIUser Discord user object} from an access token.
 * @param {String} accessToken OAuth2 access token of the user.
 * @returns {Promise<APIUser>} Returns the user info.
 * @throws Throws a {@link SecondaryRequestError} error if the request fails.
 */
export async function getCurrentUserInfo(accessToken: string): Promise<APIUser> {
    try {
        const { data } = await axios.get<APIUser>(`${RouteBases.api}/users/@me`, {
            headers: {
                authorization: `Bearer ${accessToken}`,
                'Accept-Encoding': 'application/json',
            },
        });

        return data;
    } catch (error) {
        throw new SecondaryRequestError(
            'Failed to fetch user info',
            'Discord account was deleted, or access token is invalid.',
            error,
        );
    }
}

/**
 * Makes a POST request to the Discord token URL, used to upgrade an authorization code into an access token.
 * @param {Config} config Config object to make request body from.
 * @param {String} code Authorization code returned by Discord.
 * @param {String} redirectUri Redirect URI (should exactly match one from the application settings).
 * @returns {Promise<RESTPostOAuth2AccessTokenResult>} Access token information.
 * @throws Throws a {@link SecondaryRequestError} if the provided code or redirect URI is invalid.
 */
async function getAccessToken(
    config: Config,
    code: string,
    redirectUri: string,
): Promise<RESTPostOAuth2AccessTokenResult> {
    const body = makeRequestBody(config);
    body.set('code', code);
    body.set('redirect_uri', redirectUri);
    body.set('grant_type', 'authorization_code');

    try {
        const { data } = await axios.post<RESTPostOAuth2AccessTokenResult>(OAuth2Routes.tokenURL, body, {
            headers: {
                'Accept-Encoding': 'application/json',
            },
        });

        return data;
    } catch (error) {
        throw new SecondaryRequestError(
            'Failed to get access token',
            'Supplied code or redirect URI is invalid.',
            error,
        );
    }
}

/**
 * Makes a POST request to the Discord token refresh URL, used to delay expiration of an access token.
 * @param {Config} config Config object to make request body from.
 * @param {String} refreshToken Refresh token for the current session, returned by {@link getAccessToken} and
 * {@link refreshAccessToken}.
 * @returns {Promise<RESTPostOAuth2AccessTokenResult>} New access token information.
 * @throws Throws a {@link SecondaryRequestError} if the provided refresh token is invalid.
 */
async function refreshAccessToken(config: Config, refreshToken: string): Promise<RESTPostOAuth2AccessTokenResult> {
    const body = makeRequestBody(config);
    body.set('refresh_token', refreshToken);
    body.set('grant_type', 'refresh_token');

    try {
        const { data } = await axios.post<RESTPostOAuth2AccessTokenResult>(OAuth2Routes.tokenURL, body, {
            headers: {
                'Accept-Encoding': 'application/json',
            },
        });

        return data;
    } catch (error) {
        throw new SecondaryRequestError('Failed to refresh access token', 'Supplied refresh token is invalid.', error);
    }
}

/**
 * Makes a POST request to the Discord token revocation URL, used to invalidate
 * an access token.
 * @param {Config} config Config object to make request body from.
 * @param {String} accessToken Access token for the current session.
 * @throws Throws a {@link SecondaryRequestError} if the provided access token is invalid.
 */
async function revokeAccessToken(config: Config, accessToken: string): Promise<void> {
    const body = makeRequestBody(config);
    body.set('token', accessToken);

    try {
        await axios.post(OAuth2Routes.tokenRevocationURL, body);
    } catch (error) {
        throw new SecondaryRequestError('Failed to revoke access token', 'Supplied access token is invalid.', error);
    }
}

/**
 * Constructs a request body to send to any of the Discord OAuth endpoints.
 * @param {Config} config Config object to get Discord client ID and secret from.
 */
function makeRequestBody({ discordClientId, discordClientSecret }: Config): URLSearchParams {
    const params = new URLSearchParams();
    params.set('client_id', discordClientId);
    params.set('client_secret', discordClientSecret);
    return params;
}

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
