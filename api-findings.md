**API Findings — ShopLite mock API (§10)**

**Base URL**: http://127.0.0.1:4000

**Tool used**: curl, run against a local node mock-api/server.js (data resets on restart).





**F-01 — Login response includes the user's plaintext password**



**Clause**: §10.3 ("A success response never contains the password")

**Severity**: Critical — the API hands back every user's real password on every successful login.



**Request**:



curl -s -X POST http://127.0.0.1:4000/api/login \\

&#x20; -H "Content-Type: application/json" \\

&#x20; -d "{\\"email\\":\\"qa@shoplite.test\\",\\"password\\":\\"Passw0rd!23\\"}"





**Response (200)**:



{

&#x20; "ok": true,

&#x20; "token": "eyJzdWIiOiJ1MSIs...",

&#x20; "user": {

&#x20;   "id": "u1",

&#x20;   "email": "qa@shoplite.test",

&#x20;   "password": "Passw0rd!23",

&#x20;   "name": "QA Tester",

&#x20;   "role": "customer"

&#x20; }

}





Same thing happens for the admin account — logging in as admin@shoplite.test returns "password": "Admin@2024" in plain text.



**Impact**: Anyone who can see a login response — browser devtools, a proxy, a log — now has that account's real password, not just a session token.









**F-02 — Session tokens are not signed and can be edited by the client**



**Clause**: §10.4 ("Tokens must be unguessable and tamper-evident")

**Severity**: Critical — this breaks authentication entirely.



The token is just base64 of a plain JSON object, with no signature:





echo "eyJzdWIiOiJ1MSIsImVtYWlsIjoicWFAc2hvcGxpdGUudGVzdCIsInJvbGUiOiJjdXN0b21lciIsImV4cCI6MTc5MjI1Nzc0MjM1OH0=" | base64 -d







{"sub":"u1","email":"qa@shoplite.test","role":"customer","exp":1792257742358}





I changed "role":"customer" to "role":"admin" in that decoded text and re-encoded it with base64, then sent it as my bearer token:





curl -s -i http://127.0.0.1:4000/api/admin/orders \\

&#x20; -H "Authorization: Bearer <tampered token>"







**Response**: HTTP/1.1 200 OK, with the full admin order list (see F-03 for what's in it).



**Impact**: Any logged-in customer can grant themselves the admin role just by editing their own token. There is no server-side check that the token hasn't been altered, which means §10.4, §10.7, and §9.1 are all broken by the same bug.









**F-03 — Orders are readable by anyone, not just their owner**



**Clause**: §10.6 ("GET /api/orders/:id returns an order only to the user who owns it; otherwise 403")

**Severity**: Critical — full card numbers and CVVs for strangers' orders are exposed.







**Request (no token at all)**:





curl -s http://127.0.0.1:4000/api/orders/ORD-1002





**Response (200 — order belongs to u2, a different customer):**



{

&#x20; "ok": true,

&#x20; "order": {

&#x20;   "id": "ORD-1002",

&#x20;   "userId": "u2",

&#x20;   "amount": 45807.5,

&#x20;   "card": "5555555555554444",

&#x20;   "cvv": "901",

&#x20;   "address": "7 Lake Circus, Kalabagan, Dhaka",

&#x20;   "mobile": "01822334455",

&#x20;   "customerEmail": "rumi@shoplite.test",

&#x20;   "customerName": "Rumi Ahmed"

&#x20; }

}





There was no authentication check at all — I didn't even need a token, tampered or otherwise. Every order ID I guessed (ORD-1001, ORD-1003, etc.) returned the same way, with the full card number and CVV included, not masked.





**Impact**: Order IDs are sequential (ORD-1001, ORD-1002...), so anyone can page through them and pull every customer's name, address, phone number, full card number and CVV. This is the single worst finding in the report — it's a direct, no-auth-required card data leak. It also breaks §7.11 and §9.2, which say only the last 4 digits may ever be shown and CVV must never be stored or shown.









**F-04 — /api/admin/\* does correctly require the real admin role**



**Clause**: §10.7

**Severity**: N/A (this one passed) — noted for completeness.





curl -s -i http://127.0.0.1:4000/api/admin/orders                               # no token  -> 403

curl -s -i http://127.0.0.1:4000/api/admin/orders -H "Authorization: Bearer <real customer token>"  # -> 403





Both returned 403 {"ok": false, "message": "Administrator access is required."}. The check itself is fine — the problem is entirely that the token's role field isn't protected from editing (see F-02), which bypasses this check completely.











**F-05 — limit on /api/products accepts invalid values instead of rejecting them**



**Clause**: §10.5 ("limit must be a positive integer within a documented maximum; anything else returns 400")

**Severity**: Medium.





curl -s -o /dev/null -w "%{http\_code}" "http://127.0.0.1:4000/api/products?limit=-5"     # 200

curl -s -o /dev/null -w "%{http\_code}" "http://127.0.0.1:4000/api/products?limit=abc"    # 200

curl -s -o /dev/null -w "%{http\_code}" "http://127.0.0.1:4000/api/products?limit=99999"  # 200





None of these returned 400. limit=-5 silently came back as 3 results, limit=abc came back as 0 results, and limit=99999 just returned all 8 products. The spec says any of these should be a 400.





**Impact**: Low on its own, but it shows input isn't validated before use, which is the same class of bug as F-06 and F-07 below.









**F-06 — /api/cart accepts a client-supplied price and ignores stock/qty rules**



**Clause**: §10.8 ("Price is resolved server-side... a client-supplied price is ignored. qty must be a positive integer within stock")

**Severity**: Critical — this lets a customer set their own price.





**Request**:



curl -s -X POST http://127.0.0.1:4000/api/cart \\

&#x20; -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \\

&#x20; -d "{\\"productId\\":\\"p3\\",\\"qty\\":1,\\"price\\":1}"





**Response (200)**:



{"ok": true, "line": {"productId": "p3", "name": "Vertex Air 13", "qty": 1, "unitPrice": 1, "lineTotal": 1}}





The real price of Vertex Air 13 is ৳99,900 — the API accepted my price of ৳1 and used it.



Two more in the same call:



qty:5 on p3, a product with 0 stock, was accepted and added ("qty": 5" in the cart) — no stock check at all.



qty:-3 on p1 was accepted too, producing a line total of -254997.





**Impact**: Combined with F-03's missing auth, this is a direct path to checking out for ৳1, or for a negative amount. This is the most serious pricing bug possible under §6/§10.8.











**F-07 — Search text is reflected back unescaped**

**Clause**: §10.5 ("No input may reach the response as markup")

**Severity**: Low on the API itself, but a real risk if a frontend trusts this field.





curl -s "http://127.0.0.1:4000/api/products?q=<script>alert(1)</script>"





{

&#x20; "heading": "<b>0</b> results for <script>alert(1)</script>",

&#x20; "query": "<script>alert(1)</script>",

&#x20; "recentSearches": \["<script>alert(1)</script>"]

}





The API returns the raw <script> tag unescaped in both heading and recentSearches, and stores it. This is a JSON API, so it isn't executed here — but if any page (the catalogue page, or an admin "recent searches" view) renders heading or recentSearches as HTML without escaping it, this becomes a stored XSS. That matches §11.5 and the catalogue's own §4.4 rule.









**F-08 — Login rate limiting isn't enforced**

**Clause**: §10.10 ("POST /api/login is rate limited to 10 attempts per minute per IP")

**Severity**: Medium.



I sent 11 failed login attempts back to back from the same IP and logged each status code:





attempt 1  -> 404

attempt 2  -> 404

...

attempt 11 -> 404





(404 here because each attempt used a different unregistered email — the point is every one of the 11 went through normally; a 429 never appeared.) I didn't see any 429 response at all, even past the 10th attempt.



**Impact**: Nothing stops an automated password-guessing run against /api/login.









**F-09 — Access-Control-Allow-Origin: \* is sent together with credentials allowed**

**Clause**: §10.11 ("Access-Control-Allow-Origin is restricted to known origins; it is never \* in combination with credentials")

**Severity**: High.





Every response from the API, including one sent with Origin: https://evil-example.com, carries:





Access-Control-Allow-Origin: \*

Access-Control-Allow-Credentials: true





This is exactly the forbidden combination the spec names. \* is not a restriction to known origins at all — it's every origin.





**Impact**: In a real browser, this combination tells any website that it's allowed to make authenticated requests to this API on the visitor's behalf. That's a direct cross-origin credential-theft setup.









**F-10 — Server errors leak a full stack trace and file path**



**Clause**: §10.9 ("Stack traces, file paths, and runtime versions must never be exposed")

**Severity**: Medium.



Sending deliberately broken JSON to /api/login:





curl -s -X POST http://127.0.0.1:4000/api/login \\

&#x20; -H "Content-Type: application/json" -d "{bad json"







**Response (500)**:





{

&#x20; "ok": false,

&#x20; "message": "Expected property name or '}' in JSON at position 1 (line 1 column 2)",

&#x20; "stack": "SyntaxError: ...\\n    at login (/home/claude/ShopLite/mock-api/server.js:133:21)\\n    at async Server.<anonymous> (/home/claude/ShopLite/mock-api/server.js:311:67)"

}







That gives the exact source file path and line numbers, which also appeared in /api/health as "node": "v22.22.2", "entrypoint": "/home/claude/ShopLite/mock-api/server.js" — two more things the spec says must never be exposed.



**Impact**: On its own this is a disclosure issue, not a break-in. It's useful information for someone building an attack, though — it tells them the exact runtime version and the code's layout on disk.









**F-11 — Status codes that passed**



**Clause**: §10.2, §10.3, §10.6 (the parts that did work)

For completeness, a few checks came back correct:



Wrong password → 401 with {"message": "Incorrect password for this account."}



Unknown email → 404 with {"message": "No account is registered with that email."}



Unknown route (/api/does-not-exist) → 404 with a safe message, no stack trace



/api/admin/orders with no token, or with an honest (non-tampered) customer token → 403 both times



**This is itself a finding against §10.3 / §2.5**: the wrong-password case and the unknown-email case return different status codes (401 vs 404) and different messages. The spec requires the exact same neutral response either way, so an attacker can already tell which emails are registered just from the HTTP status code — before ever looking at the message text. This is the API-level version of BUG-015 found on the login page.

