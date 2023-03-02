import { RouteProvider } from '../../types/Express/RouteProvider';
import { withScopes } from '../withScopes';
import { changeServerStatus } from './changeServerStatus';
import { getServerById } from './getServerById';

export const applyServerManagementRoutes: RouteProvider = (app, config, services) => {
    app.get('/servers/:id', withScopes(getServerById, config, services));
    app.patch('/servers/:id', withScopes(changeServerStatus, config, services));
};