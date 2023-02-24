import { UserService } from '../../services/UserService';
import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { PaginationQueryParameters, WithPagination } from '../../types/Page';
import { User } from '../../types/User';
import { UserPermissions } from '../../types/User/UserPermissions';

interface GetAllUsersQueryParameters extends PaginationQueryParameters {
    username?: string;
}

export const getAllUsers: EndpointProvider<
    AuthScopes.User,
    void,
    WithPagination<User<boolean>>,
    void,
    GetAllUsersQueryParameters
> = {
    auth: AuthScopes.User,
    permissionsRequired: UserPermissions.ManageUsers,
    applyToRoute({ user, userService }) {
        return async (req, res, next) => {
            try {
                const { page, perPage, username } = req.query;

                const { totalItemCount, items } = await userService.getAllUsers(page, perPage, username);

                if (UserService.hasPermission(user, UserPermissions.Owner)) {
                    res.status(200).json({ totalItemCount, items });
                } else {
                    res.status(200).json({
                        totalItemCount,
                        items: items.map((e) => ({ ...e, metaData: { ...e.metaData, latestIp: null } })),
                    });
                }
            } catch (error) {
                next(error);
            }
        };
    },
};
