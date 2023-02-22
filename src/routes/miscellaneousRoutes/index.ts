import { RouteProvider } from '../../types/Express/RouteProvider';
import { withScopes } from '../withScopes';
import { getIp } from './getIp';
import { getRoot } from './getRoot';
import { postRoot } from './postRoot';

export const applyMiscellaneousRoutes: RouteProvider = (app, config, models) => {
    app.get('/', withScopes(getRoot, config, models));
    app.post('/', withScopes(postRoot, config, models));

    app.get('/ip', withScopes(getIp, config, models));
};
