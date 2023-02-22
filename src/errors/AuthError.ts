import { Response } from 'express';
import { SiteError } from './SiteError';

export class AuthError extends SiteError {
    public readonly message: string;
    public readonly hint: string;

    public constructor(message: string, hint: string) {
        super();
        this.message = message;
        this.hint = hint;
    }

    public send(res: Response): void {
        res.status(401).json({ message: this.message, hint: this.hint });
    }
}
