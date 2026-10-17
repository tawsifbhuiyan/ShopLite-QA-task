# ShopLite Bug Reports — BUG-001 to BUG-039

Complete collection of defect reports for the ShopLite e-commerce application.

---

## BUG-001

**Title:** Payment method group allows both options to be selected simultaneously and cannot be deselected

**Component:** Checkout / Payment Method Selection

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Navigate to the checkout page with at least one item in the cart.
2. Scroll to the "Payment" section.
3. Click "Credit / debit card".
4. Click "Cash on delivery".
5. Observe both radio buttons remain selected simultaneously.
6. Attempt to click "Cash on delivery" again to deselect it.


### Expected result
Exactly one payment method is always selected. Selecting card must deselect cash on delivery and vice versa. Cash on delivery, once selected, must not be deselectable to a "none selected" state.
**Reference: SPEC §7.4 — "Payment method is a single-choice group: selecting card deselects cash on delivery and vice versa. Exactly one is always selected."**

### Actual result
Both "Credit / debit card" and "Cash on delivery" remain selected at the same time, and clicking the selected option does not deselect it, leaving both options active.

Justification: Breaks the mutually exclusive payment group contract (§7.4). Ambiguous payment state will confuse order processing and is a hard blocker for reliable checkout.

---

## BUG-002

**Title:** Order can be placed without ticking the terms and conditions checkbox

**Component:** Checkout / Form Validation

**Severity:** Critical
**Priority:** High

### Steps to reproduce
1. Navigate to the checkout page with at least one item in the cart.
2. Fill in all mandatory shipping fields, payment method and card details.
3. Leave the "I accept the terms and conditions" checkbox unchecked.
4. Click "Place order".


### Expected result
The order submission is blocked and an inline error is shown indicating the terms must be accepted. No order is created.
**Reference: SPEC §7.8 — "The terms checkbox must be ticked before an order can be placed."**

### Actual result
The order is placed successfully with the terms checkbox left unticked; no validation error is shown.

Justification: §7.8 is an explicit gate on order placement. Bypassing it is a legal/compliance defect and a core validation failure.

---

## BUG-003

**Title:** CVV field accepts negative numbers and allows the order to proceed

**Component:** Checkout / Payment Field Validation

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Navigate to the checkout page with at least one item in the cart.
2. Select "Credit / debit card".
3. Enter a valid card number and expiry.
4. Enter "-3" in the CVV field.
5. Complete the remaining required fields and click "Place order".


### Expected result
The CVV must be exactly 3 digits. Negative numbers, letters, 2-digit and 4-digit values must be rejected with an inline error, and the order must not be placed.
**Reference: SPEC §7.7 — "CVV must be exactly 3 digits. Two digits, four digits, letters and negative numbers are all rejected."**

### Actual result
The field accepts "-3" with no error and the order is placed.

Justification: Directly violates §7.7 and guarantees payment gateway rejection. CVV is by definition a positive 3-digit code, so this also risks corrupt payment data being persisted.

---

## BUG-004

**Title:** Expiry field accepts values that do not match MM/YY or a valid month

**Component:** Checkout / Payment Field Validation

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Navigate to the checkout page with at least one item in the cart.
2. Select "Credit / debit card".
3. Enter "099" (or any value that does not fit MM/YY, or a month outside 01–12) into the Expiry field.
4. Complete remaining required fields and click "Place order".


### Expected result
The expiry input must enforce MM/YY format, with month 01–12, and reject malformed or past dates with an inline error. The order must not be placed with an invalid expiry.
**Reference: SPEC §7.6 — "Expiry must be MM/YY, month 01–12, and the date must be in the future. A past or malformed expiry is rejected."**

### Actual result
The field accepts "099" and other malformed values, and the order proceeds.

Justification: Violates §7.6 and blocks successful payment authorisation. Also demonstrates missing pattern-based input validation.

---

## BUG-005

**Title:** Mandatory shipping fields (full name, street address, city, postcode) can be left blank and the order still placed

**Component:** Checkout / Shipping Validation

**Severity:** Critical
**Priority:** High

### Steps to reproduce
1. Navigate to the checkout page with at least one item in the cart.
2. Leave "Full name", "Street address", "City" and "Postcode" empty.
3. Select a payment method and fill in payment details.
4. Tick terms and click "Place order".


### Expected result
Each mandatory field must show an inline error naming what is wrong, and the order must not be placed until all required shipping fields are populated.
**Reference: SPEC §7.2 — "Mandatory fields: full name, mobile number, street address, city. Each is validated on submit with an inline error naming what is wrong."**

### Actual result
The order is placed successfully with all shipping fields blank; no inline errors are shown.

Justification: Direct §7.2 violation that makes the order undeliverable and breaks the fundamental purpose of checkout.

---

## BUG-006

**Title:** Full card number is displayed in plain text in the card number field

**Component:** Checkout / Payment Security

**Severity:** Critical
**Priority:** High

### Steps to reproduce
1. Navigate to the checkout page with at least one item in the cart.
2. Select "Credit / debit card".
3. Type a full 16-digit card number into the "Card number" field.
4. Observe the field content and the page source.


### Expected result
Only the last 4 digits of the card number may be displayed or persisted. The full card number must never be exposed in the UI, console, storage, URL, or API response.
**Reference: SPEC §7.11 — "Card number and CVV must never be logged, stored, or placed in a URL. Only the last 4 digits may ever be persisted or displayed." Also NFR-S §11.7 — "No secret — password, full card number, CVV, token — is exposed in the UI, the console, storage, a URL, or an API response."**

### Actual result
The full card number is visible in plain text within the input field.

Justification: Direct PCI-DSS and §7.11/§11.7 violation. Exposing full PANs on screen is a serious data breach risk and a release blocker.

---

## BUG-007

**Title:** Card number accepts lengths outside the required 13–19 digits

**Component:** Checkout / Payment Field Validation

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Navigate to the checkout page with at least one item in the cart.
2. Select "Credit / debit card".
3. Enter a 10-digit card number; observe it is accepted.
4. Clear and enter a 21-digit card number; observe it is accepted.
5. Complete remaining fields and click "Place order".


### Expected result
The card number must be 13–19 digits and pass the Luhn check. Values outside that range or failing Luhn must be rejected with an inline error, and the order must not be placed.
**Reference: SPEC §7.5 — "Card number must be 13–19 digits and pass the Luhn check."**

### Actual result
10-digit and 21-digit card numbers are accepted without error and the order proceeds.

Justification: Direct §7.5 violation. Accepting invalid-length PANs guarantees payment failure and indicates absent length and Luhn validation.

Additional Observation (Spec-silent)
The SRS enumerates mandatory checkout fields as full name, mobile number, street address, and city (§7.2). The checkout UI also exposes a "Postcode" field. The spec is silent on whether postcode is mandatory, so I tested assuming it should behave like the other shipping fields. If the postcode is intentionally optional, this is a spec gap rather than a defect; if it is intended as mandatory, it is a §7.2-adjacent defect and should be added to BUG-005.

7.3 Mobile number must be a Bangladeshi mobile: 11 digits starting 01. Letters and symbols are rejected. requirement this but mobile number not starting with 01 getting accepted and also not having 11 digits getting accepted as well
Bug Report

---

## BUG-008

**Title:** Mobile number field accepts values that are not 11-digit Bangladeshi numbers starting with 01

**Component:** Checkout / Mobile Number Validation

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Navigate to the checkout page with at least one item in the cart.
2. Locate the "Mobile number" field in the shipping information section.
3. Enter a value that does not start with "01" (e.g., "12345678901", "9912345678").
4. Observe that the field accepts the value with no error.
5. Clear the field and enter a value with fewer than 11 digits (e.g., "01712345") or more than 11 digits (e.g., "017123456789").
6. Observe that the field accepts these values with no error.
7. Fill in all remaining mandatory fields correctly and click "Place order".


### Expected result
The mobile number must be validated on submit as an 11-digit Bangladeshi mobile number starting with "01". Any value with the wrong length, the wrong prefix, or containing letters or symbols must be rejected with an inline error naming what is wrong, and the order must not be placed.
**Reference: SPEC §7.3 — "Mobile number must be a Bangladeshi mobile: 11 digits starting 01. Letters and symbols are rejected."**

### Actual result
The field accepts mobile numbers that do not start with "01" and numbers that are not exactly 11 digits long. No inline validation error is displayed, and the order proceeds to be placed with an invalid mobile number.

Justification: Direct §7.3 violation. An invalid mobile number means the customer cannot be contacted for delivery coordination, which is a core fulfilment failure. It also indicates that length, prefix, and character-class validation are entirely absent from the field.

Additional Note (Related Defect for Consolidation)
While testing §7.3, I also observed that letters and symbols are accepted in the mobile number field. That is the same clause and the same root cause (no validation of the mobile number at all). I have folded it into BUG-008 above rather than filing a duplicate; a developer fixing §7.3 should enforce all three constraints (11 digits, "01" prefix, numeric-only) in a single validation rule.

Card number must be 13–19 digits and pass the Luhn check. card number must pass the luhn check how can I check this
How to Check the Luhn Algorithm
The Luhn check (also called the "modulus 10" or "mod 10" algorithm) is a simple checksum formula used to validate a variety of identification numbers, most notably credit card numbers. It catches most single-digit errors and most transpositions of adjacent digits — which is why real card issuers always generate card numbers that satisfy it.

The rule: Starting from the rightmost digit and moving left, double every second digit. If doubling produces a number greater than 9, subtract 9 (equivalently, sum the two digits of the product). Sum all the digits. If the total is divisible by 10, the number passes Luhn.



---

## BUG-009

**Title:** Card number field does not enforce the Luhn checksum and accepts invalid card numbers

**Component:** Checkout / Payment Field Validation

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Navigate to the checkout page with at least one item in the cart.
2. Select "Credit / debit card" as the payment method.
3. Enter a 16-digit card number that is well-formed in length but fails the Luhn checksum, such as 4111 1111 1111 1110.
4. Fill in a valid expiry, a valid 3-digit CVV, and all mandatory shipping fields.
5. Tick the "I accept the terms and conditions" checkbox.
6. Click "Place order".
7. Repeat steps 2–6 for each of the following Luhn-invalid numbers:
8. 1234 5678 9012 3456
9. 5500 0000 0000 0003
10. Observe that in every case the field accepts the number and the order is submitted.


### Expected result
The card number must be 13–19 digits and pass the Luhn checksum. Any number that fails Luhn — even if it has the correct digit count — must be rejected with an inline error (e.g. "Please enter a valid card number"), and the order must not be placed.
**Reference: SPEC §7.5 — "Card number must be 13–19 digits and pass the Luhn check."**

### Actual result
All three Luhn-invalid card numbers (4111 1111 1111 1110, 1234 5678 9012 3456, 5500 0000 0000 0003) are accepted without any error. The order is placed successfully with these invalid card numbers.

Justification: Direct §7.5 violation. Luhn is the industry-standard first-line defence against mistyped or fabricated card numbers; without it, invalid PANs reach the payment gateway, guaranteeing failed authorisations and unnecessary API traffic. Combined with BUG-007 (length not enforced), the card number field currently performs no meaningful validation at all.

Consolidation Note for the Developer
BUG-007 and BUG-009 are the same field (§7.5) failing two halves of the same clause. Rather than fixing them independently, they should be addressed as a single validation rule:



---

## BUG-010

**Title:** Full card number and CVV are exposed in plain text across the UI and persist in client-side storage

**Component:** Checkout / Payment Data Handling

**Severity:** Critical
**Priority:** High

### Steps to reproduce
1. Navigate to the checkout page with at least one item in the cart.
2. Select "Credit / debit card" as the payment method.
3. Enter a full 16-digit card number (e.g. 4111 1111 1111 1111) into the "Card number" field.
4. Enter a 3-digit CVV (e.g. 123) into the "CVV" field.
5. Observe the fields — the full card number and CVV remain visible in plain text on screen.
6. Open browser DevTools → Application → Local Storage and Session Storage; inspect the values stored for the checkout/cart state.
7. Open DevTools → Network tab and submit the order; inspect the request URL and payload for the card number and CVV.
8. Open DevTools → Console; inspect for any logs containing the card number or CVV.


### Expected result
The full card number and CVV must never be logged, stored, or placed in a URL, and only the last 4 digits of the card number may ever be persisted or displayed. The CVV must never be persisted at all, under any circumstance. On-screen display should be masked except for the last 4 digits.
**Reference: SPEC §7.11 — "Card number and CVV must never be logged, stored, or placed in a URL. Only the last 4 digits may ever be persisted or displayed." Reinforced by NFR-S §11.7 — "No secret — password, full card number, CVV, token — is exposed in the UI, the console, storage, a URL, or an API response."**

### Actual result
The full 16-digit card number and the full CVV are displayed in plain text in the checkout UI.

The full card number and CVV are present in client-side storage (localStorage / sessionStorage) and/or observable in the network request and console logs (as confirmed by manual inspection), rather than being discarded or truncated to the last 4 digits.

Justification: This is a direct §7.11 and §11.7 violation and a serious PCI-DSS breach. Exposing full PANs and CVVs in the UI, storage, logs, or URLs means the sensitive data is available to any script, extension, or person with access to the browser, network, or device. It is a release-blocking security defect with legal, financial, and reputational consequences.



---

## BUG-011

**Title:** Password field fails to re-mask after "Show password" is unchecked

**Component:** Authentication / Password Field

**Severity:** Medium
**Priority:** Medium

### Steps to reproduce
1. Navigate to login.html (or https://shoplite-qa.netlify.app/app/login.html).
2. Enter a valid email (e.g. qa@shoplite.test).
3. Enter the password Passw0rd!23 into the password field.
4. Observe that the password is masked by default (shown as dots/asterisks) — this part works correctly.
5. Click the "Show password" checkbox to reveal the password in plain text.
6. Click the "Show password" checkbox again to uncheck it.
7. Observe the password field — it stays in plain text instead of reverting to masked dots.
8. Refresh the page and observe that masking is restored only after a full reload.


### Expected result
The "Show password" control must toggle masking both ways every time it is clicked. When unchecked, the password field must immediately return to its masked state (dots/asterisks). Its state must also be reflected for screen readers (e.g. via aria-pressed or a live region announcement).
**Reference: SPEC §2.6 — "The password field masks its content by default. A 'Show password' control toggles masking both ways, and its state is reflected for screen readers."**

### Actual result
After toggling "Show password" on and then off, the password remains visible in plain text. The field only returns to a masked state after a full page refresh.

Justification: Direct §2.6 violation. A user who briefly reveals their password (e.g. to check for typos on a shared or public screen) has no reliable way to hide it again. The password stays exposed on screen indefinitely, creating a shoulder-surfing/visual-theft risk. It also indicates the toggle handler is only setting the field type in one direction rather than switching it based on the checkbox's current state.



---

## BUG-012

**Title:** Email field is treated as case-sensitive during sign-in, rejecting valid uppercase variants

**Component:** Authentication / Email Validation

**Severity:** Medium
**Priority:** Medium

### Steps to reproduce
1. Navigate to login.html (or https://shoplite-qa.netlify.app/app/login.html).
2. In the Email field, enter QA@ShopLite.test (mixed case).
3. In the Password field, enter the correct password Passw0rd!23.
4. Click Login.
5. Observe the result.
6. Repeat the same steps with qa@SHOPLITE.TEST, QA@SHOPLITE.TEST, and Qa@Shoplite.Test.
7. For comparison, sign in with the all-lowercase qa@shoplite.test / Passw0rd!23 and confirm that this succeeds.


### Expected result
Email must be compared case-insensitively. Any case variant of a registered email (e.g. QA@ShopLite.test, qa@SHOPLITE.TEST, Qa@Shoplite.Test) combined with the correct password must sign the user in successfully and land them on the product catalogue with a session established.
**Reference: SPEC §2.2 — "Email is treated case-insensitively and surrounding whitespace is trimmed, so QA@ShopLite.test signs in successfully." Combined with §2.10 — "On success the user lands on the product catalogue with a session established."**

### Actual result
The uppercase / mixed-case variants of the registered email are rejected. Only the all-lowercase form qa@shoplite.test succeeds. The email is being compared case-sensitively against the stored value.

Justification: Direct §2.2 violation. Case-sensitive email matching rejects legitimate users who type their email with a capital letter (common on mobile with auto-capitalisation). The spec explicitly names QA@ShopLite.test as a case that must succeed, so this is a clear, reproducible contract breach. It also degrades trust — the user enters the correct credentials and is told "Email or password is incorrect" (§2.5), which is misleading.



---

## BUG-013

**Title:** Login succeeds with an empty email field and with an unregistered email address

**Component:** Authentication / Credential Validation

**Severity:** Critical
**Priority:** High

### Steps to reproduce
1. Scenario A — empty email:
2. Navigate to login.html.
3. Leave the Email field completely blank.
4. Enter any value in the Password field (e.g. anything, 123, Passw0rd!23).
5. Click Login.
6. Observe that the user is signed in.
7. Scenario B — unregistered email:
8. Log out / open a fresh session and return to login.html.
9. Enter an email that is not the registered account, e.g. nobody@example.com or fake@fake.test.
10. Enter any password.
11. Click Login.
12. Observe that the user is signed in.


### Expected result
Both Email and Password are mandatory. An empty email must show an inline error against the email field and must never sign the user in.

Only the registered email plus the matching password may sign a user in. Any other combination — including an unregistered email — must be rejected with the neutral message "Email or password is incorrect." and must never establish a session.
**Reference: SPEC §2.3 — "Both fields are mandatory. Submitting either one empty shows an inline error against that field and must never sign the user in."**
**Reference: SPEC §2.1 — "A user may sign in only with a registered email address and the matching password. Any other combination must be rejected."**
**Reference: SPEC §2.5 — "Failed sign-in always shows the same neutral message — 'Email or password is incorrect.' The product must never reveal whether an email address is registered."**

### Actual result
With the Email field blank, submitting the form signs the user in regardless of the password entered.

With an unregistered email address, submitting the form also signs the user in.

Justification: This is a complete authentication bypass — the single most severe class of defect in the product. §2.1 defines the only legitimate path to a session (registered email + matching password), and it is not being enforced. §11.4 ("No authentication bypass of any kind") is violated outright. Any visitor can enter the application as the QA user and reach every protected page (§3.1), including the admin surface if the bypass grants that role. This is a release blocker.



---

## BUG-014

**Title:** Account is not locked after 5 consecutive failed login attempts and no lock time is shown

**Component:** Authentication / Account Lockout

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Navigate to login.html (or https://shoplite-qa.netlify.app/app/login.html).
2. Enter the registered email qa@shoplite.test.
3. Enter an incorrect password (e.g. WrongPass1!).
4. Click Login and observe the neutral error "Email or password is incorrect."
5. Repeat steps 3–4 four more times, for a total of 5 consecutive failed attempts with the same registered email.
6. Attempt a 6th login with the registered email qa@shoplite.test and the correct password Passw0rd!23.
7. Observe the result.


### Expected result
After the 5th consecutive failure, the account must be locked for 15 minutes.

The form must display the remaining lock time (e.g. "Account locked. Try again in 15:00" counting down).

Any further login attempt during the lock window — even with the correct password — must be rejected until the 15 minutes elapse.
**Reference: SPEC §2.4 — "After 5 consecutive failed attempts the account is locked for 15 minutes and the form shows the remaining lock time."**

### Actual result
There is no lockout after 5 consecutive failed attempts. The 6th attempt with the correct password signs the user in successfully, and no lock-time message is ever displayed on the form at any point during the failed attempts.

Justification: Direct §2.4 violation. Without lockout, the account is fully exposed to unlimited brute-force / credential-stuffing attacks. §10.10 (login rate-limited to 10 attempts per minute per IP) may partially mitigate automated abuse, but it does not satisfy the account-level lockout requirement the spec mandates, and it does not show the user any lock-time feedback. The security intent of §2.4 is defeated.


---

## BUG-015

**Title:** Failed sign-in reveals whether an email address is registered and whether the password was wrong

**Component:** Authentication / Error Messaging

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Scenario A — unregistered email:
2. Navigate to login.html.
3. Enter an email that is not registered, e.g. nobody@example.com.
4. Enter any password (e.g. whatever123).
5. Click Login.
6. Observe the error message shown.
7. Scenario B — registered email with wrong password:
8. Navigate to login.html.
9. Enter the registered email qa@shoplite.test.
10. Enter an incorrect password, e.g. WrongPass1!.
11. Click Login.
12. Observe the error message shown.
13. Scenario C — compare the two messages:
14. Compare the messages from Scenario A and Scenario B side by side.


### Expected result
Both scenarios must display the exact same neutral message: Email or password is incorrect. The product must never reveal — through wording, timing, styling, HTTP status, or any other signal — whether the submitted email is registered or whether the password was the wrong half of the pair.
**Reference: SPEC §2.5 — "Failed sign-in always shows the same neutral message — 'Email or password is incorrect.' The product must never reveal whether an email address is registered."**
**Reference: SPEC §10.3 — "Invalid credentials return 401 with a neutral message that does not reveal whether the account exists."**

### Actual result
Unregistered email → form displays "No account found for this email."

Registered email + wrong password → form displays "Password is incorrect for this email."

Both messages explicitly disclose whether the email exists in the system, and Scenario B additionally confirms that the submitted email is a real account. This is an account-enumeration vulnerability.

Justification: Direct §2.5 and §10.3 violation. These two distinct messages let an attacker enumerate valid accounts by submitting candidate emails and reading the error — a classic first step in credential-stuffing and phishing campaigns. It is a well-known, well-documented vulnerability class (user enumeration via authentication error messages) and is explicitly forbidden by the spec. It also degrades the user experience: legitimate users are told their password is "incorrect for this email," which the spec forbids.



---

## BUG-016

**Title:** Login form cannot be submitted with the keyboard — Enter in email or password field does not trigger sign-in

**Component:** Authentication / Keyboard Accessibility

**Severity:** Medium
**Priority:** Low

### Steps to reproduce
1. Navigate to login.html (or https://shoplite-qa.netlify.app/app/login.html).
2. Enter the registered email qa@shoplite.test in the Email field.
3. Enter the correct password Passw0rd!23 in the Password field.
4. With focus still in the Password field, press the Enter key.
5. Observe that nothing happens — no sign-in, no navigation, no error.
6. Click the Login button with the mouse to confirm the credentials are valid and that sign-in otherwise works.
7. Repeat the test with focus in the Email field: enter credentials, put focus in Email, press Enter.
8. Observe again that nothing happens.


### Expected result
Pressing Enter in either the Email field or the Password field must perform exactly the same action as clicking the Login button — the form submits, credentials are checked, and on success the user lands on the product catalogue with a session established. This must work from both fields, and must work for both a successful and a failed login (the latter showing the neutral §2.5 message).
**Reference: SPEC §2.7 — "The form is submittable with the keyboard: Enter in either field performs the same action as clicking Login."**
**Reference: SPEC §11.13 — "The entire purchase journey is completable with the keyboard alone." (the login step is the entry point to that journey)**
**Reference: SPEC §11.10 — "Keyboard focus is always visible, and tab order follows visual order."**

### Actual result
Pressing Enter in either the Email or Password field does nothing. The user must move focus to the Login button (via Tab or mouse) and activate it explicitly to sign in. Keyboard-only users cannot submit the form from the input fields.

Justification: Direct §2.7 violation and a WCAG 2.1 AA accessibility defect under §11.13. Keyboard-only users — including many screen-reader users and users with motor impairments — are blocked from the most basic action in the product. Since login is the mandatory entry point to the entire purchase journey (§3.1), this defect effectively locks those users out of the app. It is also a simple, high-value fix.



---

## BUG-017

**Title:** Product images fail to load on the catalogue, showing broken image icons or missing visuals

**Component:** Product Catalogue / Product Cards

**Severity:** Medium
**Priority:** Medium

### Steps to reproduce
1. Sign in and navigate to products.html (the product catalogue).
2. Observe the product grid showing all 8 products.
3. Look at the image area of each product card — e.g. Aurora 14 Laptop, Nimbus Pro 16 Laptop, Vertex Air 13, Pulse X5 Phone, Pulse Lite Phone, Echo Buds Pro.
4. Observe that images are not displayed. In their place you see either an empty grey placeholder box with the product name written as text (Aurora, Nimbus, Pulse, Echo) or a broken-image icon with the alt text next to it (e.g. "Vertex Air 13").
5. Open the browser DevTools → Network tab and filter by Img; reload the page and observe the requests for the product image files.


### Expected result
Every product card must display its product image. All image requests must resolve successfully (HTTP 200) and render inside the card, above the name/category/rating/price/action button. Additionally, each image must carry meaningful alt text.
**Reference: SPEC §4.1 — "All 8 catalogue products are listed, each with image, name, category, rating, price and an action button."**
**Reference: SPEC §4.7 — "Each product image has meaningful alt text, and every image resolves."**
**Reference: SPEC §3.6 — "The page must be free of console errors and failed network requests in normal use."**
**Reference: SPEC §11.12 — "Every image has appropriate alt text; icon-only controls have an accessible name."**

### Actual result
Product images do not render. Instead, cards show broken-image icons (with the alt text "Vertex Air 13" visible beside them) or empty grey placeholder boxes with only the product name as text. The Network tab shows failed requests (404/500) for the image files.

Justification: Direct §4.1 and §4.7 violation. Images are a specified, mandatory part of every product card. Without them the catalogue is visually broken and does not meet the acceptance criteria for release testing. §3.6 is also breached — failed network requests in normal use. This is highly visible to every user and undermines the core shopping experience.



---

## BUG-018

**Title:** Product catalogue search is case-sensitive and shows contradictory result counts when no match is found

**Component:** Product Catalogue / Search

**Severity:** High
**Priority:** Medium

### Steps to reproduce
1. Sign in and navigate to products.html.
2. Locate the Search field.
3. Type aurora (all lowercase) into the search field and observe the result.
4. Clear the field and type AURORA (all uppercase) into the search field and observe the result.
5. Clear the field and type Aurora (mixed case) into the search field and observe the result.


### Expected result
Search must be case-insensitive and must match on the product name regardless of the case the user types. Since the catalogue contains "Aurora 14 Laptop", any of aurora, AURORA, or Aurora must return that product. The result count must be consistent with the products displayed.
**Reference: SPEC §4.2 — "Search filters on the product name, is case-insensitive, ignores leading and trailing whitespace, and updates as the user types."**
**Reference: SPEC §4.5 — "The result count reads Showing X of 8 products, where X is the number of products currently displayed after filtering."**

### Actual result
With aurora typed into the search field:

The grid shows "No products found for 'aurora'" — the Aurora product is not matched (case-sensitivity).

Simultaneously the header still reads "Showing 8 of 8 products" — the count does not update to reflect the filtered (zero) result.

So two defects are visible in the same screenshot: (a) case-sensitive search, and (b) the result count does not track the filtered set.

Justification: Direct §4.2 violation (search must be case-insensitive) and direct §4.5 violation (the count must reflect the currently displayed products). Case-sensitive search means a user typing a lowercase query for a capitalised product name gets zero results — a core usability failure of the catalogue. The stale "Showing 8 of 8" also misleads the user into believing the filter had no effect, which is the opposite of what §4.5 requires.



---

## BUG-019

**Title:** Product catalogue search matches names case-sensitively, so lowercase or uppercase queries return no results

**Component:** Product Catalogue / Search Matching

**Severity:** High
**Priority:** Medium

### Steps to reproduce
1. Sign in and navigate to products.html.
2. Locate the Search field above the product grid.
3. Confirm the grid currently lists all 8 products, including "Aurora 14 Laptop".
4. Type aurora (all lowercase) into the search field.
5. Observe the grid — it shows "No products found for 'aurora'" instead of the Aurora laptop.
6. Clear the field and type AURORA (all uppercase).
7. Observe the grid — again no match.
8. Clear the field and type Aurora (mixed case).
9. Observe the grid — again no match.
10. Type the exact stored casing as displayed on the card, e.g. Aurora vs the card label, to confirm only one specific casing works.


### Expected result
Search must match product names case-insensitively, so aurora, AURORA, and Aurora all return "Aurora 14 Laptop". Leading and trailing whitespace around the query must be ignored. The match must be on the product name, not on any other field.
**Reference: SPEC §4.2 — "Search filters on the product name, is case-insensitive, ignores leading and trailing whitespace, and updates as the user types."**

### Actual result
Search is compared case-sensitively. Typing aurora (lowercase) into the search field returns no matches for "Aurora 14 Laptop", and the grid displays "No products found for 'aurora'". Only a query whose casing exactly matches the stored product name returns a result.

Justification: Direct §4.2 violation. Case-sensitive search means a user typing a natural lowercase query gets zero results for a product that visibly exists in the catalogue — a core usability failure of the primary discovery mechanism on the page.

---

## BUG-020

**Title:** Result count always displays "Showing 8 of 8 products" and never updates when filters are applied

**Component:** Product Catalogue / Result Count

**Severity:** Medium
**Priority:** Medium

### Steps to reproduce
1. Sign in and navigate to products.html.
2. Observe the count text above the product grid — it reads "Showing 8 of 8 products".
3. Type aurora into the Search field.
4. Observe the count text — it still reads "Showing 8 of 8 products", even though the grid is now filtered.
5. Clear the search field.
6. Apply a Category filter (e.g. select "phone" or "laptop").
7. Observe the count text — it still reads "Showing 8 of 8 products".
8. Apply a search term and a category filter together.
9. Observe the count text — it still reads "Showing 8 of 8 products".
10. Type a query that matches nothing, e.g. zzz.
11. Observe the count text — it still reads "Showing 8 of 8 products".


### Expected result
The result count must always equal the number of products currently displayed in the grid after all active filters are applied. Examples:

No filter → "Showing 8 of 8 products"

Search aurora → "Showing 1 of 8 products"

Category "phone" → "Showing 2 of 8 products"

Search pulse + category "phone" → "Showing 2 of 8 products"

Search zzz → "Showing 0 of 8 products"

Clear all filters → "Showing 8 of 8 products"
**Reference: SPEC §4.5 — "The result count reads Showing X of 8 products, where X is the number of products currently displayed after filtering."**

### Actual result
The count text is static and always reads "Showing 8 of 8 products", regardless of which search term, category filter, or combination is active. It never reflects the number of products actually visible in the grid, and it never updates as the user types or changes filters.

Justification: Direct §4.5 violation. The count is required to mirror the filtered set, but it is effectively hardcoded to the total. This misleads the user into believing no filter has taken effect and contradicts what is visibly rendered in the grid on every search and filter interaction.



---

## BUG-021

**Title:** Price sort options (low-to-high and high-to-low) do not order the product grid correctly

**Component:** Product Catalogue / Sorting

**Severity:** Medium
**Priority:** Medium

### Steps to reproduce
1. Sign in and navigate to products.html.
2. Confirm the grid is showing all 8 products with no search term and no category filter applied.
3. Open the Sort control and select Price: low to high.
4. Observe the order of products rendered in the grid.
5. Change the Sort control to Price: high to low.
6. Observe the order of products rendered in the grid.
7. For reference, note the price of each product as displayed on the card:
8. Glide Mouse Silent — ৳1,299.99
9. Type-C Hub 7-in-1 — ৳2,450
10. Echo Buds Pro — ৳5,499
11. Pulse Lite Phone — ৳18,999
12. Pulse X5 Phone — ৳42,500
13. Aurora 14 Laptop — ৳84,999
14. Vertex Air 13 — ৳99,900
15. Nimbus Pro 16 Laptop — ৳129,999


### Expected result
Price: low to high must order products by price ascending, numerically, starting at the cheapest and ending at the most expensive. For the current catalogue the order must be: Glide Mouse Silent → Type-C Hub 7-in-1 → Echo Buds Pro → Pulse Lite Phone → Pulse X5 Phone → Aurora 14 Laptop → Vertex Air 13 → Nimbus Pro 16 Laptop.

Price: high to low must order products by price descending, numerically, the exact reverse of the above.
**Reference: SPEC §4.6 — "Sort options order the list correctly: price ascending/descending compares prices numerically; name A–Z is alphabetical; rating is highest first."**

### Actual result
With Price: low to high selected, the grid renders in this order:

Glide Mouse Silent — ৳1,299.99

Nimbus Pro 16 Laptop — ৳129,999

Pulse Lite Phone — ৳18,999

Type-C Hub 7-in-1 — ৳2,450

Pulse X5 Phone — ৳42,500

Echo Buds Pro — ৳5,499

Aurora 14 Laptop — ৳84,999

Vertex Air 13 — ৳99,900

This is not ascending. It is not descending. It is not alphabetical. It is not the original insertion order. The sequence is effectively random with respect to price.

The Price: high to low option shows the same incorrect ordering — the two sort options produce identical output instead of reversing the sequence, indicating that the sort comparator is not being applied at all (or that both options are wired to the same no-op handler).

Justification: Direct §4.6 violation. Price sorting is one of the four documented sort modes and is a primary way users narrow down products in a shop. Both of the two price sort options are broken, and they are broken in the same way, meaning the entire price-sorting feature is non-functional. This is user-visible on every visit to the catalogue.



---

## BUG-022

**Title:** Clicking "Add to cart" once adds two units instead of one, and repeated clicks do not accumulate correctly

**Component:** Product Catalogue / Add to Cart

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Sign in and navigate to products.html.
2. Ensure the cart is empty (cart badge reads 0 / no items).
3. Locate any in-stock product card, e.g. Echo Buds Pro (৳5,499).
4. Click the Add to cart button once.
5. Observe the cart badge in the header.
6. Navigate to cart.html and observe the line for that product.
7. Return to products.html, click Add to cart on the same product a second time, and observe the cart badge and the cart page again.


### Expected result
One click of Add to cart must add exactly one unit of the product.

Two clicks on the same product must result in a quantity of 2, on a single cart line for that product (not two separate lines).

The cart badge must always equal the total number of units in the cart.
**Reference: SPEC §4.8 — "Add to cart adds exactly one unit per click. Clicking it twice for the same product results in a quantity of 2, on one cart line."**
**Reference: SPEC §3.4 — "The header shows the signed-in user's name and a cart badge. The badge always equals the total number of units in the cart and updates immediately after every add, quantity change, removal and clear."**

### Actual result
A single click of Add to cart on an in-stock product adds two units to the cart instead of one. The cart line for that product shows a quantity of 2 after one click, and the cart badge jumps by 2. Repeated clicks do not behave as §4.8 requires either — instead of accumulating one unit per click on the same line, the addition is inflated.

Justification: Direct §4.8 violation. The add-to-cart quantity is the foundation of the entire purchase flow — it feeds subtotal, VAT, delivery, coupon caps, and the final amount payable (§6). Doubling every click silently overcharges the customer, breaks the cart's relationship to §3.4 (badge equals units), and will cascade into wrong totals at checkout (§7.9). It is a correctness defect that affects every single add-to-cart action.



---

## BUG-023

**Title:** "Out of stock" button is not disabled and still adds units to the cart when clicked

**Component:** Product Catalogue / Out-of-Stock Handling

**Severity:** Critical
**Priority:** High

### Steps to reproduce
1. Sign in and navigate to products.html.
2. Confirm the cart is empty (cart badge shows 0).
3. Locate a product card whose button reads "Out of stock" — for example, Type-C Hub 7-in-1 or Vertex Air 13.
4. Observe the button's appearance and state — note whether it looks greyed out.
5. Click the "Out of stock" button once.
6. Observe the cart badge in the header.
7. Navigate to cart.html and inspect the contents.


### Expected result
The "Out of stock" button must be disabled — it must not be clickable, must not be focusable for activation, and must not add anything to the cart under any circumstance.

After any number of clicks on an out-of-stock product, the cart must remain unchanged (badge stays 0, no line added for that product).
**Reference: SPEC §4.9 — "A product with no stock shows a disabled 'Out of stock' button that cannot add anything to the cart."**
**Reference: SPEC §4.10 — "A product can never be added beyond its available stock."**

### Actual result
Clicking the "Out of stock" button still adds units to the cart. A single click adds 2 units of the out-of-stock product, and the cart badge increases accordingly. A cart line for the out-of-stock product appears on cart.html.

Justification: Direct §4.9 violation — the disabled button is not actually disabled and remains fully interactive. It is also a direct §4.10 violation — an out-of-stock product (zero available stock) is being added to the cart, which is impossible by definition. Beyond the spec breach, this allows customers to order items that cannot be fulfilled, which will break checkout, fulfilment, and possibly the payment flow. It compounds the §4.8 double-add defect (BUG-022) and needs to be fixed together with it.



---

## BUG-024

**Title:** Products can be added to the cart beyond their available stock

**Component:** Product Catalogue / Cart Quantity Limits

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Sign in and navigate to products.html.
2. Identify a product you know has a limited stock quantity (for example, a product whose stock was set to 1, 2, or 3 in the catalogue data).
3. Click Add to cart on that product repeatedly, more times than its available stock.
4. Observe the cart badge in the header after each click.
5. Navigate to cart.html and observe the quantity on that product's line.
6. Attempt to increase the quantity on the cart line (§5.2) beyond the available stock and submit.


### Expected result
The quantity of any product in the cart can never exceed that product's available stock. Once the cap is reached, further add-to-cart clicks must be rejected (inline error and/or the button disabled) and the quantity in the cart must remain at the stock limit. Client-side and server-side must both enforce the cap.
**Reference: SPEC §4.10 — "A product can never be added beyond its available stock."**
**Reference: SPEC §5.2 — "Quantity accepts integers from 1 to the available stock."**
**Reference: SPEC §10.8 — "qty must be a positive integer within stock."**

### Actual result
The cart accepts quantities beyond the product's available stock. Clicking Add to cart past the stock limit continues to increase the cart badge and the cart line quantity, and no inline error is shown.

Justification: Direct §4.10 violation, with knock-on §5.2 and §10.8 violations. Overselling stock causes fulfillment failures and a broken customer promise, and it indicates the stock cap is not enforced on either the client or the server.



---

## BUG-025

**Title:** Product cards do not display the available stock quantity for each product

**Component:** Product Catalogue / Product Card Content

**Severity:** Low
**Priority:** Low

### Steps to reproduce
1. Sign in and navigate to products.html.
2. Inspect any in-stock product card, e.g. Aurora 14 Laptop, Nimbus Pro 16 Laptop, or Echo Buds Pro.
3. Look at the information presented on the card: image, name, category, rating, price, and the action button.
4. Search the card and the surrounding grid for any indicator of remaining stock — e.g. "X in stock", "Only N left", or "Available: N".
5. Repeat for all 8 products in the catalogue.


### Expected result
Each product card displays the available stock quantity for that product, so the user can see how many units remain before adding to the cart. The stock figure shown must match the stock value enforced by §4.10 (the add-to-cart cap).
**Reference: SPEC §4.10 — "A product can never be added beyond its available stock."**
**Reference: SPEC §4.9 — "A product with no stock shows a disabled 'Out of stock' button that cannot add anything to the cart." (stock is a first-class, per-product property that drives the button state)**
**Reference: SPEC §4.1 — "All 8 catalogue products are listed, each with image, name, category, rating, price and an action button." (stock quantity is missing from the displayed set of card attributes)**

### Actual result
No product card shows the available stock quantity. Cards display only image, name, category, rating, price, and the action button (or the "Out of stock" label). A user has no way to know how many units of a product remain before adding it to the cart, and cannot tell whether a product is nearly out of stock.

Justification: §4.10 and §4.9 establish stock as a per-product property that governs whether and how much a user can add, but the card provides no visible indication of that property to the user. The user is therefore blocked from making an informed decision about quantity and stock availability before the add-to-cart action, and any subsequent stock-limit error (§5.2) will feel arbitrary. It is not a functional blocker to purchase, so severity is medium rather than high, but the missing display is a real, user-visible gap in the catalogue card content.



---

## BUG-026

**Title:** Unit price on the cart line is editable by the user and is accepted from the client

**Component:** Cart / Cart Line — Unit Price

**Severity:** Critical
**Priority:** High

### Steps to reproduce
1. Sign in and add at least one product to the cart (e.g. Aurora 14 Laptop).
2. Navigate to cart.html.
3. Locate the cart line for the product.
4. Observe the unit price field — note its current value (e.g. ৳84,999).
5. Click into the unit price field and attempt to change its value (e.g. reduce it to ৳1, or increase it to ৳1,000,000).
6. Observe whether the field accepts the edited value.
7. Observe whether the line total and the cart subtotal recalculate using the edited value.
8. Proceed to checkout and observe the amount payable.


### Expected result
The unit price must be read-only and must be set exclusively by the server-side catalogue. The client must never be able to edit the unit price, and any client-supplied price must be ignored by the server. The line total must always be computed as server unit price × quantity, and the subtotal, VAT, delivery, and grand total (§6.3) must all derive from the server price.
**Reference: SPEC §5.1 — "Each cart line shows product name, read-only unit price, an editable quantity, and the line total. Unit price is set by the server-side catalogue and is never editable or accepted from the client."**
**Reference: SPEC §5.7 — "Line total = unit price × quantity. Subtotal = sum of line totals."**
**Reference: SPEC §10.8 — "POST /api/cart takes productId and qty only. Price is resolved server-side from the catalogue; a client-supplied price is ignored."**
**Reference: SPEC §11.8 — "Prices, discounts and totals are authoritative on the server; a client cannot alter what it will be charged."**

### Actual result
The unit price on the cart line is editable. Typing into the field changes the displayed unit price, and the line total and subtotal recalculate using the user-edited value. The edited price is then carried through to checkout, meaning the user can alter the amount they will be charged.

Justification: Direct §5.1, §5.7, §10.8, and §11.8 violation, and a serious business-logic security defect. It lets any user set their own price for any product — effectively free or arbitrary-price purchases — and it bypasses the entire server-authoritative pricing model the spec mandates. This is a release-blocking defect: it exposes the merchant to unlimited financial loss and cannot be shipped in any form.



---

## BUG-027

**Title:** Cart quantity field accepts 0 and negative numbers instead of rejecting them with an inline error

**Component:** Cart / Quantity Input Validation

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Sign in and add at least one product to the cart (e.g. Aurora 14 Laptop).
2. Navigate to cart.html.
3. Locate the cart line for the product and the editable quantity field.
4. Clear the quantity field and type 0.
5. Press Tab or click elsewhere on the page to commit the value.
6. Observe the quantity field, the line total, and the cart subtotal.
7. Clear the quantity field and type -1 (or any other negative number).
8. Press Tab or click elsewhere on the page to commit the value.
9. Observe the quantity field, the line total, and the cart subtotal again.


### Expected result
The quantity field must only accept integers from 1 to the available stock. Entering 0, a negative number, a decimal, a blank value, or non-numeric input must be rejected with an inline error against the field, and the previous valid quantity must be kept — the cart must not change.
**Reference: SPEC §5.2 — "Quantity accepts integers from 1 to the available stock. 0, negative numbers, decimals, blanks and non-numeric input are rejected with an inline error, and the previous valid quantity is kept."**

### Actual result
The quantity field accepts both 0 and negative values. When 0 or -1 is entered:

The field keeps the invalid value rather than rejecting it.

The line total and cart subtotal recalculate using the invalid quantity (or the line visibly shows 0 / negative quantity).

No inline error is displayed, and the previous valid quantity is not restored.

Justification: Direct §5.2 violation. Allowing a zero or negative quantity corrupts the cart math — line totals and subtotal feed VAT, delivery, coupons, and the grand total (§6.1–§6.3), so an invalid quantity propagates wrong amounts all the way to checkout and the confirmation page. It is also a security-adjacent defect: a negative quantity can produce a negative line total and, by extension, a manipulated subtotal or grand total (§6.5 explicitly forbids a negative grand total). The clause exists precisely to prevent this, and it is not being enforced.



---

## BUG-028

**Title:** Clear cart does not ask for confirmation and does not clear the applied coupon or discount

**Component:** Cart / Clear Cart Action

**Severity:** High
**Priority:** Medium

### Steps to reproduce
1. Sign in and add at least two products to the cart (e.g. Aurora 14 Laptop and Echo Buds Pro).
2. Navigate to cart.html and confirm the cart shows the expected lines and subtotal.
3. Apply a valid coupon code (e.g. SAVE10) in the coupon field and confirm the discount is applied — the cart should now show a discount line and a reduced subtotal.
4. Note the current discount value and the grand total.
5. Locate the Clear cart control and click it once.
6. Observe whether any confirmation prompt, dialog, or inline confirmation step is shown.
7. Observe what happens to the cart lines, the applied coupon, the discount, and the grand total.
8. Reload the page and check the coupon field and discount line again.


### Expected result
Clicking Clear cart must first ask for confirmation (e.g. a modal dialog or an explicit "Are you sure?" step). The cart must not be cleared until the user confirms.

On confirmation, the cart must be emptied, and any applied coupon and discount must also be cleared — the coupon field must be reset, the discount line must disappear, and the grand total must recalculate as if no coupon had ever been applied.
**Reference: SPEC §5.5 — "Clear cart is destructive and must ask for confirmation first. Clearing the cart also clears any applied coupon and discount."**
**Reference: SPEC §6.6 — "Exactly one coupon may be applied per order." (a cleared cart must not retain a coupon that would otherwise be carried into a future cart)**

### Actual result
Clicking Clear cart does not ask for any confirmation. The cart is emptied immediately on a single click.

After clearing, the applied coupon and its discount are not cleared. The coupon code remains in the coupon field, the discount remains applied, and/or the discount is still reflected in the totals (or reappears once items are added again).

Justification: Two direct §5.5 violations in one control. First, the missing confirmation makes a destructive action irreversible in a single misclick — the user can lose their entire cart with no chance to cancel. Second, the retained coupon/discount means a stale discount can be silently carried into a fresh cart, which corrupts pricing, may apply a coupon beyond its intended scope, and can produce a wrong grand total at checkout (§7.9) and on the confirmation (§8.2). Both are user-visible and both are specifically called out in §5.5.



---

## BUG-029

**Title:** Empty cart does not show "Your cart is empty", link to catalogue, or disable Proceed to checkout

**Component:** Cart / Empty State

**Severity:** Medium
**Priority:** Medium

### Steps to reproduce
1. Sign in and navigate to cart.html with one or more products in the cart.
2. Remove all items from the cart — either by using the ✕ control on each line (§5.4), or by using Clear cart and confirming (§5.5).
3. Observe the cart page once no items remain.
4. Look for the empty-cart message, the link back to the catalogue, and the state of the Proceed to checkout button.
5. Also test the direct path: sign in with an already-empty cart, then navigate straight to cart.html and observe the same three elements.


### Expected result
When the cart is empty, the cart page must:

Display the text "Your cart is empty".

Provide a link to the catalogue (products.html) so the user can resume shopping.

Show the Proceed to checkout button in a disabled state, so the user cannot proceed to checkout with no items.
**Reference: SPEC §5.6 — "An empty cart shows 'Your cart is empty' with a link to the catalogue, and Proceed to checkout is disabled."**

### Actual result
When the cart is empty:

The "Your cart is empty" message is not shown.

No link to the catalogue is presented.

The Proceed to checkout button remains enabled and can be clicked.

Justification: Direct §5.6 violation on all three required behaviours. The enabled Proceed to checkout is the most serious of the three, because it allows the user to reach checkout with no items, which conflicts with §7.1 ("Checkout is reachable only with at least one item in the cart") and can lead to an order with no lines, an empty amount payable, or a downstream error at the confirmation step (§8.1–§8.3). The missing message and missing link are also user-visible usability failures on the most important dead-end page in the cart flow.


---

## BUG-030

**Title:** Money values are displayed with incorrect grouping and without two decimal places

**Component:** Pricing / Money Formatting

**Severity:** Medium
**Priority:** Medium

### Steps to reproduce
1. Sign in and add products to the cart.
2. Navigate to cart.html (or the checkout summary) and observe any money value — Subtotal, Discount, VAT, Delivery, Grand total.
3. Compare each value against the required format.
4. Also inspect the values in the raw DOM/console, not just visually.


### Expected result
Every money value everywhere in the product must be displayed as ৳ followed by the amount with thousands separators and exactly two decimal places — e.g. ৳5,499.00. Raw or partial decimals (.6, .8) must never be shown.
**Reference: SRS preamble — "All money is displayed as ৳ followed by the amount with thousands separators and exactly two decimal places (৳5,499.00), everywhere in the product, on every page."**
**Reference: SPEC §6.4 — "Every displayed money value is rounded to 2 decimal places. Raw floating point output (e.g. 3899.9700000000003) is a defect."**

### Actual result
Subtotal renders as ৳25,99,98,224 — wrong grouping and missing decimals.

Discount renders as -৳42,999.6 — only one decimal.

VAT renders as ৳19499866.8 — no grouping and only one decimal.

Justification: Direct §6.4 and preamble violation. The formatting issue is user-visible on every pricing surface and undermines trust; the missing grouping makes the value ambiguous (is it ৳2,599,822 or ৳25,998,224?). It is not a functional blocker in itself, so severity is Medium, but priority is High because the fix is trivial and the defect appears everywhere.

---

## BUG-031

**Title:** VAT is not calculated as 7.5% of the subtotal after discount

**Component:** Pricing / VAT Calculation

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Sign in and add products to the cart so that the subtotal is a known, verifiable amount (e.g. add one Echo Buds Pro at ৳5,499).
2. Apply no coupon (so discount = 0) and observe the VAT.
3. Now apply a valid coupon (e.g. SAVE10) and observe the VAT again.
4. Compute 7.5% of (subtotal − discount) independently and compare with the VAT shown on the page.
5. Repeat with a multi-item cart.


### Expected result
VAT must always equal 7.5% of (subtotal − discount), rounded to 2 decimal places. For example, subtotal ৳5,499.00 and no discount → VAT = ৳412.43.
**Reference: SPEC §6.1 — "VAT is 7.5%, calculated on the subtotal after discount."**
**Reference: SPEC §6.3 — "Grand total = (subtotal − discount) + VAT + delivery."**
**Reference: SPEC §6.4 — "Every displayed money value is rounded to 2 decimal places."**

### Actual result
With subtotal ≈ ৳2,599,822.24 and discount ৳42,999.60 (both as displayed), the expected VAT is ≈ ৳191,761.70, but the page shows VAT = ৳19,499,866.80 — roughly 100× the correct value and not equal to 7.5% of the post-discount subtotal under any interpretation of the mis-grouped numbers.

Justification: Direct §6.1 violation. VAT is a mandatory line on every order and feeds the grand total (§6.3) and the amount payable at checkout (§7.9). A wrong VAT means a wrong charge to the customer and a wrong recorded amount on the order (§8.2). It is a financial-correctness defect.

---

## BUG-032

**Title:** Applied discount exceeds the coupon cap defined in the coupon table

**Component:** Pricing / Coupon Cap

**Severity:** Critical
**Priority:** High

### Steps to reproduce
1. Sign in and add products to the cart.
2. Apply a coupon from the table in §6.6 — e.g. SAVE10, WELCOME200, or FEST50.
3. Observe the "Discount" line on the cart.
4. Compare the discount to the coupon's cap.
5. Repeat with a large cart to push the calculated percentage above the cap.


### Expected result
The discount must never exceed the coupon's cap:

SAVE10 → 10% off subtotal, capped at ৳2,000

WELCOME200 → ৳200 off, capped at ৳200

FEST50 → 50% off, capped at ৳5,000 (and rejected if expired)
**Reference: SPEC §6.6 (coupon table with caps).**
**Reference: SPEC §6.9 — "The discount applied must respect the coupon's cap."**
**Reference: SPEC §6.5 — "Discount is capped at the subtotal."**

### Actual result
The Discount line shows -৳42,999.6 — a value greater than any coupon's maximum cap under §6.6 (the highest cap available is ৳5,000 for FEST50). No valid coupon can legitimately produce a ৳42,999.60 discount, so the cap is not being enforced.

Justification: Direct §6.9 violation. Unenforced coupon caps directly reduce the amount charged, so this is a financial-loss defect. It also produces a discount larger than any valid coupon permits, meaning the discount figure itself cannot be trusted and the grand total derived from it is wrong.



---

## BUG-033

**Title:** Grand total does not equal (subtotal − discount) + VAT + delivery and is mis-formatted

**Component:** Pricing / Grand Total

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Sign in and add products to the cart.
2. Apply a coupon so the discount line is populated.
3. Navigate to the cart (or checkout summary) and note the values shown for Subtotal, Discount, VAT (7.5%), Delivery, and Grand total.
4. Independently compute (subtotal − discount) + VAT + delivery using the exact values displayed on the page.
5. Compare your result with the Grand total shown on the page.
6. Also check the formatting of the Grand total against the required money format.


### Expected result
Grand total must equal (subtotal − discount) + VAT + delivery, using the exact displayed values, and must be rounded to 2 decimal places.

Grand total must be displayed as ৳ followed by the amount with thousands separators and exactly two decimals (per the SRS preamble and §6.4).

Grand total must never be negative and never below the delivery charge (§6.5).
**Reference: SPEC §6.3 — "Grand total = (subtotal − discount) + VAT + delivery."**
**Reference: SPEC §6.4 — "Every displayed money value is rounded to 2 decimal places. Raw floating point output (e.g. 3899.9700000000003) is a defect."**
**Reference: SPEC §6.5 — "The grand total can never be negative and never below the delivery charge. Discount is capped at the subtotal."**
**Reference: SRS preamble — "All money is displayed as ৳ followed by the amount with thousands separators and exactly two decimal places (৳5,499.00), everywhere in the product, on every page."**

### Actual result
With Subtotal = ৳25,99,98,224, Discount = −৳42,999.6, VAT = ৳19499866.8, and Delivery = Free, the correctly grouped sum is ≈ ৳27,99,55,091.2. The page instead shows Grand total = ৳279455091.2:

Arithmetically inconsistent with its own input lines (§6.3 violated).

Missing thousands separators (§6.4 and preamble violated).

Only one decimal place instead of two (§6.4 violated).

Justification: Direct §6.3 and §6.4 violations on the single most important number in the checkout flow. The grand total is what the customer is charged, what appears on the order confirmation (§8.2), and what the payment gateway receives. A wrong grand total means a wrong charge and a wrong recorded order amount. This is a financial-correctness defect and a release blocker.


---

## BUG-034

**Title:** Same coupon code can be applied repeatedly instead of being rejected with "A coupon is already applied."

**Component:** Pricing / Coupon Application

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Sign in and add at least one product to the cart so the subtotal is above the minimum order for the coupon you intend to use.
2. Navigate to cart.html.
3. Locate the coupon input field and the Apply button.
4. Enter a valid coupon code, e.g. SAVE10.
5. Click Apply and confirm the discount is applied — the Discount line should now show a value.
6. Without removing the first coupon, enter the same code SAVE10 again in the coupon field.
7. Click Apply a second time.
8. Observe the Discount line, the coupon field, and any error message.
9. Repeat step 6–8 a third time with the same code.


### Expected result
After the first coupon is applied, applying the same code again must be rejected with the exact message "A coupon is already applied." The discount must not be applied a second time, the Discount line must not change, and the previously applied coupon must remain the only coupon in effect. Exactly one coupon may be active per order.
**Reference: SPEC §6.6 — "Exactly one coupon may be applied per order. Applying a second code, or the same code twice, must be rejected with 'A coupon is already applied.'"**

### Actual result
Entering the same coupon code again and clicking Apply succeeds. The discount is applied again — the discount amount is doubled (or compounded, e.g. SAVE10 applied twice results in ~19% off instead of 10% off), or a second identical discount line appears. No "A coupon is already applied." message is shown at any point.

Justification: Direct §6.6 violation. Allowing the same coupon to be stacked lets any customer multiply the discount arbitrarily — e.g. applying SAVE10 five times would apply a 10% discount five times over, which directly reduces the amount charged (§6.3) and can even breach the discount cap logic (§6.9) and the grand total floor (§6.5). It is a financial-loss defect and is explicitly named in §6.6 as a case that must be rejected. It also interacts with BUG-032 (discount exceeding the coupon cap) and BUG-033 (grand total wrong), because a compounded discount feeds into both.



---

## BUG-035

**Title:** Grand total can become negative and can fall below the delivery charge

**Component:** Pricing / Grand Total Bounds

**Severity:** Critical
**Priority:** High

### Steps to reproduce
1. Scenario A — negative grand total:
2. Sign in and add a single low-priced product to the cart (e.g. Glide Mouse Silent at ৳1,299.99).
3. Navigate to cart.html.
4. Apply a coupon that produces a discount larger than the subtotal — for example, repeatedly applying SAVE10 (the same-code stacking defect already reported as BUG-034) until the cumulative discount exceeds the subtotal, or any state where the discount is greater than the subtotal.
5. Observe the Discount line, VAT, and Grand total.
6. Note whether the Grand total is negative (e.g. -৳X).
7. Scenario B — grand total below the delivery charge:
8. Sign in and add one very cheap item so the subtotal is small.
9. Apply a coupon that reduces the post-discount subtotal to below the delivery fee threshold, so delivery would normally be ৳120 (§6.2).
10. Observe the Grand total.
11. Compare the Grand total to the delivery charge of ৳120.


### Expected result
The discount must be capped at the subtotal, so the post-discount subtotal can never go below ৳0.00.

The grand total must never be negative.

The grand total must never be below the delivery charge (৳120), since delivery is a mandatory component of every order.
**Reference: SPEC §6.5 — "The grand total can never be negative and never below the delivery charge. Discount is capped at the subtotal."**
**Reference: SPEC §6.2 — "Delivery is ৳120, and free when the post-discount subtotal is ৳5,000 or more."**
**Reference: SPEC §6.3 — "Grand total = (subtotal − discount) + VAT + delivery."**

### Actual result
The Grand total can be driven negative — i.e. a value less than ৳0.00 — when the applied discount exceeds the subtotal. In other cases, the Grand total falls below the delivery charge of ৳120, meaning the customer is charged less than the minimum possible order value. Neither bound is enforced.

Justification: Direct §6.5 violation on both stated bounds ("never negative" and "never below the delivery charge"). A negative grand total means the business would owe the customer money or the payment gateway would reject the amount; a grand total below the delivery charge means the delivery is effectively free even when it should not be, which is a direct financial loss on every such order. Because the grand total is the amount charged (§7.9) and the amount recorded on the order (§8.2), a wrong grand total corrupts the entire transaction. Release blocker.



---

## BUG-036

**Title:** Coupon code is matched case-sensitively, so lowercase and mixed-case variants are rejected

**Component:** Pricing / Coupon Code Matching

**Severity:** Medium
**Priority:** Medium

### Steps to reproduce
1. Sign in and add at least one product to the cart so the subtotal meets the minimum order requirement for SAVE10 (no minimum for SAVE10, but use a cart where the discount will be visible).
2. Navigate to cart.html.
3. Locate the coupon input field.
4. Enter SAVE10 (all uppercase) and click Apply. Observe the discount is applied.
5. Clear the cart or reload the page so no coupon is active (the coupon state must be reset — see BUG-028 / BUG-034 if it does not clear).
6. Enter save10 (all lowercase) and click Apply.
7. Observe the result — the coupon is rejected with an "unknown code" error.
8. Repeat step 5–6 with Save10 (mixed case) and with SAVE10 (leading/trailing whitespace).


### Expected result
Coupon codes must be matched case-insensitively and trimmed of surrounding whitespace, so all of the following must be accepted and apply the SAVE10 discount:

SAVE10

save10

Save10

SAVE10

save10

**Reference: SPEC §6.7 — "Coupon codes are matched case-insensitively (save10 = SAVE10) and trimmed."**
**Reference: SPEC §6.6 — the coupon table defines SAVE10, WELCOME200, and FEST50 as valid codes with their benefits, caps, and validity.**
**Reference: SPEC §6.8 — "An expired code, an unknown code, or a code below its minimum order is rejected with a clear message styled as an error, and no discount is applied." (Lowercase save10 is not an unknown code — §6.7 requires it to be treated as equivalent to SAVE10.)**

### Actual result
SAVE10 (all uppercase) is accepted and applies the discount.

save10 (all lowercase) is rejected as an unknown code, with an error message shown and no discount applied.

Mixed-case and whitespace-padded variants are similarly rejected.

The coupon matching is case-sensitive, so only the exact uppercase form from the §6.6 table works.

Justification: Direct §6.7 violation. Case-sensitive coupon matching means a user typing a lowercase or mixed-case code — which is natural, especially on mobile with auto-capitalisation or when pasting from a lowercase source — is told their valid code is unknown. It produces a false "unknown code" error (§6.8), it degrades trust in the coupon feature, and it is a one-line fix. Severity is Medium rather than High because it does not cause financial loss or data corruption; priority is High because it is a trivial fix and a clear, reproducible contract breach on a user-facing feature.


---

## BUG-037

**Title:** SAVE10 discount is not capped at ৳2,000 and exceeds the coupon table's cap

**Component:** Pricing / Coupon Cap Enforcement

**Severity:** Critical
**Priority:** High

### Steps to reproduce
1. Sign in and add products to the cart so the subtotal is large enough that 10% of it exceeds ৳2,000.
2. Navigate to cart.html.
3. Locate the coupon input field and apply the coupon SAVE10.
4. Observe the Discount line on the cart summary.
5. Remove the coupon or start a fresh cart, then apply SAVE10 again under a different cart state.
6. Observe the Discount line once more.


### Expected result
SAVE10 is defined as 10% off subtotal with a cap of ৳2,000. For any subtotal where 10% of the subtotal exceeds ৳2,000, the discount must be exactly ৳2,000.00. The cap must be respected regardless of cart size, and the discount line must display the capped value.
**Reference: SPEC §6.6 — coupon table: SAVE10 | 10% off subtotal | Cap ৳2,000 | Minimum order none | Valid until 31 Dec 2027.**
**Reference: SPEC §6.9 — "The discount applied must respect the coupon's cap."**
**Reference: SPEC §6.5 — "Discount is capped at the subtotal."**

### Actual result
After applying SAVE10, the Discount line shows a value far larger than ৳2,000 — many orders of magnitude above the cap. The discount is not capped at ৳2,000, and its magnitude is not a stable 10% of the subtotal across repeated applications.

Justification: Direct §6.9 and §6.6 violation. The discount is a subtracted term in the grand total calculation (§6.3), so an uncapped discount directly reduces the amount charged and can drive the grand total towards zero or negative (§6.5). It is a financial-loss defect and a release blocker.

---

## BUG-038

**Title:** VAT is not recalculated when the discount changes and is not 7.5% of the post-discount subtotal

**Component:** Pricing / VAT Recalculation

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Sign in and add products to the cart.
2. Navigate to cart.html.
3. Apply a coupon so a discount is applied, and note the VAT line.
4. Change the discount — for example, remove the coupon and apply it again, or apply a different coupon that produces a different discount amount.
5. Observe the VAT line again.
6. Independently compute 7.5% of (subtotal − discount) and compare it to the VAT shown on the page.


### Expected result
VAT must equal 7.5% of (subtotal − discount), rounded to 2 decimal places, and must change whenever the discount changes. If the discount changes, VAT must change in proportion to the new post-discount subtotal.
**Reference: SPEC §6.1 — "VAT is 7.5%, calculated on the subtotal after discount."**
**Reference: SPEC §6.3 — "Grand total = (subtotal − discount) + VAT + delivery."**
**Reference: SPEC §6.4 — "Every displayed money value is rounded to 2 decimal places."**

### Actual result
The discount changes between two consecutive renders of the same cart, but the VAT line remains identical in both cases. VAT does not recalculate when the discount changes, and the value shown is not 7.5% of the post-discount subtotal.

Justification: Direct §6.1 violation. VAT is a mandatory component of the grand total (§6.3) and feeds the amount payable at checkout (§7.9) and the amount recorded against the order (§8.2). A stale or incorrect VAT means a wrong charge to the customer and a wrong recorded order amount.

---

## BUG-039

**Title:** Grand total is not equal to (subtotal − discount) + VAT + delivery and is displayed as raw floating point output

**Component:** Pricing / Grand Total

**Severity:** High
**Priority:** High

### Steps to reproduce
1. Sign in and add products to the cart.
2. Navigate to cart.html and apply a coupon so the discount and VAT lines are populated.
3. Read the values shown for Subtotal, Discount, VAT (7.5%), Delivery, and Grand total.
4. Compute (subtotal − discount) + VAT + delivery using the exact values displayed on the page.
5. Compare the result with the Grand total shown on the page.
6. Inspect the Grand total's displayed string for formatting.


### Expected result
Grand total must equal (subtotal − discount) + VAT + delivery, exactly, using the values displayed on the page.

Grand total must be displayed with thousands separators and exactly two decimal places — never as a raw floating-point number with a long trailing decimal tail.
**Reference: SPEC §6.3 — "Grand total = (subtotal − discount) + VAT + delivery."**
**Reference: SPEC §6.4 — "Every displayed money value is rounded to 2 decimal places. Raw floating point output (e.g. 3899.9700000000003) is a defect."**
**Reference: SRS preamble — "All money is displayed as ৳ followed by the amount with thousands separators and exactly two decimal places (৳5,499.00), everywhere in the product, on every page."**

### Actual result
The Grand total shown on the page is not equal to (subtotal − discount) + VAT + delivery when computed with the displayed inputs. In addition, the Grand total is displayed as a raw floating-point value with an unrounded decimal tail rather than with two decimal places and thousands separators.

Justification: Direct §6.3 and §6.4 violation. The grand total is the amount charged at checkout (§7.9) and the amount recorded against the order (§8.2). A grand total that does not match its own inputs is a wrong charge; a raw floating-point display is the exact defect §6.4 names.



---
