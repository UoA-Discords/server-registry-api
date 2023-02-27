import { RouteProvider } from '../../types/Express/RouteProvider';
import { withScopes } from '../withScopes';
import { getLogout } from './getLogout';
import { getRefresh } from './getRefresh';
import { postLogin } from './postLogin';

export const applyAuthRoutes: RouteProvider = (app, config, models) => {
    app.post('/login', withScopes(postLogin, config, models));

    app.get('/refresh', withScopes(getRefresh, config, models));

    app.get('/logout', withScopes(getLogout, config, models));
};
