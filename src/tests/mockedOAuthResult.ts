import { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/rest/v10/oauth2';

export const mockedOAuthResult: RESTPostOAuth2AccessTokenResult = {
    access_token: 'mockedOAuthResult.access_token',
    expires_in: 0,
    refresh_token: 'mockedOAuthResult.refresh_token',
    scope: 'mockedOAuthResult.scope',
    token_type: 'mockedOAuthResult.token_type',
};
