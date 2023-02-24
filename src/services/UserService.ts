import { APIUser } from 'discord-api-types/payloads/v10/user';
import { StrictFilter, StrictUpdateFilter } from 'mongodb';
import { defaultUser } from '../defaults/defaultUser';
import { AccountDeletedError } from '../errors/AccountDeletedError';
import { ForbiddenError } from '../errors/ForbiddenError';
import { InternalServiceError } from '../errors/InternalServiceError';
import { NotFoundError } from '../errors/NotFoundError';
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
     * Fetches an array of users specified by their Discord IDs.
     * @param {DiscordIdString[]} userIds Discord user IDs of users to fetch.
     * @returns {Promise<User<true>[]>} Array of users.
     */
    public async getSpecificUsers(userIds: DiscordIdString[]): Promise<User<true>[]> {
        return await this._userModel.find({ _id: { $in: userIds } }).toArray();
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
     * {@link AccountDeletedError} will be thrown instead of an {@link NotFoundError} if the user does not exist.
     * @returns {Promise<User<true> | null>} The user.
     * @throws Throws an {@link AccountDeletedError} if `isSelf` is true and the user does not exist.
     * @throws Throws a {@link NotFoundError} if `isSelf` is false and the user does not exist.
     */
    public async getUserById(id: DiscordIdString, isSelf: boolean): Promise<User<true>> {
        const user = await this._userModel.findOne({ _id: id });

        if (user === null) {
            if (isSelf) throw new AccountDeletedError();
            throw new NotFoundError('server');
        }

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
     * Updates the permissions of a user.
     * @param {User<true>} sourceUser The user who is conducting the change.
     * @param {DiscordIdString} targetUserId ID of the user who is getting their permissions changed.
     * @param {UserPermissions} newPermissions New permissions bitfield.
     * @param {string | null} reason Reason for permission change.
     * @throws Throws a {@link NotFoundError} if the target user does not exist.
     * @throws Throws a {@link ForbiddenError} if the source user does not have permission to edit the target user.
     */
    public async updateUserPermissions(
        sourceUser: User<true>,
        targetUserId: DiscordIdString,
        newPermissions: UserPermissions,
        reason: string | null,
    ): Promise<User<true>> {
        const targetUser = await this.getUserById(targetUserId, false);

        UserService.canEditUser(sourceUser, targetUser);
        UserService.canChangePermissionsTo(sourceUser.permissions, targetUser.permissions, newPermissions);

        const updateResult = await this._userModel.findOneAndUpdate(
            { _id: targetUserId },
            {
                $set: {
                    permissions: newPermissions,
                    permissionsLog: [
                        {
                            oldUserPermissions: targetUser.permissions,
                            by: sourceUser._id,
                            at: new Date().toISOString(),
                            reason,
                        },
                        ...targetUser.permissionsLog.slice(0, 99),
                    ],
                },
            },
        );

        if (updateResult.value === null) throw new NotFoundError('server');

        return updateResult.value;
    }

    /**
     * User permission editing validation method, this checks that the source user is allowed to modify the permissions
     * of the target user.
     * @param {User<true>} sourceUser User who is conducting the change.
     * @param {User<true>} targetUser User who is getting their permissions changed.
     * @throws Throws a {@link ForbiddenError} if permission checks fail.
     *
     * Note this does not check whether the new permissions are valid, for that see {@link canChangePermissionsTo}.
     */
    private static canEditUser(sourceUser: User<true>, targetUser: User<true>): void {
        // if you don't have `ManageUsers` or `Owner` permissions, you can't edit anyone
        if (
            !UserService.hasPermission(sourceUser, UserPermissions.ManageUsers) &&
            !UserService.hasPermission(sourceUser, UserPermissions.Owner)
        )
            throw new ForbiddenError(
                UserPermissions.ManageUsers,
                'Need the `ManageUsers` or `Owner` permissions to edit users.',
            );

        // you can always edit yourself
        if (sourceUser._id === targetUser._id) return;

        // nobody can edit owners (except themselves)
        if (UserService.hasPermission(targetUser, UserPermissions.Owner)) {
            throw new ForbiddenError(0, 'Cannot edit users with the `Owner` permission.');
        }

        // if the target user has `ManageUsers` permission, you can only edit them if you're an owner
        if (
            UserService.hasPermission(targetUser, UserPermissions.ManageUsers) &&
            !UserService.hasPermission(sourceUser, UserPermissions.Owner)
        ) {
            throw new ForbiddenError(
                UserPermissions.Owner,
                'Need the `Owner` permission to edit users with the `ManageUsers` permission.',
            );
        }
    }

    /**
     * User permission editing validation method, this checks that the new permissions don't add or remove anything they
     * shouldn't.
     * @param {UserPermissions} sourceUserPermissions Permissions of the user who is conducting the change.
     * @param {UserPermissions} oldPermissions Current permissions of the target user.
     * @param {UserPermissions} newPermissions Desired new permissions of the target user.
     * @throws Throws a {@link ForbiddenError} if permission checks fail.
     *
     * Note this does not check whether the source user should be able to apply this change, for that see
     * {@link canEditUser}.
     */
    private static canChangePermissionsTo(
        sourceUserPermissions: UserPermissions,
        oldPermissions: UserPermissions,
        newPermissions: UserPermissions,
    ): void {
        // if the permissions are the same, then it's fine
        if (oldPermissions === newPermissions) return;

        const isRemovingOrAdding = (p: UserPermissions) => {
            const oldHas = UserService.hasPermission(oldPermissions, p);
            const newHas = UserService.hasPermission(newPermissions, p);
            return oldHas !== newHas;
        };

        // the `Owner` permission cannot be removed or added
        if (isRemovingOrAdding(UserPermissions.Owner)) {
            throw new ForbiddenError(0, 'Cannot remove or add the `Owner` permission.');
        }

        // the `ManageUsers` permission cannot be removed or added by non-owners
        if (
            isRemovingOrAdding(UserPermissions.ManageUsers) &&
            !UserService.hasPermission(sourceUserPermissions, UserPermissions.Owner)
        ) {
            throw new ForbiddenError(0, 'Cannot remove or add the `ManageUsers` permission.');
        }
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
