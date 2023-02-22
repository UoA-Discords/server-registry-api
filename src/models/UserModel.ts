import { Collection } from 'mongodb';
import { User } from '../types/User';

export type UserModel = Collection<User<true>>;
