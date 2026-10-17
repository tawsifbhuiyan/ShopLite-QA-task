const { test, expect } = require('@playwright/test');
const { login } = require('./helpers');

// Happy path: sign in -> add one product -> cart shows it.
test('customer can sign in, add a product and see it in the cart', async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/products\.html/); // spec 2.10

  
  await page.getByRole('button', { name: /add to cart/i }).first().click();

  await page.getByRole('link', { name: /cart/i }).first().click();
  await expect(page).toHaveURL(/cart\.html/);

  
  await expect(page.getByText('Your cart is empty')).toBeHidden();
  const qty = page.locator('input[type="number"], input[name*="qty" i], input[id*="qty" i]').first();
  await expect(qty).toHaveValue('1');
});
