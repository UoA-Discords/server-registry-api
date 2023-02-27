import { APIUser, GuildVerificationLevel } from 'discord-api-types/v10';
import { DiscordIdString, ISOString } from '../Utility';
import { ServerTags } from './ServerTags';
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
     * The {@link APIUser user} who created this invite.
     *
     * Can be `null` since some invites do not have a creator.
     */
    inviteCreatedBy: Pick<APIUser, 'id' | 'username' | 'discriminator' | 'avatar'> | null;

    guildData: {
        name: string;

        icon: string | null;

        splash: string | null;

        banner: string | null;

        description: string | null;

        verificationLevel: GuildVerificationLevel;
    };

    created: {
        by: DiscordIdString;

        at: ISOString;
    };

    serverTags: ServerTags;

    statusLog: ServerChangeRecord[];

    /** Approximate values of the server's online and total member count. */
    size: {
        online: number;
        total: number;
        lastUpdated: ISOString;
    };
}
