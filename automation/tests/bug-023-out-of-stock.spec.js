const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

test('out-of-stock button is disabled and nothing reaches the cart (BUG-023)', async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/products\.html/);

  // The exact product from TC-04
  const button = page.locator('.tile[data-name="Type-C Hub 7-in-1"] button');
  await expect(button).toHaveText('Out of stock');
  await expect(button).toBeDisabled();

  // The cart must still be empty
  await page.getByRole('link', { name: /cart/i }).first().click();
  await expect(page).toHaveURL(/cart\.html/);
  await expect(page.getByText('Your cart is empty')).toBeVisible();
});