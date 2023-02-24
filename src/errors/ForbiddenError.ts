import { Response } from 'express';
import { UserService } from '../services/UserService';
import { UserPermissions } from '../types/User/UserPermissions';
import { SiteError } from './SiteError';

export class ForbiddenError extends SiteError {
    public readonly requiredPermissions: UserPermissions;
    public readonly message: string | undefined;

    public constructor(requiredPermissions: UserPermissions, message?: string) {
        super();
        this.requiredPermissions = requiredPermissions;

        this.message = message;
    }

    public send(res: Response): void {
        res.status(403).json({
            requiredPermissions: UserService.splitPermissions(this.requiredPermissions).map((e) => UserPermissions[e]),
            message: this.message,
        });
    }
}
