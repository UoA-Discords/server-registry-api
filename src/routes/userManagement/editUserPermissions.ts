import { PermissionService } from '../../services/PermissionService';
import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { User } from '../../types/User';
import { UserPermissions } from '../../types/User/UserPermissions';
import { DiscordIdString } from '../../types/Utility';

interface EditUserPermissionsRequest {
    newPermissions: UserPermissions;
    reason: string | null;
}

export const editUserPermissions: EndpointProvider<
    AuthScopes.User,
    EditUserPermissionsRequest,
    User<'HideIP' | 'ShowIP'>,
    { id: DiscordIdString }
> = {
    auth: AuthScopes.User,
    permissionsRequired: UserPermissions.ManageUsers,
    applyToRoute({ user, userService }) {
        return async (req, res, next) => {
            try {
                const { id } = req.params;
                const { newPermissions, reason } = req.body;

                const updatedUser = await userService.updateUserPermissions(user, id, newPermissions, reason);

                res.status(200).json(
                    PermissionService.hasPermissions(user.permissions, UserPermissions.Owner)
                        ? updatedUser
                        : { ...updatedUser, metaData: { ...updatedUser.metaData, latestIp: null } },
                );
            } catch (error) {
                next(error);
            }
        };
    },
};
