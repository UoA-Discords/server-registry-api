import * as fetching from './fetching';
import * as permissions from './permissions';
import * as userDiscordData from './userDiscordData';

export const UserService = {
    ...fetching,
    ...permissions,
    ...userDiscordData,
};
