import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';

export const getIp: EndpointProvider<AuthScopes.None, void, string> = {
    auth: AuthScopes.None,
    permissionsRequired: null,
    applyToRoute() {
        return (req, res) => {
            res.status(200).send(req.ip);
        };
    },
};
