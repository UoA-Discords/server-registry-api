import { Server } from '../types/Server';
import { ServerStatus } from '../types/Server/ServerStatus';

export const mockedServer: Server = {
    _id: 'mockedServer._id',
    created: {
        at: new Date().toISOString(),
        by: 'mockedServer.created.by',
    },
    serverTags: 0,
    guildData: {
        banner: null,
        description: null,
        icon: null,
        name: 'mockedServer.guildData.name',
        splash: null,
        verificationLevel: 0,
    },
    inviteCode: 'mockedServer.inviteCode',
    inviteCreatedBy: {
        id: 'mockedServer.inviteCreatedBy.id',
        username: 'mockedServer.inviteCreatedBy.username',
        discriminator: 'mockedServer.inviteCreatedBy.discriminator',
        avatar: 'mockedServer.inviteCreatedBy.avatar',
    },
    status: ServerStatus.Public,
    statusLog: [],
    size: {
        online: 123,
        total: 456,
        lastUpdated: new Date().toISOString(),
    },
    numFavourited: 0,
};
