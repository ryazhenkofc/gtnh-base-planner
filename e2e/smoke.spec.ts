import { expect, test } from '@playwright/test';

test('app loads without console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByTestId('scene')).toBeVisible();
  await expect(page.getByText('Coke Oven', { exact: false }).first()).toBeVisible();
  expect(errors).toEqual([]);
});
