import { defaultUser } from '../../defaults/defaultUser';
import { NotFoundError } from '../../errors/NotFoundError';
import { TestDatabase, createTestDatabase } from '../../tests/createTestDatabase';
import { mockedConfig } from '../../tests/mockedConfig';
import { mockedUserChangeRecord } from '../../tests/mockedUserChangeRecord';
import { mockedAPIUser } from '../../tests/mockedAPIUser';
import { WithPagination } from '../../types/Page';
import { ServerStatus } from '../../types/Server/ServerStatus';
import { ServerStatusAction } from '../../types/Server/ServerStatusAction';
import { User } from '../../types/User';
import { UserPermissions } from '../../types/User/UserPermissions';
import { UserSortOptions } from '../../types/User/UserSortOptions';
import { UserService } from '../UserService';
import { PermissionService } from '../PermissionService';
import { mockedUser } from '../../tests/mockedUser';

describe('UserService', () => {
    let testDatabase: TestDatabase;
    let userService: UserService;

    beforeAll(async () => {
        testDatabase = await createTestDatabase();
        userService = new UserService(testDatabase.userModel, mockedConfig);
    });

    afterAll(async () => {
        await testDatabase.shutdown();
    });

    describe('getUserById', () => {
        beforeAll(async () => {
            await testDatabase.userModel.insertOne(mockedUser);
        });

        afterAll(async () => {
            await testDatabase.userModel.deleteOne({ _id: mockedUser._id });
        });

        it('returns the user with the given ID', async () => {
            const user = await userService.getUserById(mockedUser._id);

            expect(user).toEqual(mockedUser);
        });

        it('throws a NotFoundError if the user cannot be found', async () => {
            try {
                await userService.getUserById('some id');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundError);
            }
        });
    });

    describe('getAllUsers', () => {
        const users = new Array(30).fill({}).map(
            (_e, i): User => ({
                ...mockedUser,
                _id: `mocked user ${i}`,
                discord: {
                    ...mockedUser.discord,
                    // random 10 digit string of uppercase and lowercase letters
                    username: String.fromCharCode(
                        ...new Array(10).fill(0).map(() => {
                            const charId = Math.floor(Math.random() * 52);
                            const charCode = charId < 26 ? charId + 65 : charId + 71;
                            return charCode;
                        }),
                    ),
                },
                metaData: {
                    ...mockedUser.metaData,
                    // random time from 0 to 1 minute ago
                    registered: new Date(Date.now() - Math.floor(Math.random() * 1_000 * 60)).toISOString(),
                    // random time from 0 to 1 minute ago
                    lastLoginOrRefresh: new Date(Date.now() - Math.floor(Math.random() * 1_000 * 60)).toISOString(),
                },
                permissions: [0, UserPermissions.Owner, UserPermissions.Owner | UserPermissions.Favourite][i % 3],
            }),
        );

        const byId = (a: User, b: User) => a._id.localeCompare(b._id);

        const withIdAsFallback = (compareFn: (a: User, b: User) => number) => {
            return (a: User, b: User) => {
                return compareFn(a, b) || byId(a, b);
            };
        };

        beforeAll(async () => {
            await testDatabase.userModel.insertMany(users);
        });

        afterAll(async () => {
            await testDatabase.userModel.deleteMany({ _id: { $in: users.map((e) => e._id) } });
        });

        describe('page and perPage', () => {
            it('returns the correct subset of users', async () => {
                const page = 2;
                const perPage = 10;

                const result = await userService.getAllUsers({ page, perPage });

                expect(result).toEqual<WithPagination<User>>({
                    totalItemCount: users.length,
                    items: users.sort(byId).slice(page * perPage, (page + 1) * perPage),
                });
            });
        });

        describe('sortBy', () => {
            it('sorts by Discord ID', async () => {
                const { items } = await userService.getAllUsers({ page: 0, perPage: 10, sortBy: UserSortOptions.Id });

                expect(items).toEqual(users.sort(byId).slice(0, 10));
            });

            it('sorts by registration timestamp', async () => {
                const { items } = await userService.getAllUsers({
                    page: 0,
                    perPage: 10,
                    sortBy: UserSortOptions.Registered,
                });

                expect(items).toEqual(
                    users
                        .sort(withIdAsFallback((a, b) => a.metaData.registered.localeCompare(b.metaData.registered)))
                        .slice(0, 10),
                );
            });

            it('sorts by last login or registration timestamp', async () => {
                const { items } = await userService.getAllUsers({
                    page: 0,
                    perPage: 10,
                    sortBy: UserSortOptions.LastLoginOrRefresh,
                });

                expect(items).toEqual(
                    users
                        .sort(
                            withIdAsFallback((a, b) =>
                                a.metaData.lastLoginOrRefresh.localeCompare(b.metaData.lastLoginOrRefresh),
                            ),
                        )
                        .slice(0, 10),
                );
            });
        });

        describe('sortDirection', () => {
            it('sorts in descending order', async () => {
                const { items } = await userService.getAllUsers({ page: 0, perPage: 10, sortDirection: 'desc' });

                expect(items).toEqual(users.sort(byId).reverse().slice(0, 10));
            });
        });

        describe('withIds', () => {
            it('returns only users with the given IDs', async () => {
                const { items } = await userService.getAllUsers({
                    page: 0,
                    perPage: 10,
                    withIds: [users[0]._id, users[5]._id],
                });

                expect(items).toEqual([users[0], users[5]].sort(byId).slice(0, 10));
            });
        });

        describe('withPermissions', () => {
            it('returns only users with all of the given permissions', async () => {
                const withPermissions = UserPermissions.Owner | UserPermissions.Favourite;

                const { items } = await userService.getAllUsers({
                    page: 0,
                    perPage: 10,
                    withPermissions,
                });

                expect(items).toEqual(
                    users
                        .filter((e) => (e.permissions & withPermissions) === withPermissions)
                        .sort(byId)
                        .slice(0, 10),
                );
            });
        });

        describe('searchTerm', () => {
            it('returns only users with matching Discord usernames', async () => {
                const searchTerm = users[0].discord.username;

                const { items } = await userService.getAllUsers({ page: 0, perPage: 10, searchTerm });

                expect(items).toEqual(
                    users
                        .filter((e) => e.discord.username === searchTerm)
                        .sort(byId)
                        .slice(0, 10),
                );
            });
        });
    });

    describe('createNewUser', () => {
        let returnedUser: User;
        let insertedUser: User | null;

        beforeAll(async () => {
            returnedUser = await userService.createNewUser(mockedAPIUser, 'some ip');
            insertedUser = await testDatabase.userModel.findOne({ _id: mockedAPIUser.id });
            await testDatabase.userModel.deleteOne({ _id: mockedAPIUser.id });
        });

        it('inserts a new user into the database', () => {
            expect(insertedUser).toEqual<User>({
                ...defaultUser,
                _id: mockedAPIUser.id,
                discord: {
                    username: mockedAPIUser.username,
                    discriminator: mockedAPIUser.discriminator,
                    avatar: mockedAPIUser.avatar,
                },
                metaData: {
                    latestIp: 'some ip',
                    registered: new Date().toISOString(),
                    lastLoginOrRefresh: new Date().toISOString(),
                },
            });
        });

        it('returns the newly created user', () => {
            expect(returnedUser).toEqual(insertedUser);
        });
    });

    describe('refreshExistingUser', () => {
        const originalUser: User = {
            ...mockedUser,
            _id: mockedAPIUser.id,
            metaData: {
                latestIp: 'some old ip',
                lastLoginOrRefresh: new Date(Date.now() - 1_000).toISOString(),
                registered: new Date(Date.now() - 10_000).toISOString(),
            },
            discord: {
                username: 'old username',
                discriminator: 'old discriminator',
                avatar: 'old avatar',
            },
        };

        let returnedUser: User;
        let updatedUser: User | null;

        beforeAll(async () => {
            await testDatabase.userModel.insertOne(originalUser);
            returnedUser = await userService.refreshExistingUser(mockedAPIUser, 'some ip');
            updatedUser = await testDatabase.userModel.findOne({ _id: originalUser._id });
            await testDatabase.userModel.deleteOne({ _id: originalUser._id });
        });

        it('updates the existing user in the database', () => {
            expect(updatedUser).toEqual<User>({
                ...originalUser,
                discord: {
                    username: mockedAPIUser.username,
                    discriminator: mockedAPIUser.discriminator,
                    avatar: mockedAPIUser.avatar,
                },
                metaData: {
                    latestIp: 'some ip',
                    registered: originalUser.metaData.registered,
                    lastLoginOrRefresh: new Date().toISOString(),
                },
            });
        });

        it('returns the updated user', () => {
            expect(returnedUser).toEqual(updatedUser);
        });

        it('throws a NotFoundError if the user cannot be found', async () => {
            try {
                await userService.refreshExistingUser(mockedAPIUser, 'some ip');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundError);
            }
        });
    });

    describe('updateUserPermissions', () => {
        let checkCanEditPermissionsOf: jest.SpyInstance;
        let checkCanChangePermissionsTo: jest.SpyInstance;

        const oldPermissions = UserPermissions.MakeLotsOfApplications;
        const newPermissions = UserPermissions.Feature;

        const conductor: User = {
            ...mockedUser,
            _id: 'conductor',
            permissions: UserPermissions.ManageUsers,
        };

        const targetUser: User = {
            ...mockedUser,
            _id: 'target',
            permissions: oldPermissions,
            permissionsLog: new Array(mockedConfig.maxLogSize).fill(mockedUserChangeRecord),
        };

        let returnedUser: User;
        let updatedUser: User | null;

        beforeAll(async () => {
            checkCanEditPermissionsOf = jest.spyOn(PermissionService, 'checkCanEditPermissionsOf');
            checkCanChangePermissionsTo = jest.spyOn(PermissionService, 'checkCanChangePermissionsTo');

            await testDatabase.userModel.insertOne(targetUser);
            returnedUser = await userService.updateUserPermissions(
                conductor,
                targetUser._id,
                newPermissions,
                'some reason',
            );
            updatedUser = await testDatabase.userModel.findOne({ _id: targetUser._id });
            await testDatabase.userModel.deleteOne({ _id: targetUser._id });
        });

        afterAll(() => {
            checkCanEditPermissionsOf.mockRestore();
            checkCanChangePermissionsTo.mockRestore();
            jest.clearAllMocks();
        });

        it('updates the target user in the database', () => {
            expect(updatedUser).toEqual<User>({
                ...targetUser,
                permissions: newPermissions,
                permissionsLog: [
                    {
                        oldUserPermissions: oldPermissions,
                        by: conductor._id,
                        at: new Date().toISOString(),
                        reason: 'some reason',
                    },
                    ...targetUser.permissionsLog.slice(0, mockedConfig.maxLogSize - 1),
                ],
            });
        });

        it('returns the updated user', () => {
            expect(returnedUser).toEqual(updatedUser);
        });

        it('calls permission checking methods', () => {
            expect(checkCanEditPermissionsOf).toBeCalledTimes(1);
            expect(checkCanChangePermissionsTo).toBeCalledTimes(1);

            expect(checkCanEditPermissionsOf).toBeCalledWith(conductor, targetUser);
            expect(checkCanChangePermissionsTo).toBeCalledWith(conductor, oldPermissions, newPermissions);
        });

        it('throws a NotFoundError if the user cannot be found again after checking their permissions', async () => {
            // since the method fetches the user, checks their permissions, and then updates them, it is possible that
            // the user could be deleted between the initial fetch and before the update

            jest.spyOn(userService, 'getUserById').mockResolvedValueOnce(targetUser);

            try {
                await userService.updateUserPermissions(conductor, targetUser._id, newPermissions, 'some reason');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundError);
            }
        });
    });

    describe('updateUserSubmissionStats', () => {
        const oldStatus = ServerStatus.Pending;
        const newStatus = ServerStatus.Public;

        const targetUser: User = {
            ...mockedUser,
            submissions: {
                ...mockedUser.submissions,
                [oldStatus]: 1,
                [newStatus]: 0,
            },
        };

        describe('when an old status is provided', () => {
            let updatedUser: User | null;

            beforeAll(async () => {
                await testDatabase.userModel.insertOne(targetUser);
                await userService.updateUserSubmissionStats(targetUser._id, newStatus, oldStatus);
                updatedUser = await testDatabase.userModel.findOne({ _id: targetUser._id });
                await testDatabase.userModel.deleteOne({ _id: targetUser._id });
            });

            it('updates the target user in the database', () => {
                expect(updatedUser).toEqual<User>({
                    ...targetUser,
                    submissions: {
                        ...targetUser.submissions,
                        [oldStatus]: targetUser.submissions[oldStatus] - 1,
                        [newStatus]: targetUser.submissions[newStatus] + 1,
                    },
                });
            });
        });

        describe("when an old status isn't provided", () => {
            let updatedUser: User | null;

            beforeAll(async () => {
                await testDatabase.userModel.insertOne(targetUser);
                await userService.updateUserSubmissionStats(targetUser._id, newStatus);
                updatedUser = await testDatabase.userModel.findOne({ _id: targetUser._id });
                await testDatabase.userModel.deleteOne({ _id: targetUser._id });
            });

            it('updates the target user in the database', () => {
                expect(updatedUser).toEqual<User>({
                    ...targetUser,
                    submissions: {
                        ...targetUser.submissions,
                        [newStatus]: targetUser.submissions[newStatus] + 1,
                    },
                });
            });
        });
    });

    describe('updateUserActionStats', () => {
        const action = ServerStatusAction.Withdraw;

        const targetUser: User = {
            ...mockedUser,
            submissions: {
                ...mockedUser.submissions,
                [action]: 1,
            },
        };

        let updatedUser: User | null;

        beforeAll(async () => {
            await testDatabase.userModel.insertOne(targetUser);
            await userService.updateUserActionStats(targetUser._id, action);
            updatedUser = await testDatabase.userModel.findOne({ _id: targetUser._id });
            await testDatabase.userModel.deleteOne({ _id: targetUser._id });
        });

        it('updates the target user in the database', () => {
            expect(updatedUser).toEqual<User>({
                ...targetUser,
                actions: {
                    ...targetUser.actions,
                    [action]: targetUser.actions[action] + 1,
                },
            });
        });
    });

    describe('getNumUsers', () => {
        it('returns the number of users', async () => {
            const users = new Array(10).fill(null).map(
                (_e, i): User => ({
                    ...mockedUser,
                    _id: `mocked user ${i}`,
                }),
            );

            await testDatabase.userModel.insertMany(users);

            const numPublicServers = await userService.getNumUsers();

            expect(numPublicServers).toBe(users.length);

            await testDatabase.userModel.deleteMany({ _id: { $in: users.map((e) => e._id) } });
        });
    });
});
