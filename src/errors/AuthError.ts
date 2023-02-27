import { SiteError } from './SiteError';

/**
 * Error thrown when a user's site token (JWT) is missing or invalid.
 *
 * Has status code 401 (Unauthorized), since the user has failed authentication.
 */
export class AuthError extends SiteError {
    public readonly statusCode = 401;

    public constructor(title: string, description: string) {
        super(title, description, undefined);
    }
}
