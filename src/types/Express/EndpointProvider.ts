import { RequestHandler } from 'express';
import { Config } from '../Config';
import { SiteTokenPayload } from '../Auth/SiteTokenPayload';
import { User } from '../User';
import { UserPermissions } from '../User/UserPermissions';
import { AppModels } from '../Database/AppModels';

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
     * - Will throw an `AuthError` if the user associated with the provided token no longer exists in the database.
     * - Will return 501 (Not Implemented) if the user database does not exist.
     */
    OptionalUser,

    /**
     * An authorization token associated with an existing user is needed.
     *
     * - Will throw an `AuthError`if the token is invalid.
     * - Will throw an `AuthError` if the user associated with the provided token no longer exists in the database.
     * - Will throw a `ForbiddenError` if the user lacks the required permissions (if permissions are specified).
     * - Will return 501 (Not Implemented) if the user database does not exist.
     */
    User,
}

export enum DatabaseScopes {
    /** This endpoint does not interact with the database. */
    None,

    /**
     * This endpoint interacts with the database.
     *
     * - Will return 501 (Not Implemented) if said database does not exist.
     */
    Access,
}

export interface EndpointProvider<
    TAuth extends AuthScopes,
    TDatabase extends DatabaseScopes,
    TRequest,
    TResponse,
    TPathParams = unknown,
    TQueryParams = unknown,
> {
    auth: TAuth;
    database: TDatabase;
    /**
     * Requesting user must have all of these permissions, or else the server will respond with 403 (Forbidden).
     *
     * Only applicable with {@link AuthScopes.User}.
     */
    permissionsRequired: TAuth extends AuthScopes.User ? UserPermissions | null : null;
    applyToRoute: ({
        auth,
        config,
        db,
        user,
    }: {
        auth: TAuth extends AuthScopes.None
            ? null
            : TAuth extends AuthScopes.OptionalUser
            ? null | SiteTokenPayload
            : SiteTokenPayload;
        config: Config;
        db: TDatabase extends DatabaseScopes.Access ? AppModels : null;
        user: TAuth extends AuthScopes.User
            ? User<true>
            : TAuth extends AuthScopes.OptionalUser
            ? null | User<true>
            : null;
    }) => EndpointProviderReturnValue<TRequest, TResponse, TPathParams, TQueryParams>;
}
