import { PermissionService } from '../../services/PermissionService';
import { GetAllUsersParams } from '../../services/UserService/UserServiceParams';
import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { WithPagination } from '../../types/Page';
import { User } from '../../types/User';
import { UserPermissions } from '../../types/User/UserPermissions';

export const searchUsers: EndpointProvider<
    AuthScopes.OptionalUser,
    GetAllUsersParams,
    WithPagination<User<'HideIP' | 'ShowIP'>>
> = {
    auth: AuthScopes.OptionalUser,
    permissionsRequired: null,
    applyToRoute({ auth, user, authService, userService }) {
        return async (req, res, next) => {
            try {
                const searchParams = req.body;

                let showIps = false;

                // only users with the `Manage Users` permission can get all users
                if (searchParams.withIds === undefined) {
                    auth ??= authService.validateSiteToken(req.get('Authorization'));
                    user ??= await userService.getUserById(auth.id);
                    PermissionService.checkHasPermissions(user, UserPermissions.ManageUsers);

                    // owners can see IPs
                    if (PermissionService.hasPermissions(user.permissions, UserPermissions.Owner)) {
                        showIps = true;
                    }
                }

                const { totalItemCount, items } = await userService.getAllUsers(searchParams);

                res.status(200).json({
                    totalItemCount,
                    items: showIps
                        ? items
                        : items.map((user) => ({ ...user, metaData: { ...user.metaData, latestIp: null } })),
                });
            } catch (error) {
                next(error);
            }
        };
    },
};
