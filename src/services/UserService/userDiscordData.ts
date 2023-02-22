// functions for updating/setting the Discord data of a user

import { APIUser } from 'discord-api-types/payloads/v10/user';
import { StrictUpdateFilter } from 'mongodb';
import { defaultUser } from '../../defaults/defaultUser';
import { AuthError } from '../../errors/AuthError';
import { UserModel } from '../../models/UserModel';
import { User } from '../../types/User';

/**
 * Creates a new user in the database using the default values.
 * @returns {Promise<User<true>>} Returns the created user.
 */
export async function registerUser(userModel: UserModel, discordUserData: APIUser, ip: string): Promise<User<true>> {
    const now = new Date().toISOString();

    const newUser: User<true> = {
        ...defaultUser,
        _id: discordUserData.id,
        discord: {
            username: discordUserData.username,
            discriminator: discordUserData.discriminator,
            avatar: discordUserData.avatar,
        },
        metaData: {
            latestIp: ip,
            registered: now,
            lastLoginOrRefresh: now,
        },
    };

    await userModel.insertOne(newUser);

    return newUser;
}

/**
 * Updates the Discord user data and meta data of an existing user.
 * @returns {Promise<User<true>>} Returns the updated user.
 * @throws Throws an {@link AuthError} if the user does not exist.
 */
export async function updateUserDiscordData(
    userModel: UserModel,
    discordUserData: APIUser,
    ip: string,
): Promise<User<true>> {
    const update: StrictUpdateFilter<User<true>> = {
        $set: {
            'metaData.lastLoginOrRefresh': new Date().toISOString(),
            'metaData.latestIp': ip,
            discord: {
                username: discordUserData.username,
                discriminator: discordUserData.discriminator,
                avatar: discordUserData.avatar,
            },
        },
    };

    const updateResult = await userModel.findOneAndUpdate({ _id: discordUserData.id }, update);
    if (updateResult.value === null) {
        throw new AuthError('Account Not Found', 'The account you are logged in as has most likely been deleted.');
    }

    return updateResult.value;
}
