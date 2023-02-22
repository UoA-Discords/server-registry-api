// functions related to the fetching of users

import { AuthError } from '../../errors/AuthError';
import { UserModel } from '../../models/UserModel';
import { User } from '../../types/User';
import { DiscordIdString } from '../../types/Utility';

/**
 * Fetches a User via their ID.
 * @throws Throws an {@link AuthError} if the user cannot be found.
 */
export async function getUserbyId(userModel: UserModel, id: DiscordIdString): Promise<User<true>> {
    const user = await userModel.findOne({ _id: id });
    if (user === null) {
        throw new AuthError('Account Not Found', 'The account you are logged in as has most likely been deleted.');
    }
    return user;
}
