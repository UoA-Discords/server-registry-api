import { Response } from 'express';

export abstract class SiteError {
    public abstract send(res: Response): void;
}
