/* eslint-disable @typescript-eslint/no-explicit-any */
import { StrictUpdateFilter } from 'mongodb';
import { defaultUser } from '../defaults/defaultUser';
import { AccountDeletedError } from '../errors/AccountDeletedError';
import { InternalServiceError } from '../errors/InternalServiceError';
import { UserModel } from '../models/UserModel';
import { mockedAPIUser, mockedUser } from '../tests/mockedUser';
import { User } from '../types/User';
import { UserPermissions } from '../types/User/UserPermissions';
import { UserService } from './UserService';

const now = new Date();

jest.useFakeTimers().setSystemTime(now);

describe('UserService', () => {
    describe('getAllUsers', () => {
        const countDocuments = jest.fn<number, any>(() => 1);
        const find = jest.fn<{ toArray: () => User<true>[] }, any>(() => ({ toArray: () => [mockedUser] }));

        const userService = new UserService({ countDocuments, find } as unknown as UserModel);

        it('makes all required calls to the user model', async () => {
            const res = await userService.getAllUsers(0, 1);

            expect(res).toEqual({
                totalItemCount: 1,
                items: [mockedUser],
            });

            expect(countDocuments).toHaveBeenCalledTimes(1);
            expect(find).toHaveBeenCalledTimes(1);
        });
    });

    describe('getUserById', () => {
        const findOne = jest.fn<User<true> | null, any>();
        const userService = new UserService({ findOne } as unknown as UserModel);

        it('returns the user if they exist', async () => {
            findOne.mockReturnValueOnce(mockedUser);

            const res = await userService.getUserById(mockedUser._id, false);
            expect(res).toEqual(mockedUser);
        });

        it("returns null if the user doesn't exist and isSelf is false", async () => {
            findOne.mockReturnValueOnce(null);

            const res = await userService.getUserById(mockedUser._id, false);
            expect(res).toEqual(null);
        });

        it("throws an AccountDeletedError if the user doesn't exist and isSelf is true", async () => {
            findOne.mockReturnValueOnce(null);

            try {
                await userService.getUserById(mockedUser._id, true);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(AccountDeletedError);
            }
        });
    });

    describe('registerNewUser', () => {
        const insertOne = jest.fn<User<true>, any>();
        const userService = new UserService({ insertOne } as unknown as UserModel);

        it('creates a new user using the default values', async () => {
            const res = await userService.registerNewUser(mockedAPIUser, 'some ip');

            const createdUser: User<true> = {
                ...defaultUser,
                _id: mockedAPIUser.id,
                discord: {
                    username: mockedAPIUser.username,
                    discriminator: mockedAPIUser.discriminator,
                    avatar: mockedAPIUser.avatar,
                },
                metaData: {
                    latestIp: 'some ip',
                    lastLoginOrRefresh: now.toISOString(),
                    registered: now.toISOString(),
                },
            };

            expect(res).toEqual(createdUser);

            expect(insertOne).toBeCalledWith(createdUser);
            expect(insertOne).toBeCalledTimes(1);
        });

        it('throws an InternalServiceError if an error occurs', async () => {
            insertOne.mockImplementationOnce(() => {
                throw new Error();
            });

            try {
                await userService.registerNewUser(mockedAPIUser, 'some ip');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(InternalServiceError);
            }
        });
    });

    describe('refreshExistingUser', () => {
        const findOneAndUpdate = jest.fn<{ value: User<true> | null }, any>();
        const userService = new UserService({ findOneAndUpdate } as unknown as UserModel);

        it('updates metadata and Discord user data', async () => {
            const prevTimestamp = new Date(Date.now() - 1_000 * 60 * 60).toISOString();
            const existingUser: User<true> = {
                ...mockedUser,
                _id: 'some user id',
                metaData: {
                    lastLoginOrRefresh: prevTimestamp,
                    latestIp: mockedUser.metaData.latestIp,
                    registered: prevTimestamp,
                },
            };
            findOneAndUpdate.mockReturnValueOnce({ value: existingUser });

            const res = await userService.refreshExistingUser({ ...mockedAPIUser, id: 'some user id' }, 'some new ip');

            expect(res).toEqual(existingUser);

            expect(findOneAndUpdate).toHaveBeenCalledWith<[{ _id: string }, StrictUpdateFilter<User<true>>]>(
                { _id: 'some user id' },
                {
                    $set: {
                        'metaData.lastLoginOrRefresh': now.toISOString(),
                        'metaData.latestIp': 'some new ip',
                        discord: {
                            username: mockedAPIUser.username,
                            avatar: mockedAPIUser.avatar,
                            discriminator: mockedAPIUser.discriminator,
                        },
                    },
                },
            );

            expect(findOneAndUpdate).toBeCalledTimes(1);
        });

        it("throws an AccountDeletedError if the user doesn't exist", async () => {
            findOneAndUpdate.mockReturnValueOnce({ value: null });

            try {
                await userService.refreshExistingUser(mockedAPIUser, 'some new ip');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(AccountDeletedError);
            }
        });
    });

    describe('hasPermission', () => {
        const permissions = UserPermissions.Favourite | UserPermissions.Feature | UserPermissions.MakeApplications;

        it('works with user objects', () => {
            const user = { permissions } as User<true>;

            expect(UserService.hasPermission(user, UserPermissions.MakeLotsOfApplications)).toBe(false);

            expect(UserService.hasPermission(user, UserPermissions.Favourite)).toBe(true);

            expect(
                UserService.hasPermission(user, UserPermissions.Favourite | UserPermissions.MakeLotsOfApplications),
            ).toBe(false);

            expect(UserService.hasPermission(user, UserPermissions.Favourite | UserPermissions.Feature)).toBe(true);
        });

        it('works with permissions bitfields', () => {
            expect(UserService.hasPermission(permissions, UserPermissions.MakeLotsOfApplications)).toBe(false);

            expect(UserService.hasPermission(permissions, UserPermissions.Favourite)).toBe(true);

            expect(
                UserService.hasPermission(
                    permissions,
                    UserPermissions.Favourite | UserPermissions.MakeLotsOfApplications,
                ),
            ).toBe(false);

            expect(UserService.hasPermission(permissions, UserPermissions.Favourite | UserPermissions.Feature)).toBe(
                true,
            );
        });
    });

    describe('splitPermissions', () => {
        it('works with permissions bitfields', () => {
            expect(UserService.splitPermissions(UserPermissions.Favourite | UserPermissions.Feature)).toEqual([
                UserPermissions.Favourite,
                UserPermissions.Feature,
            ]);
        });
    });
});
