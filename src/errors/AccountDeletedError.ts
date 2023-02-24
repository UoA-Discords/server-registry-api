import { AuthError } from './AuthError';

export class AccountDeletedError extends AuthError {
    public constructor() {
        super('Account Not Found', 'The account you are logged in as has most likely been deleted.');
    }
}
