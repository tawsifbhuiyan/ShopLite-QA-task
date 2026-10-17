const CUSTOMER = { email: 'qa@shoplite.test', password: 'Passw0rd!23' };

async function login(page, email = CUSTOMER.email, password = CUSTOMER.password) {
  await page.goto('login.html');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password/i).fill(password);
  await page.getByRole('button', { name: /log\s?in|sign\s?in/i }).click();
}

module.exports = { CUSTOMER, login };
