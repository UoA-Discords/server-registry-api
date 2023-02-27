import { Filter, Sort } from 'mongodb';
import { NotFoundError } from '../../errors/NotFoundError';
import { ServerModel } from '../../models/ServerModel';
import { Config } from '../../types/Config';
import { InviteData } from '../../types/Invite';
import { WithPagination } from '../../types/Page';
import { Server } from '../../types/Server';
import { ServerTags } from '../../types/Server/ServerTags';
import { ServerChangeRecord } from '../../types/Server/ServerChangeRecord';
import { ServerSortOptions } from '../../types/Server/ServerSortOptions';
import { ServerStatus } from '../../types/Server/ServerStatus';
import { User } from '../../types/User';
import { DiscordIdString } from '../../types/Utility';
import { UserService } from '../UserService';
import { GetAllServersParams } from './ServerServiceParams';
import { PermissionService } from '../PermissionService';

/**
 * The server service manages all interactions with the servers database.
 *
 * - Fetching a server by ID ({@link getServerById}).
 * - Fetching all servers ({@link getAllServers}).
 * - Creating a server ({@link createNewServer}).
 * - Refreshing a server ({@link refreshExistingServer}).
 * - Changing the status of a server ({@link changeServerStatus}).
 * - Changing the tags of a server ({@link changeServerTags}).
 *
 * Interactions with this service may throw any of the following errors:
 * - {@link NotFoundError}
 * - {@link PermissionService} Errors
 * - {@link UserService} Errors
 */
export class ServerService {
    private readonly _serverModel: ServerModel;

    private readonly _config: Config;

    private readonly _userService: UserService;

    public constructor(serverModel: ServerModel, config: Config, userService: UserService) {
        this._serverModel = serverModel;
        this._config = config;
        this._userService = userService;
    }

    /**
     * Fetches a server.
     * @param {DiscordIdString} id Discord ID of the server.
     * @param {boolean} onlyPublic Whether to only look at public and featured servers.
     * @returns {Promise<Server>} The server.
     *
     * See also: {@link getAllServers} (sister method)
     */
    public async getServerById(id: DiscordIdString, onlyPublic: boolean): Promise<Server> {
        const filter: Filter<Server> = onlyPublic
            ? { _id: id, status: { $in: [ServerStatus.Public, ServerStatus.Featured] } }
            : { _id: id };

        const server = await this._serverModel.findOne(filter);

        if (server === null) throw new NotFoundError('server');

        return server;
    }

    /**
     * Fetches an array of servers.
     * @param {GetAllServersParams} params Parameters for the fetching.
     * @returns {Promise<WithPagination<Server>>} The servers.
     *
     * See also: {@link getServerById} (sister method)
     */
    public async getAllServers(params: GetAllServersParams): Promise<WithPagination<Server>> {
        const { page, perPage, sortBy, sortDirection = 'asc', withStatus, withTags, searchTerm } = params;

        const filter: Filter<Server> = {};
        let sort: Sort;

        if (withStatus === 'visible') filter.status = { $in: [ServerStatus.Public, ServerStatus.Featured] };
        else if (withStatus !== undefined) filter.status = withStatus;

        if (searchTerm !== undefined) filter.$text = { $search: searchTerm };

        if (withTags !== undefined) {
            filter.serverTags =
                withTags.type === 'and' ? { $bitsAllSet: withTags.tags } : { $bitsAnySet: withTags.tags };
        }

        switch (sortBy) {
            case ServerSortOptions.CreatedAt:
                sort = { 'created.at': sortDirection, _id: 'asc' };
                break;
            case ServerSortOptions.Status:
                sort = { status: sortDirection, _id: 'asc' };
                break;
            case ServerSortOptions.MemberCount:
                sort = { 'size.total': sortDirection, _id: 'asc' };
                break;
            case ServerSortOptions.Id:
            default:
                sort = { _id: sortDirection };
                break;
        }

        const [totalItemCount, items] = await Promise.all([
            this._serverModel.countDocuments(filter),
            this._serverModel
                .find(filter, { skip: page * perPage, limit: perPage })
                .sort(sort)
                .toArray(),
        ]);

        return { totalItemCount, items };
    }

    /**
     * Creates a new server.
     * @param {User} creator The user who is responsible for this creation.
     * @param {InviteData} serverInfo Server invite data.
     * @param {ServerTags} tags Entry faculty tags for the server.
     * @returns {Promise<Server>} The newly created server.
     *
     * Make sure to check that server with the same ID does not already exist ({@link getServerById}), otherwise
     * undocumented errors may be thrown.
     *
     * See also: {@link refreshExistingServer} (sister method)
     */
    public async createNewServer(creator: User, serverInfo: InviteData, tags: ServerTags): Promise<Server> {
        const now = new Date().toISOString();

        const newServer: Server = {
            _id: serverInfo.guild.id,
            status: ServerStatus.Pending,
            inviteCode: serverInfo.code,
            inviteCreatedBy: {
                id: serverInfo.inviter.id,
                username: serverInfo.inviter.username,
                discriminator: serverInfo.inviter.discriminator,
                avatar: serverInfo.inviter.avatar,
            },

            guildData: {
                name: serverInfo.guild.name,
                icon: serverInfo.guild.icon,
                splash: serverInfo.guild.splash,
                banner: serverInfo.guild.banner,
                description: serverInfo.guild.description,
                verificationLevel: serverInfo.guild.verification_level,
            },
            created: {
                by: creator._id,
                at: now,
            },
            serverTags: tags,
            statusLog: [],
            size: {
                online: serverInfo.approximate_presence_count ?? -1,
                total: serverInfo.approximate_member_count ?? -1,
                lastUpdated: now,
            },
        };

        await this._serverModel.insertOne(newServer);

        // this isn't done in parallel with the above insertion as we want to ensure the server was successfully
        // inserted before updating the user's submission stats
        await this._userService.updateUserSubmissionStats(creator._id, ServerStatus.Pending);

        return newServer;
    }

    /**
     * Refreshes an existing server's Discord data.
     * @param {DiscordIdString} id Discord ID of the server.
     * @param {InviteData} updatedServerInfo The updated server invite data.
     * @returns {Promise<Server>} The refreshed server.
     *
     * See also: {@link createNewServer} (sister method)
     */
    public async refreshExistingServer(id: string, updatedServerInfo: InviteData): Promise<Server> {
        const { value: refreshedServer } = await this._serverModel.findOneAndUpdate(
            { _id: id },
            {
                $set: {
                    inviteCode: updatedServerInfo.code,
                    inviteCreatedBy: {
                        id: updatedServerInfo.inviter.id,
                        username: updatedServerInfo.inviter.username,
                        discriminator: updatedServerInfo.inviter.discriminator,
                        avatar: updatedServerInfo.inviter.avatar,
                    },
                    guildData: {
                        name: updatedServerInfo.guild.name,
                        icon: updatedServerInfo.guild.icon,
                        splash: updatedServerInfo.guild.splash,
                        banner: updatedServerInfo.guild.banner,
                        description: updatedServerInfo.guild.description,
                        verificationLevel: updatedServerInfo.guild.verification_level,
                    },
                    size: {
                        online: updatedServerInfo.approximate_presence_count ?? -1,
                        total: updatedServerInfo.approximate_member_count ?? -1,
                        lastUpdated: new Date().toISOString(),
                    },
                },
            },
            {
                returnDocument: 'after',
            },
        );

        if (refreshedServer === null) throw new NotFoundError('server');

        return refreshedServer;
    }

    /**
     * Changes the status of an existing server.
     * @param {User} conductor The user who is conducting change in status.
     * @param {DiscordIdString} id Discord ID of the server.
     * @param {ServerStatus} newStatus The new status of the server.
     * @param {string | null} reason The reason for the status change.
     * @returns {Promise<Server>} The updated server.
     *
     * See also: {@link determineServerStatusAction} (used by this method)
     */
    public async changeServerStatus(
        conductor: User,
        id: DiscordIdString,
        newStatus: ServerStatus,
        reason: string | null,
    ): Promise<Server> {
        const { status: oldStatus, statusLog: oldStatusLog } = await this.getServerById(id, false);

        const verb = PermissionService.validateServerStatusChange(conductor, oldStatus, newStatus);

        const newStatusLog: ServerChangeRecord[] = [
            {
                verb,
                by: conductor._id,
                at: new Date().toISOString(),
                reason,
            },
            ...oldStatusLog.slice(0, this._config.maxLogSize - 1),
        ];

        const { value: updatedServer } = await this._serverModel.findOneAndUpdate(
            { _id: id },
            { $set: { status: newStatus, statusLog: newStatusLog } },
            { returnDocument: 'after' },
        );

        if (updatedServer === null) throw new NotFoundError('server');

        await Promise.all([
            this._userService.updateUserSubmissionStats(updatedServer.created.by, newStatus, oldStatus),
            this._userService.updateUserActionStats(conductor._id, verb),
        ]);

        return updatedServer;
    }

    /**
     * Changes the tags of an existing server.
     * @param {DiscordIdString} id Discord ID of the server.
     * @param {ServerTags} newTags The new entry faculty tags.
     * @returns {Promise<Server>} The updated server.
     */
    public async changeServerTags(id: string, newTags: ServerTags): Promise<Server> {
        const { value: updatedServer } = await this._serverModel.findOneAndUpdate(
            { _id: id },
            {
                $set: { serverTags: newTags },
            },
            {
                returnDocument: 'after',
            },
        );

        if (updatedServer === null) throw new NotFoundError('server');

        return updatedServer;
    }
}
