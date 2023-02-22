import { APIUser, GuildVerificationLevel } from 'discord-api-types/v10';
import { DiscordIdString, ISOString } from '../Utility';
import { EntryFacultyTags } from './EntryFacultyTags';
import { ServerChangeRecord } from './ServerChangeRecord';
import { ServerStatus } from './ServerStatus';

/** A Discord server in our database. */
export interface Server {
    /** This is underscored to show that it is used as a document index in MongoDB. */
    _id: DiscordIdString;

    status: ServerStatus;

    /**
     * The accompanying invite code this server was registered with, without the `discord.gg/` prefix.
     *
     * Note that it may no longer be valid, in which case it should be withdrawn.
     */
    inviteCode: string;

    /**
     * The ID of user who created this invite.
     *
     * If this user exists in our database, their Discord ID is used.
     *
     * Otherwise parts of the Discord API {@link APIUser User} object returned from the invite data are used.
     *
     * Can also be `null` since some invites do not have a creator.
     */
    inviteCreatedBy: DiscordIdString | Pick<APIUser, 'id' | 'username' | 'discriminator' | 'avatar'> | null;

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

    statusLog: ServerChangeRecord[];
}
