import { RouteProvider } from '../types/Express/RouteProvider';
import { applyAuthRoutes } from './auth';
import { applyMiscellaneousRoutes } from './miscellaneous';
import { applyRegistryRoutes } from './registry';
import { applyServerManagementRoutes } from './serverManagement';
import { applyUserManagementRoutes } from './userManagement';

export const applyRoutes: RouteProvider = (app, config, services) => {
    applyAuthRoutes(app, config, services);
    applyMiscellaneousRoutes(app, config, services);
    applyRegistryRoutes(app, config, services);
    applyServerManagementRoutes(app, config, services);
    applyUserManagementRoutes(app, config, services);
};
