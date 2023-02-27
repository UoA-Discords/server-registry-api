import { ForbiddenError } from '../../errors/ForbiddenError';
import { ServerStatus } from '../../types/Server/ServerStatus';
import { ServerStatusAction } from '../../types/Server/ServerStatusAction';
import { User } from '../../types/User';
import { UserPermissions } from '../../types/User/UserPermissions';

/**
 * The permission service provides intermediary validation for all interactions requiring
 * {@link UserPermissions permissions}.
 *
 * - Checking a user has a set of permissions ({@link checkHasPermissions}).
 * - Splitting a permissions bitfield ({@link splitPermissions}).
 * - Validating the permissions of a permissions change ({@link checkCanChangePermissionsTo}).
 * - Validating a server status change ({@link validateServerStatusChange}).
 *
 * Note that these methods do not check the base permissions of a conductor, as that should be done through the
 * `requiredPermissions` property of the endpoint provider.
 *
 * Interactions with this service may throw any of the following errors:
 * - {@link ForbiddenError}
 */
export abstract class PermissionService {
    /** Checks if the set of target permissions contains every one of the required permissions. */
    private static hasPermissions(targetPermissions: UserPermissions, requiredPermissions: UserPermissions): boolean {
        return (targetPermissions & requiredPermissions) === requiredPermissions;
    }

    /** Checks if the user has all of the required permissions, and throws a {@link ForbiddenError} if they don't. */
    public static checkHasPermissions(user: User, requiredPermissions: UserPermissions): void {
        if (!this.hasPermissions(user.permissions, requiredPermissions)) {
            throw new ForbiddenError(requiredPermissions);
        }
    }

    /** Splits permission bitfield into it's individual components. */
    public static splitPermissions(permissions: UserPermissions): UserPermissions[] {
        const values: UserPermissions[] = [];
        while (permissions) {
            const bit = permissions & (~permissions + 1);
            values.push(bit);
            permissions ^= bit;
        }
        return values;
    }

    /**
     * Checks whether a change in permissions is allowed (i.e. makes sure it doesn't add or remove any permissions it
     * isn't allowed to).
     * @param {User} conductor The user who is conducting the change, this is relevant as the
     * {@link UserPermissions.ManageUsers ManageUsers} permission cannot be added or removed unless this user has the
     * {@link UserPermissions.Owner Owner} permission.
     * @param {UserPermissions} oldPermissions Original permissions of the target user.
     * @param {UserPermissions} newPermissions Intended new permissions of the target user.
     *
     * Note that this does not check the eligibility of the conductor to change the target user's permissions, for that
     * see {@link checkCanEditPermissionsOf}.
     */
    public static checkCanChangePermissionsTo(
        conductor: User,
        oldPermissions: UserPermissions,
        newPermissions: UserPermissions,
    ): void {
        // if the permissions are the same, then it's fine
        if (oldPermissions === newPermissions) return;

        const isRemovingOrAdding = (p: UserPermissions) => {
            const oldHas = this.hasPermissions(oldPermissions, p);
            const newHas = this.hasPermissions(newPermissions, p);
            return oldHas !== newHas;
        };

        // the `Owner` permission cannot be removed or added
        if (isRemovingOrAdding(UserPermissions.Owner)) {
            throw new ForbiddenError("Cannot remove or add the 'Owner' permission.");
        }

        // the `ManageUsers` permission cannot be removed or added by non-owners
        if (isRemovingOrAdding(UserPermissions.ManageUsers)) {
            this.checkHasPermissions(conductor, UserPermissions.Owner);
        }
    }

    /**
     * Checks that a conductor of a permission change is eligible to change a target user's permissions.
     * @param {User} conductor The user who is conducting the change.
     * @param {User} targetUser The user whose permissions are being changed.
     *
     * Note that this does not check the validity of the old and new permissions themselves, for that see
     * {@link checkCanChangePermissionsTo}.
     */
    public static checkCanEditPermissionsOf(conductor: User, targetUser: User): void {
        // you can always edit yourself
        if (conductor._id === targetUser._id) return;

        // nobody can edit owners (except themselves)
        if (this.hasPermissions(targetUser.permissions, UserPermissions.Owner)) {
            throw new ForbiddenError("Cannot edit users with the 'Owner' permission.");
        }

        // if the target user has `ManageUsers` permission, you can only edit them if you're an owner
        if (this.hasPermissions(targetUser.permissions, UserPermissions.ManageUsers)) {
            this.checkHasPermissions(conductor, UserPermissions.Owner);
        }
    }

    /**
     * Checks that a change in server status is possible and that the conductor of said change is authorized to carry it
     * out.
     * @throws Throws a {@link ForbiddenError} if the change is impossible or if the conductor lacks permissions.
     */
    public static validateServerStatusChange(
        conductor: User,
        oldStatus: ServerStatus,
        newStatus: ServerStatus,
    ): ServerStatusAction {
        switch (oldStatus) {
            case ServerStatus.Pending:
                switch (newStatus) {
                    case ServerStatus.Public:
                        return ServerStatusAction.Accept;
                    case ServerStatus.Rejected:
                        return ServerStatusAction.Reject;
                }
                break;
            case ServerStatus.Rejected:
                switch (newStatus) {
                    case ServerStatus.Public:
                        return ServerStatusAction.Reconsider;
                }
                break;
            case ServerStatus.Public:
                switch (newStatus) {
                    case ServerStatus.Withdrawn:
                        return ServerStatusAction.Withdraw;
                    case ServerStatus.Featured:
                        this.checkHasPermissions(conductor, UserPermissions.Feature);
                        return ServerStatusAction.Feature;
                }
                break;
            case ServerStatus.Withdrawn:
                switch (newStatus) {
                    case ServerStatus.Rejected:
                        return ServerStatusAction.Delete;
                    case ServerStatus.Public:
                        return ServerStatusAction.Reinstate;
                }
                break;
            case ServerStatus.Featured:
                switch (newStatus) {
                    case ServerStatus.Public:
                        this.checkHasPermissions(conductor, UserPermissions.Feature);
                        return ServerStatusAction.Unfeature;
                }
                break;
        }

        throw new ForbiddenError(`Invalid status change: ${ServerStatus[oldStatus]} -> ${ServerStatus[newStatus]}.`);
    }
}
