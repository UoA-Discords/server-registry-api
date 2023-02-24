import { RouteProvider } from '../../types/Express/RouteProvider';
import { withScopes } from '../withScopes';
import { getAllUsers } from './getAllUsers';
import { patchUserPermissions } from './patchUserPermissions';

export const applyPrivateUserRoutes: RouteProvider = (app, config, models) => {
    app.get('/users', withScopes(getAllUsers, config, models));

    app.patch('/users/:id', withScopes(patchUserPermissions, config, models));
};
