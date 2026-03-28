document.addEventListener('DOMContentLoaded', () => {
    // Copy-to-clipboard on code blocks
    document.querySelectorAll('.docs-copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.closest('.docs-code-block').querySelector('code').textContent;
            navigator.clipboard.writeText(code);
            btn.textContent = 'Copied!';
            setTimeout(() => btn.textContent = 'Copy', 2000);
        });
    });

    // Scroll-based active sidebar link
    const sections = document.querySelectorAll('.docs-content section[id]');
    const links = document.querySelectorAll('.docs-sidebar a');

    function updateActive() {
        let current = '';
        sections.forEach(s => {
            if (window.scrollY >= s.offsetTop - 120) {
                current = s.id;
            }
        });
        links.forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === '#' + current);
        });
    }

    window.addEventListener('scroll', updateActive, { passive: true });
    updateActive();

    // === Copy as Prompt ===

    const prompts = {
        shopify: `Integrate Miro abandoned cart recovery into my Shopify store's checkout. Here's exactly what to do:

## What Miro does
Miro is an AI cart recovery service. When a customer starts checkout but doesn't finish, Miro captures their contact info and follows up with AI-powered calls/texts to recover the sale.

## My API key
My Miro API key is: YOUR_API_KEY
API endpoint: https://api.trymiro.com/capture

## What to implement

### 1. Add the capture snippet to checkout
In my Shopify theme, edit the checkout layout (or use a Script Tag via the Admin API). Add this script that fires when a customer enters their email or phone during checkout:

- Listen for \`focusout\` on email and phone input fields on the checkout page
- When a field loses focus and has a value, POST to \`https://api.trymiro.com/capture\` with:
  - \`checkout_token\`: a unique session token (generate once per session, store in sessionStorage)
  - \`email\`: the customer's email (if available)
  - \`phone\`: the customer's phone (if available)
  - \`cart_value\`: total cart value (pull from Shopify's \`{{ checkout.total_price | money_without_currency }}\` or JS cart API)
  - \`cart_items\`: array of \`{ name, qty, price }\` objects from the cart
- Include headers: \`Authorization: Bearer YOUR_API_KEY\` and \`Content-Type: application/json\`
- Deduplicate: don't re-send if the same data was already sent this session
- Fail silently (catch errors, don't break checkout)

### 2. Also set up the Shopify webhook (backup capture)
Use Shopify Admin → Settings → Notifications → Webhooks:
- Event: \`Checkout creation\`
- Format: JSON
- URL: \`https://api.trymiro.com/webhook\`
This ensures every checkout is captured even if the JS snippet misses it.

### 3. Where to add the code
- If using Shopify Plus: add the script to \`checkout.liquid\`
- If using standard Shopify: use the ScriptTag Admin API or add it to the \`Additional scripts\` box in Settings → Checkout
- Also add it to the cart page template (\`cart.liquid\` or \`main-cart.liquid\`) so we capture contact info as early as possible

### Important details
- The script should be lightweight and non-blocking — never break the checkout flow
- Use \`navigator.sendBeacon\` or async \`fetch\` so it doesn't slow page navigation
- Generate the checkout_token once with \`Math.random().toString(36).substr(2) + Date.now().toString(36)\` and store it in sessionStorage
- Pull cart data from Shopify's \`/cart.js\` API or Liquid variables

Please implement this fully and show me the exact code to add and where to add it.`,

        nextjs: `Integrate Miro abandoned cart recovery into my Next.js e-commerce app's checkout page. Here's exactly what to do:

## What Miro does
Miro is an AI cart recovery service. When a customer starts checkout but doesn't finish, Miro captures their contact info and follows up with AI-powered calls/texts to recover the sale.

## My API key
My Miro API key is: YOUR_API_KEY
API endpoint: https://api.trymiro.com/capture

## What to implement

### 1. Create a Miro capture utility
Create a utility file (e.g. \`lib/miro.ts\`) that:
- Generates a unique checkout session token (store in sessionStorage, create if missing)
- Exports a \`captureCheckout(data)\` function that POSTs to \`https://api.trymiro.com/capture\`
- Payload: \`{ checkout_token, email, phone, cart_value, cart_items }\`
- Headers: \`Authorization: Bearer YOUR_API_KEY\` and \`Content-Type: application/json\`
- Deduplicates — tracks what's been sent this session so identical data isn't re-sent
- Fails silently (try/catch, don't throw)

### 2. Create a React hook
Create \`hooks/useMiroCapture.ts\`:
- Returns a \`capture(data)\` function that calls the utility above
- Can be used in any checkout component

### 3. Wire it into the checkout form
In my checkout page component:
- When the email input loses focus (\`onBlur\`), call \`capture({ email })\`
- When the phone input loses focus, call \`capture({ phone })\`
- When the user reaches the payment step (or on a "Review order" page), call \`capture()\` with the full data: email, phone, cart_value, and cart_items from my cart state/context
- Cart items should be shaped as \`{ name: string, qty: number, price: number }[]\`

### 4. Optional: server-side capture route
Create an API route \`app/api/miro-capture/route.ts\` that:
- Accepts POST with the checkout data
- Forwards it to \`https://api.trymiro.com/capture\` with the API key server-side (keeps the key out of client bundles)
- Returns the response

If using this approach, the client utility should POST to \`/api/miro-capture\` instead of directly to Miro.

### Important details
- Keep the API key out of client-side code if possible — use the server-side route approach
- The capture calls must be non-blocking — never slow down or break the checkout UX
- TypeScript types for the capture payload and response would be great
- Don't modify any existing cart/checkout logic — just add the capture calls alongside it

Please implement this fully with all the files and show me exactly where to integrate the hook calls in my checkout components.`,

        woocommerce: `Integrate Miro abandoned cart recovery into my WooCommerce checkout page. Here's exactly what to do:

## What Miro does
Miro is an AI cart recovery service. When a customer starts checkout but doesn't finish, Miro captures their contact info and follows up with AI-powered calls/texts to recover the sale.

## My API key
My Miro API key is: YOUR_API_KEY
API endpoint: https://api.trymiro.com/capture

## What to implement

### 1. Create a small plugin (or add to functions.php)
Create a lightweight WordPress plugin or add code to my theme's \`functions.php\` that:

#### a. Enqueue the capture script on the checkout page
- Hook into \`wp_enqueue_scripts\` and only load on \`is_checkout()\`
- Pass cart data to JS using \`wp_localize_script\` — include: cart total, and cart items as an array of \`{ name, qty, price }\`

#### b. The JavaScript capture script should:
- Generate a unique checkout session token (sessionStorage, create if missing)
- Listen for \`focusout\` on \`#billing_email\` and \`#billing_phone\` fields
- When a field loses focus and has a value, POST to \`https://api.trymiro.com/capture\` with:
  - \`checkout_token\`: the session token
  - \`email\`: value of \`#billing_email\` (if available)
  - \`phone\`: value of \`#billing_phone\` (if available)
  - \`cart_value\`: total from the localized cart data
  - \`cart_items\`: items from the localized cart data
- Include headers: \`Authorization: Bearer YOUR_API_KEY\` and \`Content-Type: application/json\`
- Deduplicate: don't re-send if the same data was already sent
- Fail silently

### 2. Alternative: server-side capture via WooCommerce hooks
Also hook into \`woocommerce_checkout_update_order_review\` or \`woocommerce_after_checkout_validation\` to capture checkout data server-side via PHP \`wp_remote_post\` to the Miro API as a fallback.

### Important details
- The JS must not break WooCommerce's AJAX checkout flow
- Use \`fetch\` with async/non-blocking calls
- WooCommerce field IDs: \`#billing_email\`, \`#billing_phone\`, \`#billing_first_name\`, \`#billing_last_name\`
- Cart data is available via \`WC()->cart->get_cart()\` in PHP
- Keep it compatible with popular WooCommerce checkout plugins (CheckoutWC, Fluid Checkout, etc.) by also listening for generic \`input[type="email"]\` and \`input[type="tel"]\` as fallbacks

Please implement this fully as a self-contained WordPress plugin file I can drop into \`wp-content/plugins/\`.`,

        html: `Integrate Miro abandoned cart recovery into my website's checkout page. Here's exactly what to do:

## What Miro does
Miro is an AI cart recovery service. When a customer starts checkout but doesn't finish, Miro captures their contact info and follows up with AI-powered calls/texts to recover the sale.

## My API key
My Miro API key is: YOUR_API_KEY
API endpoint: https://api.trymiro.com/capture

## What to implement

Add a script to my checkout page (just before \`</body>\`) that does the following:

### 1. Generate a checkout session token
- On page load, check \`sessionStorage\` for \`miro_ck\`
- If not set, generate one: \`Math.random().toString(36).substr(2) + Date.now().toString(36)\`
- Store it in sessionStorage

### 2. Auto-capture on field blur
- Listen for \`focusout\` events on the document
- When an \`input[type="email"]\` or \`input[name="email"]\` loses focus with a value, send a capture with the email
- When an \`input[type="tel"]\` or \`input[name="phone"]\` loses focus with a value, send a capture with the phone

### 3. The capture POST request
POST to \`https://api.trymiro.com/capture\` with:
\`\`\`json
{
  "checkout_token": "<session token>",
  "email": "customer@example.com",
  "phone": "+15551234567",
  "cart_value": 89.99,
  "cart_items": [{ "name": "Product", "qty": 1, "price": 89.99 }]
}
\`\`\`
Headers: \`Authorization: Bearer YOUR_API_KEY\` and \`Content-Type: application/json\`

### 4. Expose a global function
Expose \`window.miroCapture(data)\` so I can also call it manually to pass cart_value and cart_items when I have them available (e.g. when the cart updates or the user reaches the payment step).

### 5. Rules
- Deduplicate: track what's been sent, don't re-send identical payloads
- Fail silently: wrap in try/catch, never break checkout
- Non-blocking: use async fetch
- Lightweight: no dependencies, plain vanilla JS, wrapped in an IIFE

Please give me the complete \`<script>\` tag I can paste into my checkout page. Also show me an example of how to call \`window.miroCapture()\` manually with cart data.`
    };

    let currentPlatform = 'shopify';
    const copyBtn = document.getElementById('prompt-copy-btn');
    const platformBtns = document.querySelectorAll('.prompt-platform-btn');

    platformBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            platformBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPlatform = btn.dataset.platform;
        });
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(prompts[currentPlatform]);
        copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3 3 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!';
        setTimeout(() => {
            copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M3 11V3a1.5 1.5 0 011.5-1.5H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg> Copy Prompt';
        }, 2000);
    });
});
