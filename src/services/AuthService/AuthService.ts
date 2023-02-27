import axios from 'axios';
import { RESTPostOAuth2AccessTokenResult, APIUser, RouteBases, OAuth2Routes } from 'discord-api-types/v10';
import { verify, JsonWebTokenError, TokenExpiredError, sign } from 'jsonwebtoken';
import { AuthError } from '../../errors/AuthError';
import { NotFoundError } from '../../errors/NotFoundError';
import { SecondaryRequestError } from '../../errors/SecondaryRequestError';
import { LoginOrSignupResponse } from '../../types/Auth/LoginOrSignupResponse';
import { SiteTokenPayload } from '../../types/Auth/SiteTokenPayload';
import { Config } from '../../types/Config';
import { UserService } from '../UserService';

/**
 * The auth service manages all interactions related to user sessions and authentication (but not authorization).
 *
 * - Creating a session ({@link loginOrSignup}).
 * - Extending a session ({@link refresh}).
 * - Terminating a session ({@link logout}).
 * - Getting the current session ({@link validateSiteToken}).
 *
 * Interactions with this service may throw any of the following errors:
 * - {@link AuthError}
 * - {@link SecondaryRequestError}
 * - {@link UserService} Errors
 */
export class AuthService {
    private readonly _config: Config;

    private readonly _userService: UserService;

    public constructor(config: Config, userService: UserService) {
        this._config = config;
        this._userService = userService;
    }

    /**
     * Creates/updates a user in the database, completes the Discord OAuth2 login process, and signs a site token (JWT).
     * @param {string} code Discord OAuth2 authorization code to upgrade into an access token.
     * @param {string} redirectUri Redirect URI that was used to obtain the code.
     * @param {string} ip Current IP address of the requester.
     * @returns {Promise<LoginOrSignupResponse>} The account created/updated, and auth information associated with it.
     *
     * See also: {@link refresh} (sister method), {@link logout} (sister method)
     *
     * @see {@link https://discord.com/developers/docs/topics/oauth2#authorization-code-grant-authorization-code-exchange-example}
     */
    public async loginOrSignup(code: string, redirectUri: string, ip: string): Promise<LoginOrSignupResponse> {
        const discordAuth = await this.requestAccessToken(code, redirectUri);

        const discordUser = await this.getAssociatedUser(discordAuth.access_token);

        let response: LoginOrSignupResponse;

        try {
            await this._userService.getUserById(discordUser.id);

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
                user: await this._userService.createNewUser(discordUser, ip),
                discordAuth,
                siteAuth: this.makeSiteToken(discordAuth, discordUser.id),
            };
        }

        return response;
    }

    /**
     * Refreshes a user's site token (JWT), Discord access token, and Discord user data using a refresh token.
     * @param {string} refreshToken Discord OAuth2 refresh token.
     * @param {string} ip Current IP address of the requester.
     * @returns {Promise<LoginOrSignupResponse>} The refreshed account, and auth information associated with it.
     *
     * See also: {@link loginOrSignup} (sister method), {@link logout} (sister method)
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
     * Logs the user out by recoking their Discord access token.
     * @param {string} accessToken Discord OAuth2 access token.
     *
     * See also: {@link loginOrSignup} (sister method), {@link refresh} (sister method)
     */
    public async logout(accessToken: string): Promise<void> {
        await this.revokeAccessToken(accessToken);
    }

    /**
     * Validates an authorization header.
     * @param {string | undefined} token Authorization header value (e.g. `Bearer abcdefg...`).
     * @returns {SiteTokenPayload} The payload of the site token.
     */
    public validateSiteToken(token: string | undefined): SiteTokenPayload {
        if (token === undefined) {
            throw new AuthError('Missing Authorization', 'A token was not provided in the authorization header.');
        }

        let payload;

        try {
            payload = verify(token.slice('Bearer '.length), this._config.jwtSecret);
        } catch (error) {
            if (error instanceof JsonWebTokenError) {
                // see https://www.npmjs.com/package/jsonwebtoken > JsonWebTokenError
                throw new AuthError('Invalid Authorization', `Unable to verify your site token (${error.message}).`);
            }
            if (error instanceof TokenExpiredError) {
                throw new AuthError('Session Expired', 'Site token has expired, logging out is required.');
            }

            throw new AuthError('Unknown Authorization Error', 'An unexpected error occurred.');
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
     * Creates a JsonWebToken with a payload of necessary user data.
     * @param {RESTPostOAuth2AccessTokenResult} discordAuth Discord OAuth2 payload to get tokens from.
     * @param {String} id Discord user ID.
     * @returns {String} The created site token.
     *
     * See also: {@link validateSiteToken} (sister method), {@link loginOrSignup} (uses this method), {@link refresh}
     * (uses this method)
     */
    private makeSiteToken(discordAuth: RESTPostOAuth2AccessTokenResult, id: string): string {
        const { access_token, refresh_token, expires_in } = discordAuth;
        const payload: SiteTokenPayload = { id, access_token, refresh_token };

        return sign(payload, this._config.jwtSecret, { expiresIn: expires_in });
    }

    /**
     * Fetches a {@link APIUser Discord user object} from an access token.
     * @param {String} accessToken Discord OAuth2 access token of the user.
     * @returns {Promise<APIUser>} Information about the user who the provided access token belongs to.
     *
     * See also: {@link loginOrSignup} (uses this method), {@link refresh} (uses this method)
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
     *
     * See also: {@link refreshAccessToken} (sister method), {@link revokeAccessToken} (sister method)
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
     *
     * See also: {@link revokeAccessToken} (sister method), {@link requestAccessToken} (sister method)
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
     *
     * See also: {@link refreshAccessToken} (sister method), {@link requestAccessToken} (sister method)
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
