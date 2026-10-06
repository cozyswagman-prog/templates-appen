// Public read-only probes. No sessions, tokens, response bodies or private data are logged.
import { pathToFileURL } from 'node:url';
export const TARGETS = Object.freeze([
  { name: 'App', url: 'https://templates-app-cbh.pages.dev/', status: 200, contains: '<title>Templates</title>' },
  { name: 'Published site', url: 'https://templates-sajter.templates-hemsidor.workers.dev/b-bageriet-haga/', status: 200, header: ['x-content-type-options', 'nosniff'] },
  { name: 'API accepts app origin', url: 'https://templates-api.templates-hemsidor.workers.dev/api/sites', method: 'OPTIONS', origin: 'https://templates-app-cbh.pages.dev', status: 204 },
  { name: 'API rejects anonymous access', url: 'https://templates-api.templates-hemsidor.workers.dev/api/sites', origin: 'https://templates-app-cbh.pages.dev', status: 401 },
  { name: 'API rejects another origin', url: 'https://templates-api.templates-hemsidor.workers.dev/api/sites', method: 'OPTIONS', origin: 'https://untrusted.example', status: 403 }
]);
export async function checkHealth({ request = fetch, targets = TARGETS, timeoutMs = 15000 } = {}) {
  const checks = await Promise.all(targets.map(async target => {
    const start = performance.now();
    try {
      const response = await request(target.url, { method: target.method || 'GET', redirect: 'manual', headers: target.origin ? { Origin: target.origin } : {}, signal: AbortSignal.timeout(timeoutMs) });
      const statusOk = response.status === target.status;
      const headerOk = !target.header || response.headers.get(target.header[0]) === target.header[1];
      const contentOk = !target.contains || (await response.text()).includes(target.contains);
      if (!target.contains) await response.body?.cancel();
      return { name: target.name, status: statusOk && headerOk && contentOk ? 'PASS' : 'FAIL', httpStatus: response.status, expected: target.status, headerOk, contentOk, milliseconds: Math.round(performance.now() - start) };
    } catch {
      return { name: target.name, status: 'FAIL', reason: 'Network error or timeout', milliseconds: Math.round(performance.now() - start) };
    }
  }));
  return { at: new Date().toISOString(), status: checks.every(c => c.status === 'PASS') ? 'PASS' : 'FAIL', scope: 'Public HTTP availability and access controls; not payment, email delivery or authenticated publication', checks };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await checkHealth();
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === 'PASS' ? 0 : 1;
}
