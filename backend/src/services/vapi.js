function buildCartSummary(cartItems) {
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return "some items";
  }
  return cartItems
    .map((item) => {
      const qty = item.qty || 1;
      const price = item.price ? `$${Number(item.price).toFixed(2)}` : "";
      return `${qty}x ${item.name}${price ? ` at ${price}` : ""}`;
    })
    .join(", ");
}

function buildCartItemsDetail(cartItems) {
  if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    return "[]";
  }
  return JSON.stringify(
    cartItems.map((item) => ({
      name: item.name,
      qty: item.qty || 1,
      price: Number(item.price) || 0,
      line_total: ((item.qty || 1) * (Number(item.price) || 0)).toFixed(2),
    }))
  );
}

async function triggerCall(checkout) {
  const { VAPI_API_KEY, VAPI_ASSISTANT_ID, VAPI_PHONE_NUMBER_ID } = process.env;

  const cartValue = Number(checkout.cart_value) || 0;
  const discountPercent = 20;
  const discountedValue = (cartValue * (1 - discountPercent / 100)).toFixed(2);

  const items =
    typeof checkout.cart_items === "string"
      ? JSON.parse(checkout.cart_items)
      : checkout.cart_items || [];

  const cartSummary = buildCartSummary(items);

  const response = await fetch("https://api.vapi.ai/call", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phoneNumberId: VAPI_PHONE_NUMBER_ID,
      assistantId: VAPI_ASSISTANT_ID,
      customer: { number: checkout.phone },
      assistantOverrides: {
        variableValues: {
          customer_name: checkout.customer_name || "there",
          cart_value: `$${cartValue.toFixed(2)}`,
          cart_items: cartSummary,
          cart_items_detail: buildCartItemsDetail(items),
          customer_email: checkout.email || "",
          customer_phone: checkout.phone || "",
          discount_percent: String(discountPercent),
          discounted_value: `$${discountedValue}`,
          store_name: checkout.shop || "our store",
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`VAPI call failed (${response.status}): ${text}`);
  }

  return response.json();
}

module.exports = { triggerCall };
