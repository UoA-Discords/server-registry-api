import { Collection } from 'mongodb';
import { Server } from '../Server';
import { User } from '../User';

export interface AppModels {
    users: Collection<User<true>>;
    servers: Collection<Server>;
}
