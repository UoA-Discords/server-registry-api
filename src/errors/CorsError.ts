import { Response } from 'express';

export class CorsError extends Error {
    public send(res: Response): void {
        res.status(400).send('Not allowed by CORS.');
    }
}
