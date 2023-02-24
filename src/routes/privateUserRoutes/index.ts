import { RouteProvider } from '../../types/Express/RouteProvider';
import { withScopes } from '../withScopes';
import { getAllUsers } from './getAllUsers';

export const applyPrivateUserRoutes: RouteProvider = (app, config, models) => {
    app.get('/users', withScopes(getAllUsers, config, models));
};
