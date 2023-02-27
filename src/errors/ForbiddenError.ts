import { PermissionService } from '../services/PermissionService';
import { UserPermissions } from '../types/User/UserPermissions';

import { SiteError } from './SiteError';

/**
 * Error thrown when a user does not have the required permissions to do an attempted action, or the action is
 * impossible (e.g. a user removing the owner permission from themselves) regardless of permissions.
 *
 * Has status code 403 (Forbidden), since the user has failed authorization or otherwise attempted a forbidden action.
 */
export class ForbiddenError extends SiteError<string[]> {
    public readonly statusCode = 403;

    public constructor(requiredPermissionsOrDescription: UserPermissions | string) {
        const requiredPermissionNames =
            typeof requiredPermissionsOrDescription === 'string'
                ? []
                : PermissionService.splitPermissions(requiredPermissionsOrDescription).map((e) => UserPermissions[e]);

        const title =
            typeof requiredPermissionsOrDescription === 'string' ? 'Disallowed Action' : 'Missing Permissions';

        const description =
            typeof requiredPermissionsOrDescription === 'string'
                ? requiredPermissionsOrDescription
                : 'You do not have the required permissions to do this action.';

        super(title, description, requiredPermissionNames);
    }
}
