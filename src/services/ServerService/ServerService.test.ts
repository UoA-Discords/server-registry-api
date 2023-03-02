import { NotFoundError } from '../../errors/NotFoundError';
import { createTestDatabase, TestDatabase } from '../../tests/createTestDatabase';
import { mockedConfig } from '../../tests/mockedConfig';
import { mockedInviteData } from '../../tests/mockedInviteData';
import { mockedServer } from '../../tests/mockedServer';
import { mockedServerChangeRecord } from '../../tests/mockedServerChangeRecord';
import { mockedUserService } from '../../tests/mockedServices';
import { WithPagination } from '../../types/Page';
import { Server } from '../../types/Server';
import { ServerTags } from '../../types/Server/ServerTags';
import { ServerSortOptions } from '../../types/Server/ServerSortOptions';
import { ServerStatus } from '../../types/Server/ServerStatus';
import { ServerStatusAction } from '../../types/Server/ServerStatusAction';
import { ServerTagSearchOptions } from '../../types/Server/ServerTagSearchOptions';
import { User } from '../../types/User';
import { UserPermissions } from '../../types/User/UserPermissions';
import { ServerService } from './ServerService';
import { PermissionService } from '../PermissionService';
import { mockedUser } from '../../tests/mockedUser';

describe('ServerService', () => {
    const userService = mockedUserService;

    let testDatabase: TestDatabase;
    let serverService: ServerService;

    beforeAll(async () => {
        testDatabase = await createTestDatabase();
        serverService = new ServerService(testDatabase.serverModel, mockedConfig, userService);
    });

    afterAll(async () => {
        await testDatabase.shutdown();
    });

    describe('getServerById', () => {
        const publicServer1: Server = { ...mockedServer, status: ServerStatus.Public, _id: 'public1' };
        const publicServer2: Server = { ...mockedServer, status: ServerStatus.Featured, _id: 'public2' };
        const privateServer1: Server = { ...mockedServer, status: ServerStatus.Pending, _id: 'private1' };
        const privateServer2: Server = { ...mockedServer, status: ServerStatus.Withdrawn, _id: 'private2' };

        beforeAll(async () => {
            await testDatabase.serverModel.insertMany([publicServer1, publicServer2, privateServer1, privateServer2]);
        });

        afterAll(async () => {
            await testDatabase.serverModel.deleteMany({
                _id: { $in: [publicServer1._id, publicServer2._id, privateServer1._id, privateServer2._id] },
            });
        });

        describe('when onlyPublic = true', () => {
            it('returns the server with the given ID if it is public', async () => {
                const [public1, public2] = await Promise.all([
                    serverService.getServerById(publicServer1._id, true),
                    serverService.getServerById(publicServer2._id, true),
                ]);

                expect(public1).toEqual(publicServer1);
                expect(public2).toEqual(publicServer2);
            });

            it('throw a NotFoundError if the server is private', async () => {
                try {
                    await serverService.getServerById(privateServer1._id, true);
                    fail('should have thrown an error');
                } catch (error) {
                    expect(error).toBeInstanceOf(NotFoundError);
                }

                try {
                    await serverService.getServerById(privateServer2._id, true);
                    fail('should have thrown an error');
                } catch (error) {
                    expect(error).toBeInstanceOf(NotFoundError);
                }
            });
        });

        describe('when onlyPublic = false', () => {
            it('returns the server with the given ID if it is private', async () => {
                const [private1, private2] = await Promise.all([
                    serverService.getServerById(privateServer1._id, false),
                    serverService.getServerById(privateServer2._id, false),
                ]);

                expect(private1).toEqual(privateServer1);
                expect(private2).toEqual(privateServer2);
            });
        });
    });

    describe('getAllServers', () => {
        const allStatuses = [
            ServerStatus.Featured,
            ServerStatus.Pending,
            ServerStatus.Public,
            ServerStatus.Rejected,
            ServerStatus.Withdrawn,
        ];

        const tagCombinations = {
            none: 0,
            partial: ServerTags.Arts | ServerTags.Business,
            full: ServerTags.Arts | ServerTags.Business | ServerTags.ComputerScience,
            unrelated: ServerTags.Club,
        };

        const servers = new Array(30).fill({}).map(
            (_e, i): Server => ({
                ...mockedServer,
                _id: `mocked server ${i}`,
                status: allStatuses[i % allStatuses.length],
                guildData: {
                    ...mockedServer.guildData,
                    // random 10 digit string of uppercase and lowercase letters
                    name: String.fromCharCode(
                        ...new Array(10).fill(0).map(() => {
                            const charId = Math.floor(Math.random() * 52);
                            const charCode = charId < 26 ? charId + 65 : charId + 71;
                            return charCode;
                        }),
                    ),
                },
                created: {
                    ...mockedServer.created,
                    // random time from 0 to 1 minute ago
                    at: new Date(Date.now() - Math.floor(Math.random() * 1_000 * 60)).toISOString(),
                },
                size: {
                    ...mockedServer.size,
                    total: Math.floor(Math.random() * 1_000),
                },
                serverTags: [
                    tagCombinations.none,
                    tagCombinations.partial,
                    tagCombinations.full,
                    tagCombinations.unrelated,
                ][i % 4],
            }),
        );

        const byId = (a: Server, b: Server) => a._id.localeCompare(b._id);

        const withIdAsFallback = (compareFn: (a: Server, b: Server) => number) => {
            return (a: Server, b: Server) => {
                return compareFn(a, b) || byId(a, b);
            };
        };

        beforeAll(async () => {
            await testDatabase.serverModel.insertMany(servers);
        });

        afterAll(async () => {
            await testDatabase.serverModel.deleteMany({
                _id: { $in: servers.map((e) => e._id) },
            });
        });

        describe('page and PerPage', () => {
            it('returns the correct subset of servers', async () => {
                const page = 2;
                const perPage = 10;

                const result = await serverService.getAllServers({ page, perPage });

                expect(result).toEqual<WithPagination<Server>>({
                    totalItemCount: servers.length,
                    items: servers.sort(byId).slice(page * perPage, (page + 1) * perPage),
                });
            });
        });

        describe('sortBy', () => {
            it('sorts by Discord ID', async () => {
                const { items } = await serverService.getAllServers({
                    page: 0,
                    perPage: 10,
                    sortBy: ServerSortOptions.Id,
                });

                expect(items).toEqual(servers.sort(byId).slice(0, 10));
            });

            it('sorts by status', async () => {
                const { items } = await serverService.getAllServers({
                    page: 0,
                    perPage: 10,
                    sortBy: ServerSortOptions.Status,
                });

                expect(items).toEqual(servers.sort(withIdAsFallback((a, b) => a.status - b.status)).slice(0, 10));
            });

            it('sorts by creation timestamp', async () => {
                const { items } = await serverService.getAllServers({
                    page: 0,
                    perPage: 10,
                    sortBy: ServerSortOptions.CreatedAt,
                });

                expect(items).toEqual(
                    servers.sort(withIdAsFallback((a, b) => a.created.at.localeCompare(b.created.at))).slice(0, 10),
                );
            });

            it('sorts by member count', async () => {
                const { items } = await serverService.getAllServers({
                    page: 0,
                    perPage: 10,
                    sortBy: ServerSortOptions.MemberCount,
                });

                expect(items).toEqual(
                    servers.sort(withIdAsFallback((a, b) => a.size.total - b.size.total)).slice(0, 10),
                );
            });
        });

        describe('sortDirection', () => {
            it('sorts in descending order', async () => {
                const { items } = await serverService.getAllServers({
                    page: 0,
                    perPage: 10,
                    sortDirection: 'desc',
                });

                expect(items).toEqual(servers.sort(byId).reverse().slice(0, 10));
            });
        });

        describe('withStatus', () => {
            it('returns only servers with the given status', async () => {
                const status = ServerStatus.Public;

                const { items } = await serverService.getAllServers({
                    page: 0,
                    perPage: 10,
                    withStatus: status,
                });

                expect(items).toEqual(
                    servers
                        .filter((e) => e.status === status)
                        .sort(byId)
                        .slice(0, 10),
                );
            });

            it("returns only public and featured servers if the status is 'visible'", async () => {
                const { items } = await serverService.getAllServers({
                    page: 0,
                    perPage: 10,
                    withStatus: 'visible',
                });

                expect(items).toEqual(
                    servers
                        .filter((e) => e.status === ServerStatus.Public || e.status === ServerStatus.Featured)
                        .sort(byId)
                        .slice(0, 10),
                );
            });
        });

        describe('withTags', () => {
            it("returns only servers with all of the given tags if type = 'and'", async () => {
                const tags: ServerTagSearchOptions = {
                    tags: tagCombinations.full,
                    type: 'and',
                };

                const { items } = await serverService.getAllServers({
                    page: 0,
                    perPage: 10,
                    withTags: tags,
                });

                expect(items).toEqual(
                    servers
                        .filter((e) => (e.serverTags & tagCombinations.full) === tagCombinations.full)
                        .sort(byId)
                        .slice(0, 10),
                );
            });

            it("returns only servers with any of the given tags if type = 'or'", async () => {
                const tags: ServerTagSearchOptions = {
                    tags: tagCombinations.full,
                    type: 'or',
                };

                const { items } = await serverService.getAllServers({
                    page: 0,
                    perPage: 10,
                    withTags: tags,
                });

                expect(items).toEqual(
                    servers
                        .filter((e) => (e.serverTags & tagCombinations.full) > 0)
                        .sort(byId)
                        .slice(0, 10),
                );
            });
        });

        describe('searchTerm', () => {
            it('returns only users with matching Discord usernames', async () => {
                const searchTerm = servers[0].guildData.name;

                const { items } = await serverService.getAllServers({ page: 0, perPage: 10, searchTerm });

                expect(items).toEqual(
                    servers
                        .filter((e) => e.guildData.name === searchTerm)
                        .sort(byId)
                        .slice(0, 10),
                );
            });
        });
    });

    describe('createNewServer', () => {
        let returnedServer: Server;
        let insertedServer: Server | null;

        beforeAll(async () => {
            returnedServer = await serverService.createNewServer(mockedUser, mockedInviteData, ServerTags.Arts);
            insertedServer = await testDatabase.serverModel.findOne({ _id: mockedInviteData.guild.id });
            await testDatabase.serverModel.deleteOne({ _id: mockedInviteData.guild.id });
        });

        afterAll(() => {
            jest.clearAllMocks();
        });

        it('inserts a new server into the database', () => {
            expect(insertedServer).toEqual<Server>({
                _id: mockedInviteData.guild.id,
                status: ServerStatus.Pending,
                inviteCode: mockedInviteData.code,
                inviteCreatedBy: {
                    id: mockedInviteData.inviter.id,
                    username: mockedInviteData.inviter.username,
                    discriminator: mockedInviteData.inviter.discriminator,
                    avatar: mockedInviteData.inviter.avatar,
                },
                guildData: {
                    name: mockedInviteData.guild.name,
                    icon: mockedInviteData.guild.icon,
                    splash: mockedInviteData.guild.splash,
                    banner: mockedInviteData.guild.banner,
                    description: mockedInviteData.guild.description,
                    verificationLevel: mockedInviteData.guild.verification_level,
                },
                created: {
                    by: mockedUser._id,
                    at: new Date().toISOString(),
                },
                serverTags: ServerTags.Arts,
                statusLog: [],
                size: {
                    online: mockedInviteData.approximate_presence_count ?? -1,
                    total: mockedInviteData.approximate_member_count ?? -1,
                    lastUpdated: new Date().toISOString(),
                },
                numFavourited: 0,
            });
        });

        it('returns the newly created server', () => {
            expect(returnedServer).toEqual(insertedServer);
        });

        it('calls submission stat updating methods', () => {
            expect(userService.updateUserSubmissionStats).toBeCalledTimes(1);
            expect(userService.updateUserSubmissionStats).toBeCalledWith(mockedUser._id, ServerStatus.Pending);
        });
    });

    describe('refreshExistingServer', () => {
        const originalServer: Server = {
            ...mockedServer,
            _id: mockedInviteData.guild.id,
            inviteCode: 'old invite code',
            inviteCreatedBy: {
                id: 'old inviter id',
                username: 'old inviter username',
                discriminator: 'old inviter discriminator',
                avatar: 'old inviter avatar',
            },
            guildData: {
                banner: 'old banner',
                description: 'old description',
                icon: 'old icon',
                name: 'old name',
                splash: 'old splash',
                verificationLevel: 0,
            },
            size: {
                online: -456,
                total: -123,
                lastUpdated: new Date(Date.now() - 1_000).toISOString(),
            },
        };

        let returnedServer: Server;
        let updatedServer: Server | null;

        beforeAll(async () => {
            await testDatabase.serverModel.insertOne(originalServer);
            returnedServer = await serverService.refreshExistingServer(originalServer._id, mockedInviteData);
            updatedServer = await testDatabase.serverModel.findOne({ _id: originalServer._id });
            await testDatabase.serverModel.deleteOne({ _id: originalServer._id });
        });

        it('updates the existing server in the database', () => {
            expect(updatedServer).toEqual<Server>({
                ...originalServer,
                inviteCode: mockedInviteData.code,
                inviteCreatedBy: {
                    id: mockedInviteData.inviter.id,
                    username: mockedInviteData.inviter.username,
                    discriminator: mockedInviteData.inviter.discriminator,
                    avatar: mockedInviteData.inviter.avatar,
                },
                guildData: {
                    name: mockedInviteData.guild.name,
                    icon: mockedInviteData.guild.icon,
                    splash: mockedInviteData.guild.splash,
                    banner: mockedInviteData.guild.banner,
                    description: mockedInviteData.guild.description,
                    verificationLevel: mockedInviteData.guild.verification_level,
                },
                size: {
                    online: mockedInviteData.approximate_presence_count ?? -1,
                    total: mockedInviteData.approximate_member_count ?? -1,
                    lastUpdated: new Date().toISOString(),
                },
            });
        });

        it('returns the updated server', () => {
            expect(returnedServer).toEqual(updatedServer);
        });

        it('throws a NotFoundError if the server cannot be found', async () => {
            try {
                await serverService.refreshExistingServer(mockedInviteData.guild.id, mockedInviteData);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundError);
            }
        });
    });

    describe('changeServerStatus', () => {
        let validateServerStatusChange: jest.SpyInstance;

        const oldStatus = ServerStatus.Pending;
        const newStatus = ServerStatus.Public;

        const conductor: User = {
            ...mockedUser,
            _id: 'conductor',
            permissions: UserPermissions.ManageServers,
        };

        const targetServer: Server = {
            ...mockedServer,
            _id: 'target',
            status: oldStatus,
            statusLog: new Array(mockedConfig.maxLogSize).fill(mockedServerChangeRecord),
        };

        let returnedServer: Server;
        let updatedServer: Server | null;

        beforeAll(async () => {
            validateServerStatusChange = jest.spyOn(PermissionService, 'validateServerStatusChange');

            await testDatabase.serverModel.insertOne(targetServer);
            returnedServer = await serverService.changeServerStatus(
                conductor,
                targetServer._id,
                newStatus,
                'some reason',
            );
            updatedServer = await testDatabase.serverModel.findOne({ _id: targetServer._id });
            await testDatabase.serverModel.deleteOne({ _id: targetServer._id });
        });

        afterAll(() => {
            validateServerStatusChange.mockRestore();
            jest.clearAllMocks();
        });

        it('updates the target server in the database', () => {
            expect(updatedServer).toEqual<Server>({
                ...targetServer,
                status: newStatus,
                statusLog: [
                    {
                        verb: ServerStatusAction.Accept,
                        by: conductor._id,
                        at: new Date().toISOString(),
                        reason: 'some reason',
                    },
                    ...targetServer.statusLog.slice(0, mockedConfig.maxLogSize - 1),
                ],
            });
        });

        it('returns the updated server', () => {
            expect(returnedServer).toEqual(updatedServer);
        });

        it('calls permission checking methods', () => {
            expect(validateServerStatusChange).toBeCalledTimes(1);
            expect(validateServerStatusChange).toBeCalledWith(conductor, oldStatus, newStatus);
        });

        it('calls submission stat updating methods', () => {
            expect(userService.updateUserSubmissionStats).toBeCalledTimes(1);
            expect(userService.updateUserSubmissionStats).toBeCalledWith(targetServer.created.by, newStatus, oldStatus);
        });

        it('calls action stat updating methods', () => {
            expect(userService.updateUserActionStats).toBeCalledTimes(1);
            expect(userService.updateUserActionStats).toBeCalledWith(conductor._id, ServerStatusAction.Accept);
        });

        it('throws a NotFoundError if the server cannot be found again after checking its status', async () => {
            // since the method fetches the server, determines the status action, checks it the permissions of the
            // conductor, and then updates the server, it is possible that the server could be deleted between the
            // initial fetch and before the update

            jest.spyOn(serverService, 'getServerById').mockResolvedValueOnce(targetServer);

            try {
                await serverService.changeServerStatus(conductor, targetServer._id, newStatus, 'some reason');
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundError);
            }
        });
    });

    describe('changeServerTags', () => {
        const oldServerTags = ServerTags.Arts;
        const newServerTags = ServerTags.Business; // what a downgrade

        const targetServer: Server = {
            ...mockedServer,
            serverTags: oldServerTags,
        };

        let returnedServer: Server;
        let updatedServer: Server | null;

        beforeAll(async () => {
            await testDatabase.serverModel.insertOne(targetServer);
            returnedServer = await serverService.changeServerTags(targetServer._id, newServerTags);
            updatedServer = await testDatabase.serverModel.findOne({ _id: targetServer._id });
            await testDatabase.serverModel.deleteOne({ _id: targetServer._id });
        });

        it('updates the target server in the database', () => {
            expect(updatedServer).toEqual<Server>({
                ...targetServer,
                serverTags: newServerTags,
            });
        });

        it('returns the updated server', () => {
            expect(returnedServer).toEqual(updatedServer);
        });

        it('throws a NotFoundError if the server cannot be found', async () => {
            try {
                await serverService.changeServerTags(targetServer._id, newServerTags);
                fail('should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(NotFoundError);
            }
        });
    });
});
