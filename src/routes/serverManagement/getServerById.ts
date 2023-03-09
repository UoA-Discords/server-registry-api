import { NotFoundError } from '../../errors/NotFoundError';
import { PermissionService } from '../../services/PermissionService';
import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { Server } from '../../types/Server';
import { ServerStatus } from '../../types/Server/ServerStatus';
import { UserPermissions } from '../../types/User/UserPermissions';
import { DiscordIdString } from '../../types/Utility';

export const getServerById: EndpointProvider<AuthScopes.OptionalUser, void, Server, { id: DiscordIdString }> = {
    auth: AuthScopes.OptionalUser,
    permissionsRequired: null,
    applyToRoute({ user, serverService }) {
        return async (req, res, next) => {
            try {
                const { id } = req.params;

                const server = await serverService.getServerById(id, false);

                const canViewPrivate =
                    user !== null && PermissionService.hasPermissions(user.permissions, UserPermissions.ManageServers);

                const serverIsPrivate =
                    server.status !== ServerStatus.Featured && server.status !== ServerStatus.Public;

                if (serverIsPrivate && !canViewPrivate) {
                    throw new NotFoundError('server');
                }

                res.status(200).json(server);
            } catch (error) {
                next(error);
            }
        };
    },
};
