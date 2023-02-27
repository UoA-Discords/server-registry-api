import { MongoClient } from 'mongodb';
import { ServerModel } from '../models/ServerModel';
import { UserModel } from '../models/UserModel';
import { Config } from '../types/Config';

export async function loadMongo(config: Config): Promise<[UserModel, ServerModel, MongoClient]> {
    if (config.mongoDbName.length > 38) {
        throw new Error(`Mongo DB name cannot be more than 38 bytes (configured is ${config.mongoDbName.length})`);
    }

    const mongoClient = await new MongoClient(config.mongoURI).connect();

    const db = mongoClient.db(config.mongoDbName);

    const userModel: UserModel = db.collection('users');
    const serverModel: ServerModel = db.collection('servers');

    await Promise.all([
        userModel.createIndex({ 'discord.username': 'text' }),
        serverModel.createIndex({ 'guildData.name': 'text' }),
    ]);

    return [userModel, serverModel, mongoClient];
}
