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

    app.listen(config.port, () => {
        console.log(`Listening on port ${config.port} (${app.get('env')})`);
    });
}

startServer();
