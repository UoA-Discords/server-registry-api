import { SiteError } from './SiteError';

/**
 * Error thrown when a server or user does not exist in the database.
 *
 * Has status code 404 (Not Found), since the user has requested a resource that does not exist.
 */
export class NotFoundError extends SiteError {
    public readonly statusCode = 404;
    public constructor(type: 'server' | 'user') {
        const capitalType = type[0].toUpperCase() + type.slice(1);

        super(`${capitalType} Not Found`, `A ${type} with this ID does not exist in the database.`, undefined);
    }
}
