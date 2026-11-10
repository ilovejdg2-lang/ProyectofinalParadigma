const DEFAULT_CONCURRENCY = 4;
const DEFAULT_ITERATIONS = 20;
const MAX_CONCURRENCY = 10;
const MAX_ITERATIONS = 100;

function isLoopbackUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    ['http:', 'https:'].includes(url.protocol) &&
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  );
}

function assertLocalUrl(name, value) {
  if (!isLoopbackUrl(value)) {
    throw new Error(`${name}: solo se permiten destinos locales (localhost).`);
  }
}

function assertIntegerRange(name, value, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} debe ser un entero entre ${min} y ${max}.`);
  }
}

function validateBody(path, body) {
  if (path === '/health/ready') {
    return body?.status === 'ready' && body?.service === 'auth-service';
  }
  if (path === '/salud') {
    return body?.estado === 'ok' && body?.baseDatos === 'disponible';
  }
  return Array.isArray(body);
}

function percentile95(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(sorted.length * 0.95) - 1];
}

export async function runReadOnlyLoad({
  authUrl,
  activitiesUrl,
  concurrency = DEFAULT_CONCURRENCY,
  iterations = DEFAULT_ITERATIONS,
  fetchImpl = fetch,
}) {
  assertLocalUrl('AUTH_URL', authUrl);
  assertLocalUrl('ACTIVITIES_URL', activitiesUrl);
  assertIntegerRange('CONCURRENCY', concurrency, 1, MAX_CONCURRENCY);
  assertIntegerRange('ITERATIONS', iterations, 4, MAX_ITERATIONS);

  const checks = [
    { baseUrl: authUrl, path: '/health/ready' },
    { baseUrl: activitiesUrl, path: '/salud' },
    { baseUrl: activitiesUrl, path: '/banco-preguntas' },
    { baseUrl: activitiesUrl, path: '/cuestionarios' },
  ];
  const durationsMs = [];
  const failures = [];
  let nextIteration = 0;

  async function worker() {
    while (nextIteration < iterations) {
      const index = nextIteration++;
      const check = checks[index % checks.length];
      const url = `${check.baseUrl.replace(/\/$/, '')}${check.path}`;
      const startedAt = performance.now();
      let status = null;

      try {
        const response = await fetchImpl(url, {
          method: 'GET',
          redirect: 'manual',
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(10_000),
        });
        status = response.status;
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const body = await response.json();
        if (!validateBody(check.path, body)) {
          throw new Error('La respuesta no coincide con el contrato esperado.');
        }
      } catch (error) {
        failures.push({
          path: check.path,
          status,
          reason: error instanceof Error ? error.message : 'Error desconocido',
        });
      } finally {
        durationsMs.push(performance.now() - startedAt);
      }
    }
  }

  const startedAt = performance.now();
  await Promise.all(
    Array.from({ length: Math.min(concurrency, iterations) }, () => worker()),
  );
  const elapsedMs = performance.now() - startedAt;

  return {
    total: iterations,
    successful: iterations - failures.length,
    failed: failures.length,
    elapsedMs: Math.round(elapsedMs),
    p95Ms: Math.round(percentile95(durationsMs)),
    failures,
  };
}

function positiveIntegerFromEnv(name, defaultValue) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') return defaultValue;
  if (!/^\d+$/.test(raw)) throw new Error(`${name} debe ser un entero positivo.`);
  return Number(raw);
}

async function main() {
  const result = await runReadOnlyLoad({
    authUrl: process.env.AUTH_URL ?? 'http://127.0.0.1:5001',
    activitiesUrl: process.env.ACTIVITIES_URL ?? 'http://127.0.0.1:5002',
    concurrency: positiveIntegerFromEnv('CONCURRENCY', DEFAULT_CONCURRENCY),
    iterations: positiveIntegerFromEnv('ITERATIONS', DEFAULT_ITERATIONS),
  });

  console.log(
    `Read-only local checks: ${result.successful}/${result.total} passed; ` +
      `${result.failed} failed; p95 ${result.p95Ms} ms; ${result.elapsedMs} ms total.`,
  );
  for (const failure of result.failures) {
    console.error(
      `FAIL ${failure.path}: ${failure.status ?? 'no HTTP response'} — ${failure.reason}`,
    );
  }
  if (result.failed > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Error desconocido');
    process.exitCode = 1;
  });
}
