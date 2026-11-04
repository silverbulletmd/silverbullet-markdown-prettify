import { expect, test, vi } from 'vitest';
import { parseFixture } from './tests/parser.ts';
import cases from './tests/fixtures/cases.json';
import { DEFAULT_CONFIG } from './config.ts';
import { runPipeline } from './pipeline.ts';

vi.mock('@silverbulletmd/silverbullet/syscalls', () => ({
  markdown: { parseMarkdown: async (source: string) => parseFixture(source) },
}));

for (const fixture of cases) {
  test(fixture.name, async () => {
    const scope = fixture.scope === 'selection' ? 'selection' : 'page';
    const output = await runPipeline(fixture.source, DEFAULT_CONFIG, scope);
    expect(output).toBe(fixture.expected);
    expect(await runPipeline(output, DEFAULT_CONFIG, scope)).toBe(output);
  });
}

 test('smart quotes can be disabled', async () => {
  const source = '\"Hello,\" she said. \'Hello,\' he replied. Don\'t stop.\n';
  expect(await runPipeline(source, { ...DEFAULT_CONFIG, smartQuotes: false }, 'page')).toBe(source);
});
