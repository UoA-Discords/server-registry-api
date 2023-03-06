import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { User } from '../../types/User';

export const getSelf: EndpointProvider<AuthScopes.User, void, User> = {
    auth: AuthScopes.User,
    permissionsRequired: null,
    applyToRoute({ user }) {
        return (_req, res) => {
            res.status(200).json(user);
        };
    },
};
