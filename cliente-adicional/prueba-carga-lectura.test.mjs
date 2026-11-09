import test from 'node:test';
import assert from 'node:assert/strict';
import { runReadOnlyLoad } from './prueba-carga-lectura.mjs';

function delayedResponse(url) {
  if (url.endsWith('/health/ready')) {
    return { status: 'ready', service: 'auth-service' };
  }
  if (url.endsWith('/salud')) {
    return { estado: 'ok', baseDatos: 'disponible' };
  }
  return [];
}

test('ejecuta lecturas concurrentes limitadas solo contra rutas GET conocidas', async () => {
  let active = 0;
  let maxActive = 0;
  const requests = [];

  const result = await runReadOnlyLoad({
    authUrl: 'http://localhost:5001',
    activitiesUrl: 'http://127.0.0.1:5002',
    concurrency: 3,
    iterations: 12,
    fetchImpl: async (url, options) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      requests.push({ url, method: options.method });
      await new Promise((resolve) => setTimeout(resolve, 8));
      active -= 1;
      return new Response(JSON.stringify(delayedResponse(url)), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(result.total, 12);
  assert.equal(result.successful, 12);
  assert.equal(result.failed, 0);
  assert.ok(maxActive > 1 && maxActive <= 3);
  assert.ok(requests.every(({ method }) => method === 'GET'));
  assert.deepEqual(
    new Set(requests.map(({ url }) => new URL(url).pathname)),
    new Set(['/health/ready', '/salud', '/banco-preguntas', '/cuestionarios']),
  );
});

test('reporta como fallida una lectura con respuesta HTTP no exitosa', async () => {
  const result = await runReadOnlyLoad({
    authUrl: 'http://localhost:5001',
    activitiesUrl: 'http://127.0.0.1:5002',
    concurrency: 1,
    iterations: 4,
    fetchImpl: async () => new Response('{}', { status: 503 }),
  });

  assert.equal(result.total, 4);
  assert.equal(result.successful, 0);
  assert.equal(result.failed, 4);
  assert.ok(result.failures.every(({ status }) => status === 503));
});

test('rechaza destinos que no sean localhost antes de enviar peticiones', async () => {
  let called = false;

  await assert.rejects(
    runReadOnlyLoad({
      authUrl: 'https://api.example.test',
      activitiesUrl: 'http://127.0.0.1:5002',
      concurrency: 2,
      iterations: 4,
      fetchImpl: async () => {
        called = true;
        return new Response('[]', { status: 200 });
      },
    }),
    /solo se permiten destinos locales/i,
  );
  assert.equal(called, false);
});

test('no sigue redirecciones que puedan salir de localhost', async () => {
  const requests = [];
  const result = await runReadOnlyLoad({
    authUrl: 'http://localhost:5001',
    activitiesUrl: 'http://127.0.0.1:5002',
    concurrency: 1,
    iterations: 4,
    fetchImpl: async (url, options) => {
      requests.push({ url, redirect: options.redirect });
      return new Response('', {
        status: 302,
        headers: { location: 'https://example.test/redirected' },
      });
    },
  });

  assert.ok(requests.every(({ redirect }) => redirect === 'manual'));
  assert.equal(result.failed, 4);
  assert.ok(result.failures.every(({ status }) => status === 302));
  assert.ok(
    requests.every(({ url }) =>
      ['localhost', '127.0.0.1'].includes(new URL(url).hostname),
    ),
  );
});
