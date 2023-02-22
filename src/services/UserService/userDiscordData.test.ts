import { StrictUpdateFilter } from 'mongodb';
import { defaultUser } from '../../defaults/defaultUser';
import { AuthError } from '../../errors/AuthError';
import { UserModel } from '../../models/UserModel';
import { mockedAPIUser } from '../../tests/mockedUser';
import { User } from '../../types/User';
import { DiscordIdString } from '../../types/Utility';
import { registerUser, updateUserDiscordData } from './userDiscordData';

const now = new Date();

jest.useFakeTimers().setSystemTime(now);

describe('registerUser', () => {
    it('inserts a user with default values', async () => {
        const insertOne = jest.fn();

        await registerUser({ insertOne } as unknown as UserModel, mockedAPIUser, 'fake ip');

        expect(insertOne).toBeCalledTimes(1);
        expect(insertOne).toBeCalledWith<User<true>[]>({
            ...defaultUser,
            _id: mockedAPIUser.id,
            discord: {
                username: mockedAPIUser.username,
                discriminator: mockedAPIUser.discriminator,
                avatar: mockedAPIUser.avatar,
            },
            metaData: {
                latestIp: 'fake ip',
                registered: now.toISOString(),
                lastLoginOrRefresh: now.toISOString(),
            },
        });
    });
});

describe('updateUserDiscordData', () => {
    it('updates meta data and Discord data on an existing user', async () => {
        const findOneAndUpdate = jest.fn(() => ({ value: '' }));

        await updateUserDiscordData({ findOneAndUpdate } as unknown as UserModel, mockedAPIUser, 'fake ip');

        expect(findOneAndUpdate).toBeCalledTimes(1);
        expect(findOneAndUpdate).toBeCalledWith<[{ _id: DiscordIdString }, StrictUpdateFilter<User<true>>]>(
            { _id: mockedAPIUser.id },
            {
                $set: {
                    'metaData.lastLoginOrRefresh': now.toISOString(),
                    'metaData.latestIp': 'fake ip',
                    discord: {
                        username: mockedAPIUser.username,
                        discriminator: mockedAPIUser.discriminator,
                        avatar: mockedAPIUser.avatar,
                    },
                },
            },
        );
    });

    it('throws an AuthError if the user account cannot be found', async () => {
        const findOneAndUpdate = jest.fn(() => ({ value: null }));

        try {
            await updateUserDiscordData({ findOneAndUpdate } as unknown as UserModel, mockedAPIUser, 'fake ip');
            fail('should have thrown an error');
        } catch (error) {
            expect(error instanceof AuthError);
        }
    });
});
