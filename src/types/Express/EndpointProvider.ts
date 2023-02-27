import { RequestHandler } from 'express';
import { SiteTokenPayload } from '../Auth/SiteTokenPayload';
import { Config } from '../Config';
import { AppServices } from '../Services';
import { User } from '../User';
import { UserPermissions } from '../User/UserPermissions';

/** Endpoint handler with typed request body and response types. */
export type EndpointProviderReturnValue<
    TRequest = unknown,
    TResponse = unknown,
    TPathParams = object,
    TQueryParams = object,
> = RequestHandler<TPathParams, TResponse, TRequest, TQueryParams>;

export enum AuthScopes {
    /** No authorization header needed. */
    None,

    /**
     * Authorization header is needed, but the user associated with the token doesn't ever need to be fetched.
     *
     * - Will throw an `AuthError` if the token is invalid.
     */
    TokenOnly,

    /**
     * Authorization header isn't needed, but if supplied then a user will be fetched.
     *
     * - Will throw an `AuthError` if the token is invalid.
     * - Will throw an `AccountDeletedError` if the user associated with the provided token no longer exists in the
     * database.
     */
    OptionalUser,

    /**
     * An authorization token associated with an existing user is needed.
     *
     * - Will throw an `AuthError`if the token is invalid.
     * - Will throw an `AccountDeletedError` if the user associated with the provided token no longer exists in the
     * database.
     * - Will throw a `ForbiddenError` if the user lacks the required permissions (if permissions are specified).
     */
    User,
}

interface EndpointProviderParams<TAuth extends AuthScopes> extends AppServices {
    config: Config;
    auth: TAuth extends AuthScopes.None
        ? null
        : TAuth extends AuthScopes.OptionalUser
        ? null | SiteTokenPayload
        : SiteTokenPayload;
    user: TAuth extends AuthScopes.User ? User : TAuth extends AuthScopes.OptionalUser ? null | User : null;
}

export interface EndpointProvider<
    TAuth extends AuthScopes,
    TRequest,
    TResponse,
    TPathParams = unknown,
    TQueryParams = unknown,
> {
    auth: TAuth;
    /**
     * Requesting user must have all of these permissions, or else the server will respond with 403 (Forbidden).
     *
     * Only applicable with {@link AuthScopes.User}.
     */
    permissionsRequired: TAuth extends AuthScopes.User ? UserPermissions | null : null;
    applyToRoute: ({
        config,
        auth,
        user,
        authService,
        serverService,
        userService,
    }: EndpointProviderParams<TAuth>) => EndpointProviderReturnValue<TRequest, TResponse, TPathParams, TQueryParams>;
}
