import { RouteProvider } from '../types/Express/RouteProvider';
import { applyAuthRoutes } from './auth';
import { applyMiscellaneousRoutes } from './miscellaneousRoutes';

export const applyRoutes: RouteProvider = (app, config, services) => {
    applyAuthRoutes(app, config, services);
    applyMiscellaneousRoutes(app, config, services);
};
