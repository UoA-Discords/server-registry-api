// functions related to user permissions

import { User } from '../../types/User';
import { UserPermissions } from '../../types/User/UserPermissions';

/**
 * Checks the provided set of permissions includes the target one(s).
 * @param {User | UserPermissions} currentPermissions Object to check permissions of.
 * @param {UserPermissions} requiredPermissions Permissions that are all required.
 *
 * To check multiple permissions, simply bitwise OR them.
 */
export function hasPermission(
    currentPermissions: User<boolean> | UserPermissions,
    requiredPermissions: UserPermissions,
): boolean {
    if (typeof currentPermissions === 'number') {
        return (currentPermissions & requiredPermissions) === requiredPermissions;
    }
    return (currentPermissions.permissions & requiredPermissions) === requiredPermissions;
}

/** Splits a bitfield of user permissions into its individual components. */
export function splitPermissions(permissions: UserPermissions): UserPermissions[] {
    const values: UserPermissions[] = [];
    while (permissions) {
        const bit = permissions & (~permissions + 1);
        values.push(bit);
        permissions ^= bit;
    }
    return values;
}
