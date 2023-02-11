import { APIUser, GuildVerificationLevel } from 'discord-api-types/v10';
import { EntryFacultyTags } from '../enums/EntryFacultyTags';
import { ServerStatus } from '../enums/ServerStatus';
import { DiscordIdString, ISOString } from '../types/utility';
import { IServerChangeRecord } from './IServerChangeRecord';

/** A Discord server in our database. */
export interface IServer<T extends ServerStatus> {
    /** This is underscored to show that it is used as a document index in MongoDB. */
    _id: DiscordIdString;

    status: T;

    /**
     * The accompanying invite code this server was registered with, without the `discord.gg/` prefix.
     *
     * Note that it may no longer be valid.
     */
    inviteCode: string;

    /**
     * The ID of user who created this invite.
     *
     * If this user exists in our database, their Discord ID is used.
     *
     * Otherwise the Discord API {@link APIUser} returned from the invite data is used.
     *
     * Can be `null` since some invites do not have a creator.
     */
    inviteCreatedBy: DiscordIdString | APIUser | null;

    guildData: {
        name: string;

        icon: string;

        splash: string | null;

        banner: string | null;

        description: string | null;

        verificationLevel: GuildVerificationLevel;
    };

    created: {
        by: DiscordIdString;

        at: ISOString;
    };

    entryFacultyTags: EntryFacultyTags;

    statusLog: IServerChangeRecord[];
}
