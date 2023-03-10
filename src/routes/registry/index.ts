import { RouteProvider } from '../../types/Express/RouteProvider';
import { withScopes } from '../withScopes';
import { makeSubmission } from './makeSubmission';
import { searchServers } from './searchServers';
import { searchUsers } from './searchUsers';

export const applyRegistryRoutes: RouteProvider = (app, config, services) => {
    app.post('/search/servers', withScopes(searchServers, config, services));

    app.post('/search/users', withScopes(searchUsers, config, services));

    app.put('/servers', withScopes(makeSubmission, config, services));
};
