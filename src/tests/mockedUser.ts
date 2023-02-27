import { defaultUser } from '../defaults/defaultUser';
import { User } from '../types/User';

export const mockedUser: User = {
    ...defaultUser,
    _id: 'mockedUser._id',
    discord: {
        username: 'mockedUser.discord.username',
        discriminator: 'mockedUser.discord.discriminator',
        avatar: 'mockedUser.discord.avatar',
    },
    metaData: {
        latestIp: 'mockedUser.metaData.latestIp',
        registered: new Date().toISOString(),
        lastLoginOrRefresh: new Date().toISOString(),
    },
};
