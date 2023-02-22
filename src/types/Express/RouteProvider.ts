import { Express } from 'express';
import { Config } from '../Config';
import { AppModels } from '../Database/AppModels';

export type RouteProvider = (app: Express, config: Config, models: AppModels) => void;
