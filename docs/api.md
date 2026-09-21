# API & Server Actions Contract Reference

## 1. Storefront & Customer Endpoints

### Authentication
* `POST /api/auth/register`: Register new customer account and auto-link prior guest orders.
* `POST /api/auth/forgot-password`: Generate 1-hour secure password reset token.
* `POST /api/auth/reset-password`: Validate token and update account password.
* `POST /api/auth/[...nextauth]`: Auth.js session handling and credentials login.

### Checkout & Payments
* `POST /api/checkout`: Cash on Delivery (COD) order creation with Nepal Rs. 50,000 cap.
* `POST /api/checkout/stripe/create-intent`: Validates server pricing, reserves inventory, and generates Stripe `client_secret`.
* `POST /api/checkout/khalti/initiate`: Initializes Khalti ePayment gateway redirect URL for Nepal orders.
* `GET /api/checkout/khalti/callback`: Server-to-server Khalti verification and order finalization.
* `POST /api/webhooks/stripe`: Stripe webhook listener processing `payment_intent.succeeded` and `payment_intent.payment_failed`.

### Cart & Wishlist
* `GET /api/cart`: Fetch authenticated user cart items.
* `POST /api/cart`: Add or update variant in user cart.
* `POST /api/cart/merge`: Synchronize anonymous client cart with authenticated database cart on login.
* `GET /api/wishlist`: Fetch user wishlist.
* `POST /api/wishlist`: Toggle variant/product in user wishlist.

### Orders & Tracking
* `GET /api/orders/track`: Public tracking endpoint requiring `orderNumber` and verified `email`.
* `GET /api/me/orders`: Customer account order history.
* `GET /api/me/addresses`: Customer saved address book.

### Coupons
* `POST /api/coupons/validate`: Validate code, minimum subtotal, expiry, and return computed discount.

---

## 2. Admin Operations & Server Actions

* `updateOrderStatus(orderId, status, note)`: Update order status (`CONFIRMED`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`).
* `refundStripeOrder(orderId, reason)`: Calls Stripe Refunds API, updates order to `REFUNDED` / `CANCELLED`, restores stock, and logs audit record.
* `updateVariantStock(variantId, newStock)`: Instant inline stock adjustment with admin audit trail.
* `deleteReview(reviewId)`: Delete customer review from catalog.
* `GET /api/cron/cleanup-expired-orders`: Cron job releasing uncaptured inventory holds older than 30 minutes.
