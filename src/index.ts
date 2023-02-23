import { loadConfig } from './loaders/config';
import { loadExpress } from './loaders/express';
import { loadMongo } from './loaders/mongo';

async function startServer() {
    process.on('uncaughtException', (error) => {
        console.log('Uncaught exception:', error);
        process.exit(1);
    });

    process.on('unhandledRejection', (error, promise) => {
        console.log('Unhandled rejection:', promise);
        console.log('The error was:', error);
    });

    const config = loadConfig();
    const appModels = await loadMongo(config);

    const app = loadExpress(config, appModels);

    const server = app.listen(config.port, () => {
        const _addr = server.address();

        let address, port;

        if (typeof _addr !== 'string' && !!_addr) {
            address = _addr.address.replace('::', 'localhost');
            port = _addr.port;
        } else {
            address = 'unknown';
            port = config.port;
        }

        console.log(`Listening on http://${address}:${port} (${app.get('env')})`);
    });
}

startServer();
