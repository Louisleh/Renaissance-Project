import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const A11Y_ROUTES = ['/', '/curriculum', '/pricing'] as const;

const DISABLED_RULES: string[] = [
  // color-contrast is sensitive to our dark-gold palette and is tracked as a
  // design follow-up; re-enable once the palette audit lands.
  'color-contrast',
];

test.describe('a11y', () => {
  for (const route of A11Y_ROUTES) {
    test(`${route} has no critical axe violations`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('main#main-content')).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .disableRules(DISABLED_RULES)
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
});
