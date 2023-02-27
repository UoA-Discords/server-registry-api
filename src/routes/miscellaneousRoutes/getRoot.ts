import { ForbiddenError } from '../../errors/ForbiddenError';
import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';

export const getRoot: EndpointProvider<AuthScopes.None, void, string> = {
    auth: AuthScopes.None,
    permissionsRequired: null,
    applyToRoute() {
        return (_req, res) => {
            throw new ForbiddenError('amongus');
            res.status(200).send(
                'You found the UoA Discords server registry API!<br />Having a look around? Check out the <a href="/api-docs">API documentation</a>!',
            );
        };
    },
};
