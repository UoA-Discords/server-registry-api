/* eslint-disable @typescript-eslint/no-explicit-any */
import { StrictUpdateFilter } from 'mongodb';
import { defaultUser } from '../defaults/defaultUser';
import { AccountDeletedError } from '../errors/AccountDeletedError';
import { ForbiddenError } from '../errors/ForbiddenError';
import { InternalServiceError } from '../errors/InternalServiceError';
import { NotFoundError } from '../errors/NotFoundError';
import { UserModel } from '../models/UserModel';
import { mockedAPIUser, mockedUser } from '../tests/mockedUser';
import { User } from '../types/User';
import { UserChangeRecord } from '../types/User/UserChangeRecord';
import { UserPermissions } from '../types/User/UserPermissions';
import { UserService } from './UserService';

const now = new Date();

jest.useFakeTimers().setSystemTime(now);

describe('UserService', () => {
    describe('getSpecificUsers', () => {
        const find = jest.fn<{ toArray: () => User<true>[] }, any>(() => ({ toArray: () => [mockedUser] }));

        const userService = new UserService({ find } as unknown as UserModel);

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('returns matching users', async () => {
            const res = await userService.getSpecificUsers([mockedUser._id, 'some other id']);

            expect(res).toEqual([mockedUser]);

            expect(find).toHaveBeenCalledTimes(1);
            expect(find).toHaveBeenCalledWith({ _id: { $in: [mockedUser._id, 'some other id'] } });
        });
    });

    describe('getAllUsers', () => {
        const countDocuments = jest.fn<number, any>(() => 1);
        const find = jest.fn<{ toArray: () => User<true>[] }, any>(() => ({ toArray: () => [mockedUser] }));

        const userService = new UserService({ countDocuments, find } as unknown as UserModel);

        afterEach(() => {
            jest.clearAllMocks();
        });

        it('makes all required calls to the user model', async () => {
            const res = await userService.getAllUsers(0, 1);

            expect(res).toEqual({
                totalItemCount: 1,
                items: [mockedUser],
            });

            expect(countDocuments).toHaveBeenCalledTimes(1);
            expect(countDocuments).toHaveBeenCalledWith({});

            expect(find).toHaveBeenCalledTimes(1);
            expect(find).toHaveBeenCalledWith({}, { skip: 0, limit: 1 });
        });

        it('adds a text search when supplied', async () => {
            const res = await userService.getAllUsers(0, 1, 'test search term');

            expect(res).toEqual({
                totalItemCount: 1,
                items: [mockedUser],
            });

            expect(countDocuments).toHaveBeenCalledTimes(1);
            expect(countDocuments).toHaveBeenCalledWith({ $text: { $search: 'test search term' } });

            expect(find).toHaveBeenCalledTimes(1);
            expect(find).toHaveBeenCalledWith({ $text: { $search: 'test search term' } }, { skip: 0, limit: 1 });
        });
    });

    describe('getUserById', () => {
        const findOne = jest.fn<User<true> | null, any>();
        const userService = new UserService({ findOne } as unknown as UserModel);

        it('returns the user if they exist', async () => {
            findOne.mockReturnValueOnce(mockedUser);

            const res = await userService.getUserById(mockedUser._id, true);
            expect(res).toEqual(mockedUser);
        });

        it("throws a NotFoundError if the user doesn't exist and isSelf is false", async () => {
            findOne.mockReturnValueOnce(null);

            try {
                await userService.getUserById(mockedUser._id, false);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundError);
            }
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

    describe('updateUserPermissions', () => {
        const owner: User<true> = { ...mockedUser, permissions: UserPermissions.Owner, _id: 'owner' };
        const manager: User<true> = { ...mockedUser, permissions: UserPermissions.ManageUsers, _id: 'manager' };

        const findOneAndUpdate = jest.fn<
            ReturnType<UserModel['findOneAndUpdate']>,
            Parameters<UserModel['findOneAndUpdate']>
        >();
        const findOne = jest.fn<ReturnType<UserModel['findOne']>, Parameters<UserModel['findOne']>>();
        const userService = new UserService({ findOneAndUpdate, findOne } as unknown as UserModel);

        it('throws a ForbiddenError if preliminary checks fail', async () => {
            findOne.mockResolvedValueOnce(owner).mockResolvedValueOnce(owner);

            // canEditUser will throw
            try {
                await userService.updateUserPermissions(manager, owner._id, owner.permissions, null);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(ForbiddenError);
            }

            // canChangePermissionsTo will throw
            try {
                await userService.updateUserPermissions(owner, owner._id, 0, null);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(ForbiddenError);
            }
        });

        it('calls the findOneAndUpdate method of the user model', async () => {
            findOne.mockResolvedValueOnce(owner);
            findOneAndUpdate.mockResolvedValueOnce({ value: owner } as unknown as ReturnType<
                UserModel['findOneAndUpdate']
            >);

            await userService.updateUserPermissions(
                owner,
                owner._id,
                owner.permissions | UserPermissions.ManageServers,
                'some reason',
            );

            expect(findOneAndUpdate).toBeCalledWith<[{ _id: string }, StrictUpdateFilter<User<true>>]>(
                { _id: owner._id },
                {
                    $set: {
                        permissions: owner.permissions | UserPermissions.ManageServers,
                        permissionsLog: expect.arrayContaining<UserChangeRecord>([
                            {
                                oldUserPermissions: owner.permissions,
                                by: owner._id,
                                at: now.toISOString(),
                                reason: 'some reason',
                            },
                            ...owner.permissionsLog,
                        ]),
                    },
                },
            );
            expect(findOneAndUpdate).toBeCalledTimes(1);
        });

        it('throws a NotFoundError if the update fails', async () => {
            findOne.mockResolvedValueOnce(owner);
            findOneAndUpdate.mockResolvedValueOnce({ value: null } as unknown as ReturnType<
                UserModel['findOneAndUpdate']
            >);

            try {
                await userService.updateUserPermissions(
                    owner,
                    owner._id,
                    owner.permissions | UserPermissions.ManageServers,
                    'some reason',
                );
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundError);
            }
        });
    });

    describe('canEditUser', () => {
        const owner: User<true> = { ...mockedUser, permissions: UserPermissions.Owner, _id: 'owner' };
        const manager: User<true> = { ...mockedUser, permissions: UserPermissions.ManageUsers, _id: 'manager' };
        const manager2: User<true> = { ...mockedUser, permissions: UserPermissions.ManageUsers, _id: 'manager2' };
        const normal: User<true> = { ...mockedUser, permissions: 0, _id: 'normal' };

        it("throws a ForbiddenError when the source user does not have the 'Manage Users' or 'Owner' permissions", () => {
            try {
                UserService['canEditUser'](normal, normal);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(ForbiddenError);
            }
        });

        it("passes when a user with the 'Manage Users' or 'Owner' permissions is editing themselves", () => {
            expect(() => UserService['canEditUser'](owner, owner)).not.toThrow();
            expect(() => UserService['canEditUser'](manager, manager)).not.toThrow();
        });

        it("throws a ForbiddenError if the target user has the 'Owner' permission and they are not targetting themselves", () => {
            try {
                UserService['canEditUser'](manager, owner);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(ForbiddenError);
            }
        });

        it("throws a ForbiddenError if the target user has the 'Manage Users' permission if the source user doesn't have the 'Owner' permission", () => {
            try {
                UserService['canEditUser'](manager2, manager);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(ForbiddenError);
            }
            expect(() => UserService['canEditUser'](owner, manager)).not.toThrow();
        });

        // it('passes in all other situations', () => {
        //     expect(UserService['canEditUser'](manager, normal)).toBe(true);
        //     expect(UserService['canEditUser'](owner, normal)).toBe(true);
        // });
    });

    describe('canChangePermissionsTo', () => {
        it('passes when the permissions are equal', () => {
            const permissions = UserPermissions.Favourite | UserPermissions.Feature | UserPermissions.MakeApplications;
            expect(() => UserService['canChangePermissionsTo'](0, permissions, permissions)).not.toThrow();
        });

        it("throws a ForbiddenError when the 'Owner' permission is being added or removed", () => {
            const withoutOwner = UserPermissions.Favourite | UserPermissions.Feature | UserPermissions.MakeApplications;
            const withOwner = withoutOwner | UserPermissions.Owner;

            try {
                UserService['canChangePermissionsTo'](0, withoutOwner, withOwner);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(ForbiddenError);
            }

            try {
                UserService['canChangePermissionsTo'](0, withOwner, withoutOwner);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(ForbiddenError);
            }
        });

        it("throws a ForbiddenError when a non-owner is trying to add or remove the 'Manage Users' permission", () => {
            const withoutManageUsers = UserPermissions.Favourite | UserPermissions.Feature;
            const withManageUsers = withoutManageUsers | UserPermissions.ManageUsers;

            try {
                UserService['canChangePermissionsTo'](0, withoutManageUsers, withManageUsers);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(ForbiddenError);
            }

            try {
                UserService['canChangePermissionsTo'](0, withManageUsers, withoutManageUsers);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(ForbiddenError);
            }
        });

        it("passes when an owner is trying to add or remove the 'Manage Users' permission", () => {
            const withoutManageUsers = UserPermissions.Favourite | UserPermissions.Feature;
            const withManageUsers = withoutManageUsers | UserPermissions.ManageUsers;

            expect(() =>
                UserService['canChangePermissionsTo'](UserPermissions.Owner, withoutManageUsers, withManageUsers),
            ).not.toThrow();

            expect(() =>
                UserService['canChangePermissionsTo'](UserPermissions.Owner, withManageUsers, withoutManageUsers),
            ).not.toThrow();
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
