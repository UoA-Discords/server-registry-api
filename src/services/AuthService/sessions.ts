// functions for creating, terminating, and prolonging user sessions

import { UserService } from '..';
import { UserModel } from '../../models/UserModel';
import { LoginOrSignupResponse } from '../../types/Auth/LoginOrSignupResponse';
import { Config } from '../../types/Config';
import { getAccessToken, getAssociatedUser, refreshAccessToken, revokeAccessToken } from './oAuthToken';
import { makeSiteToken } from './siteToken';

export async function loginOrSignup(
    config: Config,
    userModel: UserModel,
    code: string,
    redirectUri: string,
    ip: string,
): Promise<LoginOrSignupResponse> {
    const discordAuth = await getAccessToken(config, code, redirectUri);

    const discordUser = await getAssociatedUser(discordAuth.access_token);

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

    const discordUser = await getAssociatedUser(discordAuth.access_token);

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
