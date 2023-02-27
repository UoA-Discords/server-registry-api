import { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/rest/v10/oauth2';
import { User } from '../User';

export interface LoginOrSignupResponse {
    user: User;
    discordAuth: RESTPostOAuth2AccessTokenResult;
    siteAuth: string;
}
