import { ISiteTokenPayload } from '../../interfaces/ISiteTokenPayload';
import { IUser } from '../../interfaces/IUser';

declare global {
    namespace Express {
        export interface Request {
            /** The user that is making this request. */
            user: IUser;

            /** The site token data associated with this user, note that they may no longer exist in the database. */
            auth: ISiteTokenPayload;
        }
    }
}
