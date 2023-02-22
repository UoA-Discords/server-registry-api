import axios from 'axios';
import { Response } from 'express';
import { SiteError } from './SiteError';

export class SecondaryRequestError extends SiteError {
    public readonly message: string;
    public readonly hint: string;
    public readonly receivedStatusCode: number | undefined;

    public constructor(message: string, hint: string, error: unknown) {
        super();
        this.message = message;
        this.hint = hint;

        if (axios.isAxiosError(error)) this.receivedStatusCode = error.response?.status ?? error.status;
    }

    public send(res: Response): void {
        res.status(502).send({
            message: this.message,
            hint: this.hint,
            receivedStatusCode: this.receivedStatusCode ?? 'Unknown',
        });
    }
}
