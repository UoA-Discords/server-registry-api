import { APIUser } from 'discord-api-types/v10';
import { StrictUpdateFilter } from 'mongodb';
import { defaultUser } from '../../defaults/defaultUser';
import { AuthError } from '../../errors/AuthError';
import { UserModel } from '../../models/UserModel';
import { User } from '../../types/User';
import { UserPermissions } from '../../types/User/UserPermissions';
import { DiscordIdString } from '../../types/Utility';

/**
 * Checks the provided set of permissions includes the target one(s).
 * @param {User | UserPermissions} currentPermissions Object to check permissions of.
 * @param {UserPermissions} requiredPermissions Permissions that are all required.
 *
 * To check multiple permissions, simply bitwise OR them.
 */
export function hasPermission(
    currentPermissions: User<boolean> | UserPermissions,
    requiredPermissions: UserPermissions,
): boolean {
    if (typeof currentPermissions === 'number') {
        return (currentPermissions & requiredPermissions) === requiredPermissions;
    }
    return (currentPermissions.permissions & requiredPermissions) === requiredPermissions;
}

/** Splits a bitfield of user permissions into its individual components. */
export function splitPermissions(permissions: UserPermissions): UserPermissions[] {
    const values: UserPermissions[] = [];
    while (permissions) {
        const bit = permissions & (~permissions + 1);
        values.push(bit);
        permissions ^= bit;
    }
    return values;
}

export async function getUserbyId(userModel: UserModel, id: DiscordIdString): Promise<User<true> | null> {
    return await userModel.findOne({ _id: id });
}

export async function registerUser(userModel: UserModel, discordUserData: APIUser, ip: string): Promise<User<true>> {
    const now = new Date().toString();

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
