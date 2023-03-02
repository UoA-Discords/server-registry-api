import { AuthScopes, EndpointProvider } from '../../types/Express/EndpointProvider';
import { ISOString } from '../../types/Utility';

interface PostRootResponse {
    startTime: ISOString;
    version: string;
    receivedRequest: ISOString;
}

export const postRoot: EndpointProvider<AuthScopes.None, void, PostRootResponse> = {
    auth: AuthScopes.None,
    permissionsRequired: null,
    applyToRoute({ config }) {
        const { startedAt: startTime, version } = config;
        return (_req, res) => {
            res.status(200).json({ startTime, version, receivedRequest: new Date().toISOString() });
        };
    },
};
