import { Response } from 'express';
import { SiteError } from './SiteError';

export class NotFoundError extends SiteError {
    public readonly type: 'server' | 'user';

    public constructor(type: 'server' | 'user') {
        super();
        this.type = type;
    }

    public send(res: Response): void {
        res.status(404).json({
            message: `${this.type[0].toUpperCase() + this.type.slice(1)} Not Found`,
            hint: `A ${this.type} with this ID does not exist in the database.`,
        });
    }
}
