import { RouteProvider } from '../../types/Express/RouteProvider';
import { withScopes } from '../withScopes';
import { getSpecificUsers } from './getSpecificUsers';

export const applyPublicUserRoutes: RouteProvider = (app, config, models) => {
    app.post('/users', withScopes(getSpecificUsers, config, models));
};
