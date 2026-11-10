import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('OpenTelemetry bootstrap ordering', () => {
  it('loads instrumentation before application modules', () => {
    const source = readFileSync(join(__dirname, 'main.ts'), 'utf8');
    const runtimeImports = source.match(/^\s*import(?!\s+type\b)[^;]+;/gm);

    expect(runtimeImports?.[0]).toContain("from './instrumentation.js'");
  });
});
