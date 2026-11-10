import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

test('el canal usa Sec-WebSocket-Protocol y no envía el JWT en la URL', () => {
  assert.match(html, /new WebSocket\(wsUrl, \['profelink', `profelink-bearer\.\$\{token\}`\]\)/);
  assert.match(html, /encodeURIComponent\(codigo\)/);
  assert.doesNotMatch(html, /access_token/);
});
