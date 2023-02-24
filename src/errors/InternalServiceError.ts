import { Response } from 'express';
import { SiteError } from './SiteError';

export class InternalServiceError extends SiteError {
    public readonly logMessage: string;
    public readonly error?: unknown;

    public constructor(logMessage: string, error?: unknown) {
        super();
        this.logMessage = logMessage;
        this.error = error;
    }

    public send(res: Response): void {
        res.sendStatus(500);
    }
}
