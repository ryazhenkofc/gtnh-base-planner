import { expect, test } from '@playwright/test';

test('texture atlas is served and decodes', async ({ page, request }) => {
  const res = await request.get('textures/atlas.png');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('image/png');
  await page.goto('detailed-harness.html');
  const size = await page.evaluate(async () => {
    const blob = await (await fetch('textures/atlas.png')).blob();
    const bitmap = await createImageBitmap(blob);
    return [bitmap.width, bitmap.height];
  });
  expect(size[0]).toBeGreaterThan(0);
  expect(size[1]).toBeGreaterThan(0);
});

test('DETAILED provider renders textured blocks', async ({ page }) => {
  const problems: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') problems.push(m.text());
  });
  page.on('pageerror', (e) => problems.push(e.message));
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto('detailed-harness.html');
  await page.waitForFunction(() => window.__detailedHarness?.ready || window.__detailedHarness?.error);
  const state = await page.evaluate(() => window.__detailedHarness);
  expect(state?.error).toBeUndefined();
  expect(state?.meshes).toBeGreaterThan(10);
  await page.screenshot({ path: 'e2e/screenshots/detailed-harness.png' });
  // Canvas is not a single flat colour (textures actually drew).
  const colours = await page.evaluate(() => {
    const canvas = document.getElementById('harness') as HTMLCanvasElement;
    const probe = document.createElement('canvas');
    probe.width = canvas.width;
    probe.height = canvas.height;
    const ctx = probe.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0);
    const { data } = ctx.getImageData(0, 0, probe.width, probe.height);
    const seen = new Set<number>();
    for (let i = 0; i < data.length; i += 4 * 97)
      seen.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    return seen.size;
  });
  expect(colours).toBeGreaterThan(200);
  expect(problems.filter((p) => !/GPU stall|ReadPixels/i.test(p))).toEqual([]);
});
