import { Express } from 'express';
import { Config } from '../Config';
import { AppServices } from '../Services';

export type RouteProvider = (app: Express, config: Config, services: AppServices) => void;
