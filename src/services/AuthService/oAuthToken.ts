// functions that relate to Discord OAuth2 access tokens

import axios from 'axios';
import { RESTPostOAuth2AccessTokenResult, OAuth2Routes, APIUser, RouteBases } from 'discord-api-types/v10';
import { SecondaryRequestError } from '../../errors/SecondaryRequestError';
import { Config } from '../../types/Config';

/**
 * Makes a POST request to the Discord token URL, used to upgrade an authorization code into an access token.
 * @param {Config} config Config object to make request body from.
 * @param {String} code Authorization code returned by Discord.
 * @param {String} redirectUri Redirect URI (should exactly match one from the application settings).
 * @returns {Promise<RESTPostOAuth2AccessTokenResult>} Access token information.
 * @throws Throws a {@link SecondaryRequestError} if the provided code or redirect URI is invalid.
 */
export async function getAccessToken(
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
export async function refreshAccessToken(
    config: Config,
    refreshToken: string,
): Promise<RESTPostOAuth2AccessTokenResult> {
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
export async function revokeAccessToken(config: Config, accessToken: string): Promise<void> {
    const body = makeRequestBody(config);
    body.set('token', accessToken);

    try {
        await axios.post(OAuth2Routes.tokenRevocationURL, body);
    } catch (error) {
        throw new SecondaryRequestError('Failed to revoke access token', 'Supplied access token is invalid.', error);
    }
}

/**
 * Attempts to get a {@link APIUser Discord user object} from an access token.
 * @param {String} accessToken OAuth2 access token of the user.
 * @returns {Promise<APIUser>} Returns the user info.
 * @throws Throws a {@link SecondaryRequestError} error if the request fails.
 */
export async function getAssociatedUser(accessToken: string): Promise<APIUser> {
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
 * Constructs a request body to send to any of the Discord OAuth endpoints.
 * @param {Config} config Config object to get Discord client ID and secret from.
 */
function makeRequestBody({ discordClientId, discordClientSecret }: Config): URLSearchParams {
    const params = new URLSearchParams();
    params.set('client_id', discordClientId);
    params.set('client_secret', discordClientSecret);
    return params;
}
