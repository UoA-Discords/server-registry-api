import { MongoMemoryServer } from 'mongodb-memory-server';
import { loadMongo } from '../loaders/mongo';
import { ServerModel } from '../models/ServerModel';
import { UserModel } from '../models/UserModel';
import { mockedConfig } from './mockedConfig';

export interface TestDatabase {
    userModel: UserModel;
    serverModel: ServerModel;
    shutdown: () => Promise<void>;
}

export async function createTestDatabase(): Promise<TestDatabase> {
    const provider = await MongoMemoryServer.create();

    const mongoURI = provider.getUri();

    const [userModel, serverModel, mongoClient] = await loadMongo({ ...mockedConfig, mongoURI });

    const shutdown = async () => {
        await mongoClient.close();
        await provider.stop();
    };

    return { userModel, serverModel, shutdown };
}
