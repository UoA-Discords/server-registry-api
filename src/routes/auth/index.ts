import { RouteProvider } from '../../types/Express/RouteProvider';
import { withScopes } from '../withScopes';
import { logout } from './logout';
import { refresh } from './refresh';
import { login } from './login';
import { getSelf } from './getSelf';

export const applyAuthRoutes: RouteProvider = (app, config, models) => {
    app.post('/login', withScopes(login, config, models));

    app.get('/refresh', withScopes(refresh, config, models));

    app.get('/logout', withScopes(logout, config, models));

    app.get('/@me', withScopes(getSelf, config, models));
};
