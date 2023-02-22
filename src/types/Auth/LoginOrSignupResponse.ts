import { RESTPostOAuth2AccessTokenResult } from 'discord-api-types/v10';
import { User } from '../User';

export interface LoginOrSignupResponse {
    user: User<true>;
    discordAuth: RESTPostOAuth2AccessTokenResult;
    siteAuth: string;
}
