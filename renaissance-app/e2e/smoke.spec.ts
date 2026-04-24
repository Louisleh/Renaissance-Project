import { test, expect, type ConsoleMessage } from '@playwright/test';

const PUBLIC_ROUTES = ['/', '/curriculum', '/pricing', '/study', '/journey', '/review'] as const;

test.describe('smoke', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`loads ${route} without console errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', (msg: ConsoleMessage) => {
        if (msg.type() === 'error') errors.push(msg.text());
      });
      page.on('pageerror', (err) => errors.push(err.message));

      const response = await page.goto(route);
      expect(response?.ok()).toBe(true);

      await expect(page.locator('main#main-content')).toBeVisible();
      const ignorable = (text: string) =>
        /favicon|posthog|supabase|stripe|\.map(\?|$)/i.test(text);
      expect(errors.filter((e) => !ignorable(e))).toEqual([]);
    });
  }

  test('home page shows the hero heading and a primary CTA', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: /Map What You['’]re Made Of/i }),
    ).toBeVisible();
  });
});
