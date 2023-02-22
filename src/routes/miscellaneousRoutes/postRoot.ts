import { AuthScopes, DatabaseScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { ISOString } from '../../types/Utility';

export interface GetRootResponse {
    startTime: ISOString;
    version: string;
    receivedRequest: ISOString;
}

export const postRoot: EndpointProvider<AuthScopes.None, DatabaseScopes.None, void, GetRootResponse> = {
    auth: AuthScopes.None,
    database: DatabaseScopes.None,
    permissionsRequired: null,
    applyToRoute({ config }) {
        const { startedAt: startTime, version } = config;
        return (_req, res) => {
            res.status(200).json({ startTime, version, receivedRequest: new Date().toISOString() });
        };
    },
};
