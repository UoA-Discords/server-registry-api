import { mockConfig } from '../tests/mockConfig';
import { stubApp } from '../tests/stubApp';
import { corsMiddleware } from './corsMiddleware';

describe('corsMiddleware', () => {
    describe('wildcard ["*"] whitelist', () => {
        const app = stubApp(mockConfig({ clientUrls: new Set(['*']) }), [corsMiddleware]);

        it('always allows undefined origin', async () => {
            const response = await app.get('/').send();

            expect(response.statusCode).toBe(200);
        });

        it('allows any origin', async () => {
            const response = await app.get('/').set('origin', 'https://example.com').send();

            expect(response.statusCode).toBe(200);
        });

        it('has the same Access-Control-Allow-Origin header', async () => {
            const response1 = await app.get('/').set('origin', 'https://example.com').send();
            const response2 = await app.get('/').set('origin', 'https://google.com').send();

            expect(response1.headers['access-control-allow-origin']).toBe('*');
            expect(response2.headers['access-control-allow-origin']).toBe('*');
        });
    });

    describe('static whitelist', () => {
        const app = stubApp(mockConfig({ clientUrls: new Set(['https://example.com']) }), [corsMiddleware]);

        it('always allows undefined origin', async () => {
            const response = await app.get('/').send();

            expect(response.statusCode).toBe(200);
        });

        it("doesn't allow non-whitelisted origins", async () => {
            const response = await app.get('/').set('origin', 'https://google.com').send();

            expect(response.statusCode).toBe(500);
        });

        it('allows whitelisted origins', async () => {
            const response = await app.get('/').set('origin', 'https://example.com').send();

            expect(response.statusCode).toBe(200);
        });

        it('has matching Access-Control-Allow-Origin header', async () => {
            const response = await app.get('/').set('origin', 'https://example.com').send();

            expect(response.headers['access-control-allow-origin']).toBe('https://example.com');
        });
    });
});
