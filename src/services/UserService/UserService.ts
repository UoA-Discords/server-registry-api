import { APIUser } from 'discord-api-types/v10';
import { Filter, Sort, StrictUpdateFilter } from 'mongodb';
import { defaultUser } from '../../defaults/defaultUser';
import { NotFoundError } from '../../errors/NotFoundError';
import { UserModel } from '../../models/UserModel';
import { Config } from '../../types/Config';
import { WithPagination } from '../../types/Page';
import { ServerStatus } from '../../types/Server/ServerStatus';
import { ServerStatusAction } from '../../types/Server/ServerStatusAction';
import { User } from '../../types/User';
import { UserChangeRecord } from '../../types/User/UserChangeRecord';
import { UserPermissions } from '../../types/User/UserPermissions';
import { UserSortOptions } from '../../types/User/UserSortOptions';
import { DiscordIdString } from '../../types/Utility';
import { PermissionService } from '../PermissionService';
import { GetAllUsersParams } from './UserServiceParams';

/**
 * The user service manages all interactions with the users database.
 *
 * - Fetching a user by ID ({@link getUserById}).
 * - Fetching all users ({@link getAllUsers}).
 * - Creating a user ({@link createNewUser}).
 * - Refreshing a user ({@link refreshExistingUser}).
 * - Updating the permissions of a user ({@link updateUserPermissions}).
 * - Updating the submission stats of a user ({@link updateUserSubmissionStats}).
 * - Updating the admin stats of a user ({@link updateUserActionStats}).
 *
 * Interactions with this service may throw any of the following errors:
 * - {@link NotFoundError}
 * - {@link PermissionService} Errors
 */
export class UserService {
    private readonly _userModel: UserModel;

    private readonly _config: Config;

    public constructor(userModel: UserModel, config: Config) {
        this._userModel = userModel;
        this._config = config;
    }

    /**
     * Fetches a user.
     * @param {DiscordIdString} id Discord ID of the user.
     * @returns {Promise<User>} The user.
     *
     * See also: {@link getAllUsers} (sister method)
     */
    public async getUserById(id: DiscordIdString): Promise<User> {
        const user = await this._userModel.findOne({ _id: id });

        if (user === null) throw new NotFoundError('user');

        return user;
    }

    /**
     * Fetches an array of users.
     * @param {GetAllUsersParams} params Parameters for the fetching.
     * @returns {Promise<WithPagination<User>>} The users.
     *
     * See also: {@link getUserById} (sister method)
     */
    public async getAllUsers(params: GetAllUsersParams): Promise<WithPagination<User>> {
        const { page, perPage, sortBy, sortDirection = 'asc', withIds, withPermissions, searchTerm } = params;

        const filter: Filter<User> = {};
        let sort: Sort;

        if (searchTerm !== undefined) filter.$text = { $search: searchTerm };

        if (withIds !== undefined) filter._id = { $in: withIds };

        if (withPermissions !== undefined) filter.permissions = { $bitsAllSet: withPermissions };

        switch (sortBy) {
            case UserSortOptions.LastLoginOrRefresh:
                sort = { 'metaData.lastLoginOrRefresh': sortDirection, _id: 'asc' };
                break;
            case UserSortOptions.Registered:
                sort = { 'metaData.registered': sortDirection, _id: 'asc' };
                break;
            case UserSortOptions.Id:
            default:
                sort = { _id: sortDirection };
                break;
        }

        const [totalItemCount, items] = await Promise.all([
            this._userModel.countDocuments(filter),
            this._userModel
                .find(filter, { skip: page * perPage, limit: perPage })
                .sort(sort)
                .toArray(),
        ]);

        return { totalItemCount, items };
    }

    /**
     * Creates a new user.
     * @param {APIUser} discordUser Discord user data to be associated with the user.
     * @param {string} ip Current IP address of the user.
     * @returns {Promise<User>} The newly created user.
     *
     * Make sure to check that a user with the same ID does not already exist ({@link getUserById}), otherwise
     * undocumented errors may be thrown.
     *
     * See also: {@link refreshExistingUser} (sister method)
     */
    public async createNewUser(discordUser: APIUser, ip: string): Promise<User> {
        const now = new Date().toISOString();

        const newUser: User = {
            ...defaultUser,
            _id: discordUser.id,
            discord: {
                username: discordUser.username,
                discriminator: discordUser.discriminator,
                avatar: discordUser.avatar,
            },
            metaData: {
                latestIp: ip,
                registered: now,
                lastLoginOrRefresh: now,
            },
        };

        await this._userModel.insertOne(newUser);

        return newUser;
    }

    /**
     * Refreshes an existing user's Discord data.
     * @param {APIUser} discordUser The updated user Discord data.
     * @param {string} ip Current IP address of the user.
     * @returns {Promise<User>} The refreshed user.
     *
     * See also: {@link createNewUser} (sister method)
     */
    public async refreshExistingUser(discordUser: APIUser, ip: string): Promise<User> {
        const update: StrictUpdateFilter<User> = {
            $set: {
                'metaData.lastLoginOrRefresh': new Date().toISOString(),
                'metaData.latestIp': ip,
                discord: {
                    username: discordUser.username,
                    discriminator: discordUser.discriminator,
                    avatar: discordUser.avatar,
                },
            },
        };

        const { value: refreshedUser } = await this._userModel.findOneAndUpdate({ _id: discordUser.id }, update, {
            returnDocument: 'after',
        });

        if (refreshedUser === null) throw new NotFoundError('user');

        return refreshedUser;
    }

    /**
     * Updates the permissions of an existing user.
     * @param {User} conductor The user who is conducting the change in permissions.
     * @param {DiscordIdString} id Discord ID of the user whose permissions are being changed.
     * @param {UserPermissions} newPermissions The new permissions for the target user.
     * @param {string | null} reason The reason for the change.
     * @returns {Promise<User>} The updated user.
     */
    public async updateUserPermissions(
        conductor: User,
        id: DiscordIdString,
        newPermissions: UserPermissions,
        reason: string | null,
    ): Promise<User> {
        const targetUser = await this.getUserById(id);

        PermissionService.checkCanEditPermissionsOf(conductor, targetUser);
        PermissionService.checkCanChangePermissionsTo(conductor, targetUser.permissions, newPermissions);

        const newPermissionLog: UserChangeRecord[] = [
            {
                oldUserPermissions: targetUser.permissions,
                by: conductor._id,
                at: new Date().toISOString(),
                reason,
            },
            ...targetUser.permissionsLog.slice(0, this._config.maxLogSize - 1),
        ];

        const { value: updatedUser } = await this._userModel.findOneAndUpdate(
            { _id: id },
            {
                $set: { permissions: newPermissions, permissionsLog: newPermissionLog },
            },
            {
                returnDocument: 'after',
            },
        );

        if (updatedUser === null) throw new NotFoundError('server');

        return updatedUser;
    }

    /**
     * Updates the {@link User.submissions submission stats} of a user.
     * @param {DiscordIdString} id The ID of the user whose stats are being updated.
     * @param {ServerStatus} newStatus The status of the server that has been updated.
     * @param {ServerStatus} [oldStatus] The previous status of the server that has been updated, this may be undefined
     * for {@link ServerStatus.Pending pending} submissions.
     *
     * Note that this does not throw a {@link NotFoundError} error if the user doesn't exist.
     *
     * See also: {@link updateUserActionStats} (sister method)
     */
    public async updateUserSubmissionStats(
        id: DiscordIdString,
        newStatus: ServerStatus,
        oldStatus?: ServerStatus,
    ): Promise<void> {
        const updateOldStatus = oldStatus !== undefined ? { [`submissions.${oldStatus}`]: -1 } : {};

        await this._userModel.findOneAndUpdate(
            { _id: id },
            {
                $inc: {
                    [`submissions.${newStatus}`]: 1,
                    ...updateOldStatus,
                },
            },
        );
    }

    /**
     * Updates the {@link User.actions administrative action stats} of an admin user.
     * @param {DiscordIdString} id The ID of admin user whose stats are being updated.
     * @param {ServerStatusAction} action The type of server status change that occurred.
     *
     * Note that this does not throw a {@link NotFoundError} if the user doesn't exist.
     *
     * See also: {@link updateUserSubmissionStats} (sister method)
     */
    public async updateUserActionStats(id: DiscordIdString, action: ServerStatusAction): Promise<void> {
        await this._userModel.findOneAndUpdate(
            { _id: id },
            {
                $inc: {
                    [`actions.${action}`]: 1,
                },
            },
        );
    }

    public async getNumUsers(): Promise<number> {
        return await this._userModel.countDocuments();
    }
}
