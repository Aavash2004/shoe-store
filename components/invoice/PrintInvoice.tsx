import { formatCurrency } from "@/lib/constants/currencies";
import { getSafeImageUrl } from "@/lib/utils";

export type InvoiceOrder = {
  id: string;
  orderNumber: string;
  createdAt: string | Date;
  currency?: string | null;
  subtotal?: number | null;
  shipping?: number | null;
  discount?: number | null;
  tax?: number | null;
  total: number;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  stripePaymentIntentId?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  address?: {
    fullName?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  items: Array<{
    id?: string;
    productName: string;
    quantity: number;
    price: number;
    size?: string | null;
    color?: string | null;
    image?: string | null;
  }>;
};

interface PrintInvoiceProps {
  order: InvoiceOrder;
  className?: string;
}

export function PrintInvoice({ order, className = "" }: PrintInvoiceProps) {
  const currency = order.currency || "USD";
  const dateStr = new Date(order.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const customerName =
    order.address?.fullName ||
    order.user?.name ||
    order.guestName ||
    order.user?.email ||
    "Valued Customer";

  const customerPhone = order.address?.phone || "";

  const addressLines = [
    order.address?.addressLine1,
    order.address?.addressLine2,
    [order.address?.city, order.address?.state, order.address?.postalCode]
      .filter(Boolean)
      .join(", "),
    order.address?.country,
  ]
    .filter(Boolean)
    .join(", ");

  const items = order.items || [];
  const calculatedSubtotal =
    order.subtotal !== undefined && order.subtotal !== null
      ? Number(order.subtotal)
      : items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);

  const discount = order.discount ? Number(order.discount) : 0;

  // Tax calculation & display:
  // - If order.tax has an explicit value > 0, display "Tax (13%)".
  // - If currency is NPR (where 13% VAT is included in domestic retail price),
  //   calculate the 13% VAT portion and display "Tax (13% VAT Included)".
  // - If tax is $0.00 / 0, display "Tax (0%)" so it never shows "Tax (13%)" alongside $0.00.
  const rawTax =
    order.tax !== undefined && order.tax !== null ? Number(order.tax) : null;

  let taxLabel = "Tax (13%)";
  let taxAmount = 0;

  if (rawTax !== null && rawTax > 0) {
    taxAmount = rawTax;
    taxLabel = "Tax (13%)";
  } else if (currency === "NPR") {
    taxAmount = Math.round(calculatedSubtotal - calculatedSubtotal / 1.13);
    taxLabel = "Tax (13% VAT Included)";
  } else {
    taxAmount = 0;
    taxLabel = "Tax (0%)";
  }

  const total =
    Number(order.total) ||
    Math.max(
      0,
      calculatedSubtotal - discount + (currency === "NPR" ? 0 : taxAmount)
    );

  const isStripe =
    order.paymentMethod === "STRIPE" || order.paymentMethod === "CARD";
  const isKhalti = order.paymentMethod === "KHALTI";
  const isCod = order.paymentMethod === "COD";
  const isBankTransfer =
    order.paymentMethod === "BANK_TRANSFER" ||
    order.paymentMethod === "WIRE" ||
    order.paymentMethod === "BANK";

  const paymentMethodLabel = (() => {
    switch (order.paymentMethod) {
      case "STRIPE":
      case "CARD":
        return "Credit / Debit Card (Stripe)";
      case "KHALTI":
        return "Khalti Digital Wallet";
      case "COD":
        return "Cash on Delivery (COD)";
      case "BANK_TRANSFER":
      case "WIRE":
      case "BANK":
        return "Bank Transfer";
      default:
        return order.paymentMethod || "Direct Payment";
    }
  })();

  return (
    <div
      className={`print-invoice-sheet hidden print:block bg-[#FAF8F5] text-stone-900 font-sans p-8 sm:p-10 mx-auto w-full max-w-full box-border leading-normal ${className}`}
      style={{
        backgroundColor: "#FAF8F5",
        color: "#1c1917",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* ── TOP HEADER: Logo & Invoice Meta ── */}
      <div className="flex items-start justify-between pb-8">
        <div>
          {/* Geometric Bold ABXV Logo */}
          <div className="flex items-center tracking-tighter">
            <span className="text-5xl sm:text-6xl font-black tracking-[-0.06em] text-black font-sans leading-none">
              <span className="inline-block transform -skew-x-6">Λ</span>BXV
            </span>
          </div>
          <p className="mt-3 text-[11px] font-bold tracking-[0.35em] text-stone-600 uppercase">
            SHOES &nbsp;/&nbsp; STYLE &nbsp;/&nbsp; YOU
          </p>
        </div>

        <div className="text-right">
          <h1 className="text-xl sm:text-2xl font-black tracking-[0.2em] text-black uppercase">
            INVOICE
          </h1>
          <p className="mt-2 text-xs font-medium text-stone-700">
            Invoice No.{" "}
            <span className="font-semibold text-black">{order.orderNumber}</span>
          </p>
          <p className="mt-0.5 text-xs font-medium text-stone-700">
            Date <span className="font-semibold text-black">{dateStr}</span>
          </p>
        </div>
      </div>

      {/* Thin Horizontal Divider */}
      <div className="w-full border-t border-stone-800" />

      {/* ── BILLED TO SECTION ── */}
      <div className="py-6">
        <p className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-stone-900 mb-2">
          BILLED TO:
        </p>
        <p className="text-base font-bold text-black">{customerName}</p>
        {customerPhone ? (
          <p className="text-xs text-stone-700 mt-0.5 font-medium">{customerPhone}</p>
        ) : null}
        {addressLines ? (
          <p className="text-xs text-stone-700 mt-0.5 font-medium max-w-md">
            {addressLines}
          </p>
        ) : (
          <p className="text-xs text-stone-500 mt-0.5">Address on file</p>
        )}
      </div>

      {/* Thin Horizontal Divider */}
      <div className="w-full border-t border-stone-800" />

      {/* ── ITEMS TABLE ── */}
      <div className="pt-4 pb-2">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-stone-900 border-b border-stone-800 pb-3">
              <th className="pb-3 text-left">DESCRIPTION</th>
              <th className="pb-3 text-center w-16">QTY</th>
              <th className="pb-3 text-right w-28">UNIT PRICE</th>
              <th className="pb-3 text-right w-28">AMOUNT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-300">
            {items.map((item, idx) => {
              const itemTotal = Number(item.price) * item.quantity;
              const safeImg = item.image ? getSafeImageUrl(item.image) : "";
              const hasValidImage =
                Boolean(safeImg) && safeImg !== "/placeholder-shoe.png";

              return (
                <tr key={item.id || idx} className="py-4">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-4">
                      {hasValidImage ? (
                        <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-white">
                          {/* Standard eager img tag guarantees image loads immediately for print preview */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={safeImg}
                            alt={item.productName}
                            className="h-full w-full object-cover object-center"
                            loading="eager"
                            crossOrigin="anonymous"
                          />
                        </div>
                      ) : null}
                      <div>
                        <p className="font-bold text-sm text-black">
                          {item.productName}
                        </p>
                        <p className="text-xs text-stone-600 mt-0.5 font-medium">
                          {item.size && <span>Size: {item.size}</span>}
                          {item.size && item.color && (
                            <span className="mx-2 text-stone-400">|</span>
                          )}
                          {item.color && <span>Color: {item.color}</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-center text-sm font-semibold text-stone-900">
                    {item.quantity}
                  </td>
                  <td className="py-4 text-right text-sm font-medium text-stone-900">
                    {formatCurrency(Number(item.price), currency)}
                  </td>
                  <td className="py-4 text-right text-sm font-semibold text-black">
                    {formatCurrency(itemTotal, currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── TOTALS BREAKDOWN ── */}
      <div className="flex justify-end pt-2 pb-6">
        <div className="w-64 space-y-2 text-xs">
          <div className="flex justify-between text-stone-700 font-medium">
            <span>Subtotal</span>
            <span className="font-semibold text-black">
              {formatCurrency(calculatedSubtotal, currency)}
            </span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-stone-700 font-medium">
              <span>Discount</span>
              <span className="font-semibold text-emerald-700">
                -{formatCurrency(discount, currency)}
              </span>
            </div>
          )}
          <div className="flex justify-between text-stone-700 font-medium">
            <span>{taxLabel}</span>
            <span className="font-semibold text-black">
              {formatCurrency(taxAmount, currency)}
            </span>
          </div>

          <div className="border-t-2 border-stone-900 pt-2.5 mt-2 flex justify-between items-baseline">
            <span className="text-base font-bold text-black uppercase tracking-wider">
              Total
            </span>
            <span className="text-xl font-black text-black tracking-tight">
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Full Width Horizontal Divider */}
      <div className="w-full border-t border-stone-800" />

      {/* ── BOTTOM TWO COLUMNS: Payment & Merchant Info ── */}
      <div className="grid grid-cols-2 gap-8 py-6 text-xs text-stone-800">
        {/* Left Column: Payment Information */}
        <div className="space-y-1.5 pr-4 border-r border-stone-300">
          <p className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-stone-900 mb-2.5">
            PAYMENT INFORMATION
          </p>

          <p>
            <span className="font-semibold text-black">Payment Method:</span>{" "}
            {paymentMethodLabel}
          </p>

          {isStripe ? (
            <>
              <p>
                <span className="font-semibold text-black">Payment Status:</span>{" "}
                <span className="text-emerald-800 font-semibold">
                  {order.paymentStatus === "PAID"
                    ? "Paid"
                    : order.paymentStatus || "Paid"}
                </span>
              </p>
              {order.stripePaymentIntentId && (
                <p className="font-mono text-[11px] text-stone-600 truncate">
                  <span className="font-sans font-semibold text-black">Ref ID:</span>{" "}
                  {order.stripePaymentIntentId}
                </p>
              )}
            </>
          ) : isKhalti ? (
            <>
              <p>
                <span className="font-semibold text-black">Payment Status:</span>{" "}
                <span className="text-emerald-800 font-semibold">
                  {order.paymentStatus === "PAID"
                    ? "Paid"
                    : order.paymentStatus || "Paid"}
                </span>
              </p>
              <p className="font-mono text-[11px] text-stone-600 truncate">
                <span className="font-sans font-semibold text-black">Order Ref:</span>{" "}
                {order.orderNumber}
              </p>
            </>
          ) : isCod ? (
            <>
              <p>
                <span className="font-semibold text-black">Payment Status:</span>{" "}
                <span className="text-amber-800 font-semibold">
                  Payable on Delivery
                </span>
              </p>
              <p className="text-stone-600 text-[11px]">
                Please prepare cash or local QR payment upon courier arrival.
              </p>
            </>
          ) : isBankTransfer ? (
            <>
              <p>
                <span className="font-semibold text-black">Bank:</span> Really Great Bank
              </p>
              <p>
                <span className="font-semibold text-black">Account No:</span> 0123 4567 8901
              </p>
              <p>
                <span className="font-semibold text-black">Account Name:</span> ABXV Store
              </p>
            </>
          ) : (
            <>
              <p>
                <span className="font-semibold text-black">Payment Status:</span>{" "}
                <span className="font-semibold text-stone-900">
                  {order.paymentStatus || "Confirmed"}
                </span>
              </p>
              {order.stripePaymentIntentId && (
                <p className="font-mono text-[11px] text-stone-600 truncate">
                  <span className="font-sans font-semibold text-black">Ref ID:</span>{" "}
                  {order.stripePaymentIntentId}
                </p>
              )}
            </>
          )}
        </div>

        {/* Right Column: Merchant Information */}
        <div className="space-y-1.5 pl-4">
          <p className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-stone-900 mb-2.5">
            MERCHANT INFORMATION
          </p>
          <p className="font-bold text-black">ABXV</p>
          <p>123 Fashion Street, Kathmandu,</p>
          <p>Bagmati Province, Nepal</p>
          <p className="text-stone-700 font-medium">hello@abxv.store</p>
          <p className="text-stone-700 font-medium">www.abxv.store</p>
        </div>
      </div>

      {/* Full Width Horizontal Divider */}
      <div className="w-full border-t border-stone-800" />

      {/* ── FOOTER: Slogan & Signature ── */}
      <div className="pt-6 flex items-center justify-between">
        <p className="text-[10px] font-extrabold tracking-[0.25em] text-stone-600 uppercase">
          BETTER SHOES. BRIGHTER STEPS.
        </p>

        {/* Cursive/Stylized Signature Logo matching design */}
        <div className="font-serif italic text-2xl font-extrabold tracking-tight text-stone-900 select-none">
          ABXV
        </div>
      </div>
    </div>
  );
}
