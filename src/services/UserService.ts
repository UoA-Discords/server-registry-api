import { APIUser } from 'discord-api-types/payloads/v10/user';
import { StrictFilter, StrictUpdateFilter } from 'mongodb';
import { defaultUser } from '../defaults/defaultUser';
import { AccountDeletedError } from '../errors/AccountDeletedError';
import { InternalServiceError } from '../errors/InternalServiceError';
import { UserModel } from '../models/UserModel';
import { WithPagination } from '../types/Page';
import { User } from '../types/User';
import { UserPermissions } from '../types/User/UserPermissions';
import { DiscordIdString } from '../types/Utility';

/**
 * The user service manages all interactions with the users database, as well as permission handling.
 *
 * - User Database Interactions:
 *   - Fetching a user by ID ({@link getUserById}).
 *   - Registering a new user ({@link registerNewUser}).
 *   - Refreshing the data of an existing user ({@link refreshExistingUser}).
 * - Permission Handling:
 *   - Checking for a set of permissions ({@link hasPermission}).
 *   - Displaying each individual permission of a set ({@link splitPermissions}).
 */
export class UserService {
    private readonly _userModel: UserModel;

    public constructor(userModel: UserModel) {
        this._userModel = userModel;
    }

    /**
     * Fetches an array of users.
     * @param {number} page Page number, starts at 0.
     * @param {number} perPage Number of users per page, this is the max length of the array returned.
     * @param {string} [searchTerm] Optional search term to filter usernames by.
     * @returns {Promise<WithPagination<User<true>>>} Array of users and number of total users present.
     */
    public async getAllUsers(page: number, perPage: number, searchTerm?: string): Promise<WithPagination<User<true>>> {
        const filter: StrictFilter<User<true>> = searchTerm ? { $text: { $search: searchTerm } } : {};

        const [totalItemCount, items] = await Promise.all([
            this._userModel.countDocuments(filter),
            this._userModel.find(filter, { skip: page * perPage, limit: perPage }).toArray(),
        ]);

        return { totalItemCount, items };
    }

    /**
     * Fetches a user via their Discord ID.
     * @param {DiscordIdString} id The Discord ID of the user in question.
     * @param {boolean} isSelf Whether the user being fetched is the one making the request. If this is true, then an
     * {@link AccountDeletedError} will be thrown if the user does not exist.
     * @returns {Promise<User<true> | null>} The user.
     * @throws Throws an {@link AccountDeletedError} if `isSelf` is true and the user does not exist.
     */
    public async getUserById(id: DiscordIdString, isSelf: true): Promise<User<true>>;
    public async getUserById(id: DiscordIdString, isSelf: false): Promise<User<true> | null>;
    public async getUserById(id: DiscordIdString, isSelf: boolean): Promise<User<true> | null> {
        const user = await this._userModel.findOne({ _id: id });

        if (user === null && isSelf) throw new AccountDeletedError();

        return user;
    }

    /**
     * Creates a new user in the database using the default values.
     * @param {APIUser} discordUserData Discord user data associated with the user.
     * @param {string} ip Current IP address of the user.
     * @returns {Promise<User<true>>} The created user.
     * @throws Throws an {@link InternalServiceError} if a user with the same ID already exists.
     *
     * See also: {@link refreshExistingUser}
     */
    public async registerNewUser(discordUserData: APIUser, ip: string): Promise<User<true>> {
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

        try {
            await this._userModel.insertOne(newUser);
            return newUser;
        } catch (error) {
            throw new InternalServiceError(
                `[UserService]: Tried to registerNewUser with ID ${discordUserData.id}, but already existed!`,
                error,
            );
        }
    }

    /**
     * Updates the Discord data and metadata of an existing user.
     * @param {APIUser} discordUserData Discord user data associated with the user.
     * @param {string} ip Current IP address of the user.
     * @returns {Promise<User<true>>} The created user.
     * @throws Throws an {@link AccountDeletedError} if a user with the supplied ID does not exist.
     *
     * See also: {@link registerNewUser}
     */
    public async refreshExistingUser(discordUserData: APIUser, ip: string): Promise<User<true>> {
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

        const updateResult = await this._userModel.findOneAndUpdate({ _id: discordUserData.id }, update);

        if (updateResult.value === null) throw new AccountDeletedError();

        return updateResult.value;
    }

    /**
     * Checks the provided set of permissions includes the target one(s).
     * @param {User | UserPermissions} currentPermissions Object to check permissions of.
     * @param {UserPermissions} requiredPermissions Permissions that are all required.
     *
     * To check multiple permissions, simply bitwise OR them.
     */
    public static hasPermission(
        currentPermissions: User<boolean> | UserPermissions,
        requiredPermissions: UserPermissions,
    ): boolean {
        if (typeof currentPermissions === 'number') {
            return (currentPermissions & requiredPermissions) === requiredPermissions;
        }
        return (currentPermissions.permissions & requiredPermissions) === requiredPermissions;
    }

    /** Splits a bitfield of user permissions into its individual components. */
    public static splitPermissions(permissions: UserPermissions): UserPermissions[] {
        const values: UserPermissions[] = [];
        while (permissions) {
            const bit = permissions & (~permissions + 1);
            values.push(bit);
            permissions ^= bit;
        }
        return values;
    }
}
