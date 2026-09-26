import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const FIXTURE = readFileSync(
  join(process.cwd(), 'src/import/__fixtures__/gtnhplanner-titanium.json'),
  'utf8',
);

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** A 1×1 transparent PNG: icon requests to gtnhplanner.com are answered locally, tests never use the network. */
const PIXEL = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

let iconRequests = 0;

test.beforeEach(async ({ page }) => {
  iconRequests = 0;
  await page.route('https://gtnhplanner.com/**', (route) => {
    iconRequests++;
    return route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL });
  });
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-cleared')) {
      localStorage.clear();
      sessionStorage.setItem('e2e-cleared', '1');
    }
  });
});

async function importFixture(page: Page, viaPanel = false): Promise<void> {
  await page.getByTestId('mode-site').click();
  if (viaPanel) {
    await page.getByTestId('site-panel-toggle').click();
    await page.getByTestId('site-panel').getByRole('button', { name: 'Import from GTNH Planner' }).click();
  } else await page.getByTestId('site-import').click();
  const dialog = page.getByTestId('import-dialog');
  await expect(dialog).toBeVisible();
  await page.getByTestId('import-text').fill(FIXTURE);
  await page.getByTestId('import-read').click();
  await expect(page.getByTestId('import-rows').locator('tbody tr')).toHaveCount(8);
  await page.screenshot({ path: 'e2e/screenshots/site-import-dialog.png' });
  await page.getByTestId('import-build').click();
  await expect(dialog).toBeHidden();
}

test('imports a GTNH Planner chain into a routed site', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await importFixture(page);

  const stats = page.getByTestId('site-stats');
  await expect(stats).toContainText('6 groups');
  await expect(stats).toContainText('11 units');
  await expect(stats).toContainText(/(\d+)\/\1 connected/);
  await expect(page.getByTestId('site-legend')).toContainText('Chlorine');
  // Resources carry GTNH Planner icon paths, so the legend shows their icons.
  await expect(page.getByTestId('site-legend').locator('img').first()).toBeVisible();
  expect(iconRequests).toBeGreaterThan(0);
  // Let a few flow-arrow frames run before the picture.
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'e2e/screenshots/site-imported.png' });

  // Isolate one resource from the legend.
  await page
    .getByTestId('site-legend')
    .getByRole('button', { name: /Chlorine/ })
    .click();
  await expect(page.getByTestId('site-legend').getByRole('button', { name: /Chlorine/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.screenshot({ path: 'e2e/screenshots/site-isolated.png' });

  // Select a group in the panel, move and turn it from the keyboard.
  await page.getByTestId('site-panel-toggle').click();
  const panel = page.getByTestId('site-panel');
  await expect(panel).toBeVisible();
  await panel.getByTestId('site-group').first().click();
  await expect(panel.getByTestId('site-group-editor')).toBeVisible();
  const x = panel.getByTestId('site-group-x');
  const before = Number(await x.inputValue());
  await panel.getByTestId('site-group').first().focus();
  await page.keyboard.press('ArrowRight');
  await expect(x).toHaveValue(String(before + 1));
  await page.keyboard.press('Shift+ArrowLeft');
  await expect(x).toHaveValue(String(before - 4));
  await panel.getByTestId('site-group-rotate').click();
  await page.screenshot({ path: 'e2e/screenshots/site-panel.png' });

  // Arrange puts the chain back in order and everything stays connected.
  await panel.getByTestId('site-arrange').click();
  await expect(stats).toContainText(/(\d+)\/\1 connected/);

  // Icons can be switched off: colour swatches only.
  await panel.getByTestId('site-icons').click();
  await expect(page.getByTestId('site-legend').locator('img')).toHaveCount(0);
  await panel.getByTestId('site-icons').click();

  // The site survives a reload; the view comes back in site mode.
  await page.waitForTimeout(500);
  await page.reload();
  await expect(page.getByTestId('site-stats')).toContainText('6 groups');

  expect(errors).toEqual([]);
});

test('builds a site by hand and switches back to the machine view', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  // The current machine plan (4 Coke Ovens) becomes the first group.
  await page.getByTestId('settings-toggle').click();
  await page.getByTestId('add-to-site').click();
  await expect(page.getByTestId('site-stats')).toContainText('1 group');

  await page.getByTestId('site-panel-toggle').click();
  const panel = page.getByTestId('site-panel');
  await panel.getByTestId('site-add-group').click();
  await page
    .getByTestId('picker')
    .getByTestId('picker-item')
    .filter({ hasText: 'Electric Blast Furnace' })
    .click();
  await expect(page.getByTestId('site-stats')).toContainText('2 groups');

  // A link from a site input to the furnace, with a new resource.
  const form = panel.getByTestId('site-link-form');
  await form.getByLabel('From').selectOption({ label: 'Site input' });
  await form.getByLabel('To').selectOption({ label: 'Electric Blast Furnace' });
  await form.getByLabel('Resource name').fill('Iron Dust');
  await panel.getByTestId('site-add-link').click();
  await expect(page.getByTestId('site-legend')).toContainText('Iron Dust');
  await expect(page.getByTestId('site-stats')).toContainText('2/2 connected');

  await panel.getByRole('button', { name: 'Close' }).click();
  await page.getByTestId('mode-machine').click();
  await expect(page.getByTestId('multiblock-name')).toHaveText(/coke oven/i);
  expect(errors).toEqual([]);
});

test('site view on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await importFixture(page, true);
  await expect(page.getByTestId('site-stats')).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/site-mobile.png' });
});
