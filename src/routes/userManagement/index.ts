import { RouteProvider } from '../../types/Express/RouteProvider';
import { withScopes } from '../withScopes';
import { editUserPermissions } from './editUserPermissions';
import { getUserById } from './getUserById';

export const applyUserManagementRoutes: RouteProvider = (app, config, services) => {
    app.get('/users/:id', withScopes(getUserById, config, services));
    app.patch('/users/:id', withScopes(editUserPermissions, config, services));
};
