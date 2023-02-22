import { Response } from 'express';
import { UserService } from '../services';
import { UserPermissions } from '../types/User/UserPermissions';
import { SiteError } from './SiteError';

export class ForbiddenError extends SiteError {
    public readonly requiredPermissions: UserPermissions;
    public readonly currentPermissions: UserPermissions;
    public readonly missingPermissions: UserPermissions;

    public constructor(requiredPermissions: UserPermissions, currentPermissions: UserPermissions) {
        super();
        this.requiredPermissions = requiredPermissions;
        this.currentPermissions = currentPermissions;

        this.missingPermissions = requiredPermissions & ~currentPermissions;
    }

    public send(res: Response): void {
        res.status(403).json({
            requiredPermissions: UserService.splitPermissions(this.requiredPermissions).map((e) => UserPermissions[e]),
            currentPermissions: UserService.splitPermissions(this.currentPermissions).map((e) => UserPermissions[e]),
            missingPermissions: UserService.splitPermissions(this.missingPermissions).map((e) => UserPermissions[e]),
        });
    }
}
