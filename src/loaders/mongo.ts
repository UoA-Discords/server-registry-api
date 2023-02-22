import { MongoClient } from 'mongodb';
import { Config } from '../types/Config';
import { AppModels } from '../types/Database/AppModels';

export async function loadMongo(config: Config): Promise<AppModels> {
    const mongoClient = await new MongoClient(config.mongoURI).connect();

    const db = mongoClient.db(config.mongoDbName);

    // TODO: apply database indexes here

    return {
        servers: db.collection('servers'),
        users: db.collection('users'),
    };
}
