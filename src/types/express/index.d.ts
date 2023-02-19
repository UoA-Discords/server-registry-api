import { SiteTokenPayload } from '../../interfaces/SiteTokenPayload';
import { User } from '../../interfaces/User';

declare global {
    namespace Express {
        export interface Request {
            /** The user that is making this request. */
            user: User;

            /** The site token data associated with this user, note that they may no longer exist in the database. */
            auth: SiteTokenPayload;
        }
    }
}
