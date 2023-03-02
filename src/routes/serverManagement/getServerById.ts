import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { Server } from '../../types/Server';
import { UserPermissions } from '../../types/User/UserPermissions';
import { DiscordIdString } from '../../types/Utility';

export const getServerById: EndpointProvider<AuthScopes.User, void, Server, { id: DiscordIdString }> = {
    auth: AuthScopes.User,
    permissionsRequired: UserPermissions.ManageServers,
    applyToRoute({ serverService }) {
        return async (req, res, next) => {
            try {
                const { id } = req.params;

                const server = await serverService.getServerById(id, false);

                res.status(200).json(server);
            } catch (error) {
                next(error);
            }
        };
    },
};
