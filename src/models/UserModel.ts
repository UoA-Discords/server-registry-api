import { Collection } from 'mongodb';
import { User } from '../interfaces/User';

export type UserModel = Collection<User>;
