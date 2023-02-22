import { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/rest/v10/oauth2';

export const mockOAuthResult: RESTPostOAuth2AccessTokenResult = {
    access_token: 'test access token',
    expires_in: 604800,
    refresh_token: 'test refresh token',
    scope: 'test scope',
    token_type: 'test token type',
};
