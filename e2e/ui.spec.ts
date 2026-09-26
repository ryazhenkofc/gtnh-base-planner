import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

test.beforeEach(async ({ page }) => {
  // Start every test from a clean plan.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-cleared')) {
      localStorage.clear();
      sessionStorage.setItem('e2e-cleared', '1');
    }
  });
});

test('top bar, picker, count, settings and view mode', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');

  await expect(page.getByTestId('scene')).toBeVisible();
  const name = page.getByTestId('multiblock-name');
  await expect(name).toHaveText(/coke oven/i);
  await expect(page.getByTestId('count')).toHaveValue('4');
  await expect(page.getByRole('button', { name: 'Simple' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Detailed' })).toBeVisible();
  await expect(page.getByTestId('settings-toggle')).toHaveText(/settings/i);
  await page.screenshot({ path: 'e2e/screenshots/ui-desktop.png' });

  // Picker
  await name.click();
  const picker = page.getByTestId('picker');
  await expect(picker).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/ui-picker.png' });
  await picker
    .getByTestId('picker-item')
    .filter({ has: page.getByText('Coke Oven', { exact: true }) })
    .click();
  await expect(picker).toBeHidden();
  await expect(name).toHaveText(/coke oven/i);

  // Count
  await page.getByTestId('count-inc').click();
  await expect(page.getByTestId('count')).toHaveValue('5');
  await page.getByTestId('count-dec').click();
  await expect(page.getByTestId('count')).toHaveValue('4');
  await page.getByTestId('count').fill('2500');
  await page.getByTestId('count').press('Enter');
  await expect(page.getByTestId('count')).toHaveValue('2000');
  await page.getByTestId('count').fill('4');
  await page.getByTestId('count').press('Enter');
  await expect(page.getByTestId('count')).toHaveValue('4');

  // Settings drawer + limit field keeps what is typed
  await page.getByTestId('settings-toggle').click();
  const drawer = page.getByTestId('settings');
  await expect(drawer).toBeVisible();
  const limitX = page.getByTestId('limit-x');
  await limitX.click();
  await limitX.pressSequentially('15');
  await expect(limitX).toHaveValue('15');
  await limitX.press('Tab');
  await expect(limitX).toHaveValue('15');
  await page.getByTestId('limit-y').fill('0');
  await page.getByTestId('limit-y').press('Enter');
  await expect(page.getByTestId('limit-y')).toHaveValue('1');
  await page.getByTestId('limit-y').fill('');
  await page.getByTestId('limit-y').press('Enter');
  await page.screenshot({ path: 'e2e/screenshots/ui-settings.png' });
  await page.keyboard.press('Escape');
  await expect(drawer).toBeHidden();

  // View mode
  const simple = page.getByTestId('mode-simple');
  const detailed = page.getByTestId('mode-detailed');
  await expect(simple).toHaveAttribute('aria-pressed', 'true');
  await expect(simple).toHaveClass(/active/);
  await detailed.click();
  await expect(detailed).toHaveAttribute('aria-pressed', 'true');
  await expect(detailed).toHaveClass(/active/);
  await expect(simple).not.toHaveClass(/active/);

  expect(errors).toEqual([]);
});

test('mobile layout', async ({ page }) => {
  const errors = collectErrors(page);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await expect(page.getByTestId('multiblock-name')).toBeVisible();
  await expect(page.getByTestId('settings-toggle')).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'e2e/screenshots/ui-mobile.png' });
  await page.getByTestId('settings-toggle').click();
  await expect(page.getByTestId('settings')).toBeVisible();
  await page.screenshot({ path: 'e2e/screenshots/ui-mobile-settings.png' });
  expect(errors).toEqual([]);
});
