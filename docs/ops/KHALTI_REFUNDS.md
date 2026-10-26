# Operations Runbook: Khalti Late-Payment & Out-of-Stock Refunds

## Context & Limitation
Khalti ePayment v2 currently does **not** expose a public programmatic refund endpoint. Consequently, automated API refunds cannot be triggered by the application server. Any order paid via Khalti that cannot be fulfilled (e.g. late payment on an expired order where stock was taken by another customer, or payment amount mismatch) is automatically flagged with status `MANUAL_REVIEW` and paymentStatus `PAID`.

---

## 1. Trigger Conditions
An order enters `MANUAL_REVIEW` requiring a manual Khalti refund in the following scenarios:
1. **Late Payment on Expired Order (Out of Stock)**:
   - A customer kept the Khalti checkout modal open past the 30-minute reservation TTL.
   - The cleanup cron cancelled the order and returned stock to inventory.
   - Another customer purchased the inventory.
   - The late customer completed payment; callback verified funds, attempted stock re-reservation, but inventory was depleted.
2. **Khalti Payment Amount Mismatch**:
   - The paisa amount verified via the Khalti lookup API differs from the server-calculated order total.
3. **Customer Cancellation / Return**:
   - Customer requests an order cancellation or return after paying via Khalti.

---

## 2. Step-by-Step Refund Execution

### Step 1: Open the Khalti Merchant Dashboard
1. Navigate to:
   - **Production**: [https://admin.khalti.com](https://admin.khalti.com)
   - **Sandbox / Test**: [https://test-admin.khalti.com](https://test-admin.khalti.com)
2. Log in using authorized merchant credentials.

### Step 2: Locate the Transaction
1. In the left navigation menu, go to **Transactions** -> **Payments**.
2. Search using either:
   - The **Transaction ID** (`order.transactionId`) from the order details page in Admin.
   - The **Payment Index (`pidx`)** (`order.khaltiPidx`).
   - The customer's mobile number or email address.
3. Verify that:
   - The transaction status is **Completed**.
   - The amount matches `order.total` (in NPR).

### Step 3: Issue the Refund in Khalti
1. Click on the transaction to view the transaction details drawer.
2. Click **Refund** / **Initiate Refund**.
3. Confirm the refund amount and enter the reason:
   - *Example*: `"Late payment - items out of stock (Order #<orderNumber>)"`.
4. Submit the refund. Khalti will instantly credit the amount back to the customer's Khalti wallet.
5. Copy the generated **Khalti Refund Reference / ID**.

### Step 4: Record in Store Admin Portal
1. Navigate to `/admin/orders/<orderId>` on the store admin portal.
2. Under **Order Actions** -> **Add Note**:
   - Post an audit note:
     `"Khalti refund issued manually via Khalti Merchant Portal. Refund Reference: <KHALTI_REFUND_ID>. Amount: NPR <AMOUNT>."`
3. Update the order status to `CANCELLED`.
   - *Note*: If stock was not reserved (Case b), cancelling from `MANUAL_REVIEW` will not alter inventory counts.
4. Notify the customer via email or SMS with the refund confirmation and Khalti reference number.
