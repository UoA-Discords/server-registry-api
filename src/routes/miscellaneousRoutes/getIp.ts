import { AuthScopes, DatabaseScopes, EndpointProvider } from '../../types/Express/EndpointProvider';

export const getIp: EndpointProvider<AuthScopes.None, DatabaseScopes.None, void, string> = {
    auth: AuthScopes.None,
    database: DatabaseScopes.None,
    permissionsRequired: null,
    applyToRoute() {
        return (req, res) => {
            res.status(200).send(req.ip);
        };
    },
};
