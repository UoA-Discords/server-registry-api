import { APIUser } from 'discord-api-types/payloads/v10/user';
import { defaultUser } from '../defaults/defaultUser';
import { User } from '../types/User';

export const mockedAPIUser: APIUser = {
    id: 'test Discord id',
    username: 'test Discord username',
    discriminator: 'test Discord discriminator',
    avatar: 'test Discord avatar',
};

export const mockedUser: User<true> = {
    ...defaultUser,
    _id: 'test user id',
    discord: {
        username: 'test user discord username',
        discriminator: 'test user discord discriminator',
        avatar: 'test user discord avatar',
    },
    metaData: {
        latestIp: 'test user latest IP',
        registered: new Date().toISOString(),
        lastLoginOrRefresh: new Date().toISOString(),
    },
};
