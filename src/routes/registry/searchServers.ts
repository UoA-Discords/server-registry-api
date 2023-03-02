import { PermissionService } from '../../services/PermissionService';
import { GetAllServersParams } from '../../services/ServerService/ServerServiceParams';
import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { WithPagination } from '../../types/Page';
import { Server } from '../../types/Server';
import { UserPermissions } from '../../types/User/UserPermissions';

export const searchServers: EndpointProvider<AuthScopes.OptionalUser, GetAllServersParams, WithPagination<Server>> = {
    auth: AuthScopes.OptionalUser,
    permissionsRequired: null,
    applyToRoute({ auth, user, authService, serverService, userService }) {
        return async (req, res, next) => {
            try {
                const searchParams = req.body;

                // only users with the `Manage Servers` permission can view non-public servers
                if (searchParams.withStatus !== 'visible') {
                    auth ||= authService.validateSiteToken(req.get('Authorization'));
                    user ||= await userService.getUserById(auth.id);
                    PermissionService.checkHasPermissions(user, UserPermissions.ManageServers);
                }

                const servers = await serverService.getAllServers(searchParams);

                res.status(200).json(servers);
            } catch (error) {
                next(error);
            }
        };
    },
};
