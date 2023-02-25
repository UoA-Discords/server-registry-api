import { GuildVerificationLevel } from 'discord-api-types/v10';
import { Server } from '../types/Server';
import { ServerStatus } from '../types/Server/ServerStatus';

export function mockServer(partialServer?: Partial<Server>): Server {
    return {
        _id: 'test server id',
        created: {
            at: new Date().toISOString(),
            by: 'test server creator id',
        },
        entryFacultyTags: 0,
        guildData: {
            banner: 'test server banner',
            description: 'test server description',
            icon: 'test server icon',
            name: 'test server name',
            splash: 'test server splash',
            verificationLevel: GuildVerificationLevel.None,
        },
        inviteCode: 'test server invite code',
        inviteCreatedBy: {
            avatar: 'test server invite creator avatar',
            discriminator: 'test server invite creator discriminator',
            id: 'test server invite creator id',
            username: 'test server invite creator username',
        },
        status: ServerStatus.Public,
        statusLog: [],
        size: {
            online: 123,
            total: 456,
            lastUpdated: new Date().toISOString(),
        },
        ...partialServer,
    };
}
