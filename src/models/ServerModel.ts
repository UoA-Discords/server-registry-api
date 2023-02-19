import { Collection } from 'mongodb';
import { ServerStatus } from '../enums/ServerStatus';
import { Server } from '../interfaces/Server';

export type ServerModel = Collection<Server<ServerStatus>>;
