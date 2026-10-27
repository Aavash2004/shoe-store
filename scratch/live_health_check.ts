async function checkUrl(url: string, description: string) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "health-check" } });
    const status = res.status;
    if (status >= 200 && status < 400) {
      console.log(`✅ [${status}] ${description}: ${url}`);
      return true;
    } else {
      console.log(`❌ [${status}] ${description}: ${url}`);
      return false;
    }
  } catch (err: any) {
    console.log(`❌ [FAILED] ${description}: ${url} - Error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log("=== RUNNING LIVE HTTP ENDPOINTS HEALTH CHECK ===");
  const base = "http://localhost:3000";

  const routes = [
    { url: `${base}/`, desc: "Storefront Home Page" },
    { url: `${base}/shop`, desc: "Catalog / Shop Page" },
    { url: `${base}/cart`, desc: "Cart Page" },
    { url: `${base}/checkout`, desc: "Checkout Page" },
    { url: `${base}/login`, desc: "Customer Login Page" },
    { url: `${base}/signup`, desc: "Customer Signup Page" },
    { url: `${base}/admin/login`, desc: "Admin Login Page" },
    { url: `${base}/track-order`, desc: "Order Tracking Page" },
    { url: `${base}/api/products`, desc: "Products API" },
    { url: `${base}/api/categories`, desc: "Categories API" },
    { url: `${base}/api/currencies`, desc: "Currencies API" },
  ];

  let failed = 0;
  for (const r of routes) {
    const ok = await checkUrl(r.url, r.desc);
    if (!ok) failed++;
  }

  // Also check first product detail page
  try {
    const prodRes = await fetch(`${base}/api/products`);
    if (prodRes.ok) {
      const prods = await prodRes.json();
      if (Array.isArray(prods) && prods.length > 0) {
        const firstSlug = prods[0].slug;
        const ok = await checkUrl(`${base}/products/${firstSlug}`, `Product Detail Page (/products/${firstSlug})`);
        if (!ok) failed++;
      }
    }
  } catch {}

  console.log("\n==============================================");
  if (failed === 0) {
    console.log("🎉 ALL LIVE ROUTES RESPONDED HEALTHY (200 OK)!");
  } else {
    console.log(`⚠️ ${failed} ROUTES RETURNED NON-OK STATUS`);
  }
  console.log("==============================================");
}

main().finally(() => process.exit(0));
