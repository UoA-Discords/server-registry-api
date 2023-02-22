import { AuthScopes, DatabaseScopes, EndpointProvider } from '../../types/Express/EndpointProvider';

export const getRoot: EndpointProvider<AuthScopes.None, DatabaseScopes.None, void, string> = {
    auth: AuthScopes.None,
    database: DatabaseScopes.None,
    permissionsRequired: null,
    applyToRoute() {
        return (_req, res) => {
            res.status(200).send(
                'You found the UoA Discords server registry API!<br />Having a look around? Check out the <a href="/api-docs">API documentation</a>!',
            );
        };
    },
};
