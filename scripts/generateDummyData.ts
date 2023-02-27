// generates and inserts fake Discord users and servers into the database
// will not work if the database is not empty

import { loadConfig } from '../src/loaders/config';
import { loadMongo } from '../src/loaders/mongo';
import { loadServices } from '../src/loaders/services';
import { ServerService } from '../src/services/ServerService';
import { UserService } from '../src/services/UserService';
import { InviteData } from '../src/types/Invite';
import { Server } from '../src/types/Server';
import { ServerTags } from '../src/types/Server/ServerTags';
import { ServerStatus } from '../src/types/Server/ServerStatus';
import { User } from '../src/types/User';
import { DiscordIdString } from '../src/types/Utility';

function awaitResponse<T extends string | number>(
    prompt: string,
    expectedType: T extends string ? 'string' : 'number',
): Promise<T> {
    console.log(prompt);
    return new Promise((resolve) => {
        process.stdin.once('data', (d) => {
            const data = d.toString().replaceAll('\n', '');
            if (expectedType === 'string') return resolve(data as T);
            try {
                resolve(parseInt(data) as T);
            } catch (error) {
                console.log(`Invalid input (expected ${expectedType}), terminating.`);
                process.exit(0);
            }
        });
    });
}

function makeRandomId(i: string | number): DiscordIdString {
    return (
        Math.floor(Math.random() * 1_000_000)
            .toString()
            .padStart(6, '0') + `-${i}`
    );
}

function makeRandomDiscriminator(): string {
    return Math.floor(Math.random() * 10_000)
        .toString()
        .padStart(4, '0');
}

function randomServerTags(): ServerTags {
    return Math.floor(Math.random() * ((1 << 13) - 1));
}

function randomCode() {
    return String.fromCharCode(
        ...new Array(10).fill(0).map(() => {
            const charId = Math.floor(Math.random() * 52);
            const charCode = charId < 26 ? charId + 65 : charId + 71;
            return charCode;
        }),
    );
}

function randomChance(p: number) {
    return Math.random() < p;
}

async function makeDummyServer(serverService: ServerService, creator: User, i: number): Promise<Server> {
    const serverInfo: Partial<Pick<InviteData, 'inviter' | 'approximate_member_count' | 'approximate_presence_count'>> =
        {};

    if (randomChance(0.9)) {
        serverInfo.inviter = randomChance(0.5)
            ? {
                  id: makeRandomId(`inv-${i}`),
                  username: `Unregistered inviter ${i}`,
                  discriminator: makeRandomDiscriminator(),
                  avatar: null,
              }
            : {
                  id: creator._id,
                  username: creator.discord.username,
                  discriminator: creator.discord.discriminator,
                  avatar: creator.discord.avatar,
              };
    }

    if (randomChance(0.8)) {
        serverInfo.approximate_member_count = Math.floor(Math.random() * 1_000);
        serverInfo.approximate_presence_count = Math.floor(Math.random() * serverInfo.approximate_member_count);
    }

    return await serverService.createNewServer(
        creator,
        {
            ...serverInfo,
            code: randomCode(),
            guild: {
                id: makeRandomId(i),
                name: `Guild ${i}`,
                splash: null,
                banner: null,
                icon: null,
                vanity_url_code: null,
                description: null,
                features: [],
                verification_level: 0,
                nsfw_level: 0,
            },
            channel: null,
            inviter: {
                id: makeRandomId(`inv-${i}`),
                username: `inviter ${i}`,
                discriminator: makeRandomDiscriminator(),
                avatar: null,
            },
        },
        randomServerTags(),
    );
}

async function approveServer(serverService: ServerService, server: Server, approver: User): Promise<void> {
    await serverService.changeServerStatus(approver, server._id, ServerStatus.Public, 'Approved by script');
}

async function rejectServer(serverService: ServerService, server: Server, rejecter: User): Promise<void> {
    await serverService.changeServerStatus(rejecter, server._id, ServerStatus.Rejected, 'Rejected by script');
}

async function featureServer(serverService: ServerService, server: Server, featurer: User): Promise<void> {
    await serverService.changeServerStatus(featurer, server._id, ServerStatus.Featured, 'Featured by script');
}

async function withdrawServer(serverService: ServerService, server: Server, withdrawer: User): Promise<void> {
    await serverService.changeServerStatus(withdrawer, server._id, ServerStatus.Withdrawn, 'Withdrawn by script');
}

async function makeDummyUser(userService: UserService, i: number): Promise<User> {
    const ip = new Array(4)
        .fill(0)
        .map(() => Math.floor(Math.random() * 255))
        .join('.');

    return await userService.createNewUser(
        {
            id: makeRandomId(i),
            username: `User ${i}`,
            discriminator: makeRandomDiscriminator(),
            avatar: null,
        },
        ip,
    );
}

async function main() {
    const config = loadConfig();

    const [userModel, serverModel] = await loadMongo(config);

    const [existingUsers, existingServers] = await Promise.all([
        userModel.countDocuments(),
        serverModel.countDocuments(),
    ]);

    if (existingUsers > 0) {
        console.log('Existing users found, terminating.');
        return;
    }

    if (existingServers > 0) {
        console.log('Existing servers found, terminating.');
        return;
    }

    const services = loadServices(config, userModel, serverModel);

    const numUsers = await awaitResponse<number>('Input number of users to generate:', 'number');
    const numServers = await awaitResponse<number>('Input number of servers to generate:', 'number');

    console.log(`Generating ${numUsers} users...`);

    const users = await Promise.all(new Array(numUsers).fill(0).map((_e, i) => makeDummyUser(services.userService, i)));

    console.log(`Generating ${numServers} servers...`);

    const randomUser = () => users[Math.floor(Math.random() * users.length)];

    const servers = await Promise.all(
        new Array(numServers).fill(0).map((_e, i) => makeDummyServer(services.serverService, randomUser(), i)),
    );

    const weights: Record<ServerStatus, number> = {
        [ServerStatus.Pending]: 0.1,
        [ServerStatus.Public]: 0.5,
        [ServerStatus.Featured]: 0.1,
        [ServerStatus.Rejected]: 0.2,
        [ServerStatus.Withdrawn]: 0.1,
    };

    const rejectedServers = servers.splice(0, Math.floor(weights[ServerStatus.Rejected] * numServers));

    // these servers will stay pending, so we will remove them from the servers array
    const pendingServers = servers.splice(
        rejectedServers.length,
        Math.floor(weights[ServerStatus.Pending] * numServers),
    );

    console.log(
        `Accepting / rejecting servers... (${rejectedServers.length} rejected, ${pendingServers.length} stay pending)`,
    );

    await Promise.all([
        ...rejectedServers.map((e) => rejectServer(services.serverService, e, randomUser())),
        ...servers.map((e) => approveServer(services.serverService, e, randomUser())),
    ]);

    const featuredServers = servers.splice(0, Math.floor(weights[ServerStatus.Featured] * numServers));
    const withdrawnServers = servers.splice(0, Math.floor(weights[ServerStatus.Withdrawn] * numServers));

    console.log(
        `Featuring / withdrawing servers... (${featuredServers.length} featured, ${withdrawnServers.length} withdrawn)`,
    );

    await Promise.all([
        ...featuredServers.map((e) => featureServer(services.serverService, e, randomUser())),
        ...withdrawnServers.map((e) => withdrawServer(services.serverService, e, randomUser())),
    ]);

    console.log('Done!');
    process.exit(0);
}

main();
