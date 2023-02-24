import { MongoClient } from 'mongodb';
import { ServerModel } from '../models/ServerModel';
import { UserModel } from '../models/UserModel';
import { Config } from '../types/Config';

export async function loadMongo(config: Config): Promise<[UserModel, ServerModel]> {
    const mongoClient = await new MongoClient(config.mongoURI).connect();

    const db = mongoClient.db(config.mongoDbName);

    // TODO: apply database indexes here

    return [db.collection('users'), db.collection('servers')];
}
