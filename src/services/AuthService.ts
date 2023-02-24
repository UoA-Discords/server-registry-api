import axios from 'axios';
import { APIUser, OAuth2Routes, RESTPostOAuth2AccessTokenResult, RouteBases } from 'discord-api-types/v10';
import { JsonWebTokenError, sign, TokenExpiredError, verify } from 'jsonwebtoken';
import { AuthError } from '../errors/AuthError';
import { NotFoundError } from '../errors/NotFoundError';
import { SecondaryRequestError } from '../errors/SecondaryRequestError';
import { LoginOrSignupResponse } from '../types/Auth/LoginOrSignupResponse';
import { SiteTokenPayload } from '../types/Auth/SiteTokenPayload';
import { Config } from '../types/Config';
import { UserService } from './UserService';

/**
 * The auth service manages all interactions related to user sessions and authentication (but not authorization).
 *
 * - Session Handling:
 *   - Creating a new session ({@link loginOrSignup}).
 *   - Extending an existing session ({@link refresh}).
 *   - Terminating an existing session ({@link logout}).
 *  - Authentication:
 *   - Validating a site token ({@link validateSiteToken}).
 */
export class AuthService {
    private readonly _config: Config;
    private readonly _userService: UserService;

    public constructor(config: Config, userService: UserService) {
        this._config = config;
        this._userService = userService;
    }

    /**
     * Creates or updates a user in the database, upgrades a Discord OAuth authorization code into an access token, and
     * generates a site token for the requester.
     * @param {string} code Authorization code to upgrade into an access token.
     * @param {string} redirectUri Redirect URI for access token.
     * @param {string} ip Current IP address of requester.
     * @returns {Promise<LoginOrSignupResponse>} Information about the created user, Discord OAuth credentials, and site
     * token.
     *
     * See also: {@link refresh}, {@link logout}
     */
    public async loginOrSignup(code: string, redirectUri: string, ip: string): Promise<LoginOrSignupResponse> {
        const discordAuth = await this.requestAccessToken(code, redirectUri);

        const discordUser = await this.getAssociatedUser(discordAuth.access_token);

        let response: LoginOrSignupResponse;

        try {
            await this._userService.getUserById(discordUser.id, false);

            // login
            response = {
                user: await this._userService.refreshExistingUser(discordUser, ip),
                discordAuth,
                siteAuth: this.makeSiteToken(discordAuth, discordUser.id),
            };
        } catch (error) {
            if (!(error instanceof NotFoundError)) throw error;
            // signup
            response = {
                user: await this._userService.registerNewUser(discordUser, ip),
                discordAuth,
                siteAuth: this.makeSiteToken(discordAuth, discordUser.id),
            };
        }

        return response;
    }

    /**
     * Updates an existing user in the database and refreshes their Discord OAuth access token.
     * @param {string} refreshToken Refresh token to use in Discord OAuth refresh process.
     * @param {string} ip Current IP address of requester.
     * @returns {Promise<LoginOrSignupResponse>} Updated user, Discord OAuth credentials, and site token.
     *
     * See also: {@link loginOrSignup}, {@link logout}
     */
    public async refresh(refreshToken: string, ip: string): Promise<LoginOrSignupResponse> {
        const discordAuth = await this.refreshAccessToken(refreshToken);

        const discordUser = await this.getAssociatedUser(discordAuth.access_token);

        const updatedUser = await this._userService.refreshExistingUser(discordUser, ip);

        return {
            user: updatedUser,
            discordAuth,
            siteAuth: this.makeSiteToken(discordAuth, discordUser.id),
        };
    }

    /**
     * Logs the user out by revoking their Discord access token.
     * @param {string} accessToken The user's Discord access token.
     * @throws Throws a {@link SecondaryRequestError} if the request to the Discord API fails.
     *
     * See also: {@link refresh}, {@link loginOrSignup}
     */
    public async logout(accessToken: string): Promise<void> {
        await this.revokeAccessToken(accessToken);
    }

    /**
     * Validates an authorization header.
     * @param {string|undefined} token Authorization header value.
     * @returns {SiteTokenPayload} Returns the token payload object, containing the user's access tokens and Discord ID.
     * @throws Throws an {@link AuthError} for number of reasons.
     *
     * See also: {@link makeSiteToken}
     */
    public validateSiteToken(token: string | undefined): SiteTokenPayload {
        if (token === undefined) {
            throw new AuthError('Missing Authorization', 'A token was not provided in the authorization header.');
        }

        if (token.toLowerCase().startsWith('bearer ')) token = token.slice('bearer '.length);
        else if (token.toLowerCase().startsWith('token ')) token = token.slice('token '.length);

        let payload;

        try {
            payload = verify(token, this._config.jwtSecret);
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

    /**
     * Creates a JsonWebToken of necessary user data.
     * @param {RESTPostOAuth2AccessTokenResult} discordAuth Discord OAuth payload to get tokens from.
     * @param {String} id Discord user ID.
     * @returns {String} The created site token.
     *
     * See also: {@link validateSiteToken}
     */
    private makeSiteToken(discordAuth: RESTPostOAuth2AccessTokenResult, id: string): string {
        const { access_token, refresh_token, expires_in } = discordAuth;
        const payload: SiteTokenPayload = { id, access_token, refresh_token };

        return sign(payload, this._config.jwtSecret, { expiresIn: expires_in });
    }

    /**
     * Attempts to get a {@link APIUser Discord user object} from an access token.
     * @param {String} accessToken OAuth2 access token of the user.
     * @returns {Promise<APIUser>} Information about the user who the provided access token belongs to.
     * @throws Throws a {@link SecondaryRequestError} error if the request fails.
     */
    private async getAssociatedUser(accessToken: string): Promise<APIUser> {
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

    /** Constructs a request body to send to any of the Discord OAuth endpoints. */
    private makeRequestBody(): URLSearchParams {
        const params = new URLSearchParams();
        params.set('client_id', this._config.discordClientId);
        params.set('client_secret', this._config.discordClientSecret);
        return params;
    }

    /**
     * Makes a POST request to the Discord token URL, used to upgrade an authorization code into an access token.
     * @param {String} code Authorization code returned by Discord.
     * @param {String} redirectUri Redirect URI (should exactly match one from the application settings).
     * @returns {Promise<RESTPostOAuth2AccessTokenResult>} Access token and related information.
     * @throws Throws a {@link SecondaryRequestError} if the provided code or redirect URI is invalid.
     *
     * See also: {@link refreshAccessToken}, {@link revokeAccessToken}
     */
    private async requestAccessToken(code: string, redirectUri: string): Promise<RESTPostOAuth2AccessTokenResult> {
        const body = this.makeRequestBody();
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
                'Access Token Request Failure',
                'Supplied code or redirect URI may be invalid.',
                error,
            );
        }
    }

    /**
     * Makes a POST request to the Discord token refresh URL, used to delay the expiration of an access token.
     * @param {String} refreshToken Refresh token for the current session, returned by {@link requestAccessToken} and
     * {@link refreshAccessToken}.
     * @returns {Promise<RESTPostOAuth2AccessTokenResult>} New access token and related information.
     * @throws Throws a {@link SecondaryRequestError} if the provided refresh token is invalid.
     *
     * See also: {@link revokeAccessToken}, {@link requestAccessToken}
     */
    private async refreshAccessToken(refreshToken: string): Promise<RESTPostOAuth2AccessTokenResult> {
        const body = this.makeRequestBody();
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
            throw new SecondaryRequestError(
                'Access Token Refresh Failure',
                'Supplied refresh token may be invalid.',
                error,
            );
        }
    }

    /**
     * Makes a POST request to the Discord token revocation URL, used to invalidate
     * an access token.
     * @param {String} accessToken Access token for the current session.
     * @throws Throws a {@link SecondaryRequestError} if the request to the Discord API fails.
     *
     * See also: {@link refreshAccessToken}, {@link requestAccessToken}
     */
    private async revokeAccessToken(accessToken: string): Promise<void> {
        const body = this.makeRequestBody();
        body.set('token', accessToken);

        try {
            await axios.post(OAuth2Routes.tokenRevocationURL, body);
        } catch (error) {
            throw new SecondaryRequestError(
                'Access Token Revocation Failure',
                'Supplied access token may be invalid.',
                error,
            );
        }
    }
}
