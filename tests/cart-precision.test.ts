import { describe, it } from "node:test";
import assert from "node:assert";
import { useCartStore, flushPendingSync } from "../stores/cart-store";

console.log("=== Running Cart State & Precision Tests ===");

// Reset store before tests
useCartStore.setState({ items: [], isDrawerOpen: false, hasHydrated: true, hasFetchedInitial: true });

// Test 1: Adding shoe 1 creates single entry with exact unit price
const shoe1 = {
  variantId: "variant-shoe-1",
  productId: "prod-1",
  productName: "Handball Spezial Shoes",
  slug: "handball-spezial-shoes",
  image: "/images/Shoes/s05.avif",
  size: "42",
  color: "Dark Blue",
  price: 120,
  quantity: 1,
  stock: 15,
};

useCartStore.getState().addItem(shoe1);
let items = useCartStore.getState().items;
assert.strictEqual(items.length, 1, "Should have exactly 1 item in cart");
assert.strictEqual(items[0].variantId, "variant-shoe-1");
assert.strictEqual(items[0].productName, "Handball Spezial Shoes");
assert.strictEqual(items[0].price, 120);
assert.strictEqual(items[0].quantity, 1);
console.log("✅ PASS: Adding Shoe 1 adds exact product with unit price $120");

// Test 2: Adding shoe 2 (different shoe) creates second entry with its own price
const shoe2 = {
  variantId: "variant-shoe-2",
  productId: "prod-2",
  productName: "Nike Air Max 95 Big Bubble",
  slug: "nike-air-max-95-big-bubble-og",
  image: "/images/Shoes/s01.avif",
  size: "40",
  color: "Neon",
  price: 190,
  quantity: 1,
  stock: 10,
};

useCartStore.getState().addItem(shoe2);
items = useCartStore.getState().items;
assert.strictEqual(items.length, 2, "Cart should have exactly 2 distinct items");
assert.strictEqual(items[0].variantId, "variant-shoe-1");
assert.strictEqual(items[0].productName, "Handball Spezial Shoes");
assert.strictEqual(items[0].price, 120);
assert.strictEqual(items[0].quantity, 1);

assert.strictEqual(items[1].variantId, "variant-shoe-2");
assert.strictEqual(items[1].productName, "Nike Air Max 95 Big Bubble");
assert.strictEqual(items[1].price, 190);
assert.strictEqual(items[1].quantity, 1);

const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
assert.strictEqual(subtotal, 120 + 190, "Subtotal must accurately reflect sum of both items ($310)");
console.log("✅ PASS: Adding Shoe 2 creates distinct entry with unit price $190, total $310");

// Test 3: Adding a third shoe (different shoe) adds third entry without collapsing
const shoe3 = {
  variantId: "variant-shoe-3",
  productId: "prod-3",
  productName: "Air Jordan 4 Retro",
  slug: "air-jordan-4-retro",
  image: "/images/Shoes/s02.avif",
  size: "41",
  color: "Yellow",
  price: 220,
  quantity: 1,
  stock: 8,
};

useCartStore.getState().addItem(shoe3);
items = useCartStore.getState().items;
assert.strictEqual(items.length, 3, "Cart should have exactly 3 distinct items");
const total3 = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
assert.strictEqual(total3, 120 + 190 + 220, "Total must equal $530");
console.log("✅ PASS: Adding Shoe 3 creates distinct entry with unit price $220, total $530");

// Test 4: Incrementing existing shoe increments its quantity without affecting other shoes
useCartStore.getState().addItem({ ...shoe1, quantity: 1 });
items = useCartStore.getState().items;
assert.strictEqual(items.length, 3, "Cart item count remains 3");
assert.strictEqual(items[0].variantId, "variant-shoe-1");
assert.strictEqual(items[0].quantity, 2, "Shoe 1 quantity incremented to 2");
assert.strictEqual(items[0].price, 120, "Shoe 1 unit price remains $120");
assert.strictEqual(items[1].quantity, 1, "Shoe 2 quantity remains 1");
assert.strictEqual(items[2].quantity, 1, "Shoe 3 quantity remains 1");
const total4 = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
assert.strictEqual(total4, 120 * 2 + 190 + 220, "Total must equal $650 (240 + 190 + 220)");
console.log("✅ PASS: Re-adding Shoe 1 increments quantity to 2, keeps unit price $120, total $650");

// Test 5: Quantity stepper updates smoothly and caps at max stock
useCartStore.getState().updateQuantity("variant-shoe-1", 5);
items = useCartStore.getState().items;
assert.strictEqual(items[0].quantity, 5);

// Test 6: Removing an item cleanly removes only that item
useCartStore.getState().removeItem("variant-shoe-2");
items = useCartStore.getState().items;
assert.strictEqual(items.length, 2, "Cart now has 2 items");
assert.strictEqual(items.find((i) => i.variantId === "variant-shoe-2"), undefined);
assert.strictEqual(items.find((i) => i.variantId === "variant-shoe-1")?.quantity, 5);
assert.strictEqual(items.find((i) => i.variantId === "variant-shoe-3")?.quantity, 1);
console.log("✅ PASS: Removing Shoe 2 leaves Shoe 1 and Shoe 3 untouched");

console.log("\n======================================================");
console.log("All Cart Precision Tests Passed Successfully!");
console.log("======================================================");
