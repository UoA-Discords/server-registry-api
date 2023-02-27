import { ServerChangeRecord } from '../types/Server/ServerChangeRecord';
import { ServerStatusAction } from '../types/Server/ServerStatusAction';

export const mockedServerChangeRecord: ServerChangeRecord = {
    verb: ServerStatusAction.Accept,
    by: 'mockedServerChangeRecord.by',
    at: new Date().toISOString(),
    reason: null,
};
