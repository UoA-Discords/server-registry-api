import axios from 'axios';
import { SiteError } from './SiteError';

/**
 * Error thrown when an API call made by the server to another server fails.
 *
 * Has status code 502 (Bad Gateway), since the server is acting as a gateway or proxy and received an
 * invalid response from the upstream server.
 */
export class SecondaryRequestError extends SiteError<number | null> {
    public readonly statusCode = 502;

    public constructor(title: string, description: string, error: unknown) {
        let receivedStatusCode: number | null = null;

        if (axios.isAxiosError(error)) receivedStatusCode = error.response?.status ?? error.status ?? null;

        super(title, description, receivedStatusCode);
    }
}
