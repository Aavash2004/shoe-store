async function testSite() {
  const base = 'https://abxv.vercel.app';
  const tests = [
    { name: 'Home Page', path: '/' },
    { name: 'Shop All', path: '/shop' },
    { name: 'New Arrivals Filter', path: '/shop?sort=newest' },
    { name: 'Multi-brand Filter', path: '/shop?brand=Nike,Adidas' },
    { name: 'Multi-size Filter', path: '/shop?size=40,42' },
    { name: 'Contact Page', path: '/contact' },
    { name: 'Terms of Service', path: '/terms' },
    { name: 'Privacy Policy', path: '/privacy' },
    { name: 'Returns Policy', path: '/returns' },
    { name: 'Cart Page', path: '/cart' },
    { name: 'Checkout Page', path: '/checkout' },
    { name: 'Order Tracking', path: '/track-order' },
    { name: 'Login Page', path: '/login' },
    { name: 'Categories API', path: '/api/categories' },
    { name: 'Autocomplete Search API', path: '/api/products/search?q=run' },
    { name: 'Auth Providers API', path: '/api/auth/providers' },
    { name: 'Admin Route Security (Non-auth)', path: '/admin' },
    { name: 'Admin Login Route', path: '/admin/login' }
  ];

  console.log(`Starting live site diagnostic on ${base}...\n`);

  for (const t of tests) {
    try {
      const start = Date.now();
      const res = await fetch(`${base}${t.path}`, {
        headers: { 'User-Agent': 'ABXV-Auditor/1.0' },
        redirect: 'manual'
      });
      const ms = Date.now() - start;
      const contentType = res.headers.get('content-type') || '';
      const text = await res.text();

      // Check specific contents
      let extra = '';
      if (t.path === '/contact') {
        const hasEmail = text.includes('basnetaavash7@gmail.com');
        const hasPhone = text.includes('9861990722');
        const hasLoc = text.includes('Bhaktapur');
        extra = ` [Email: ${hasEmail ? '✓' : '✗'}, Phone: ${hasPhone ? '✓' : '✗'}, Loc: ${hasLoc ? '✓' : '✗'}]`;
      } else if (t.path === '/') {
        const hasNewArrivalsLink = text.includes('/shop?sort=newest');
        extra = ` [New Arrivals Link: ${hasNewArrivalsLink ? '✓' : '✗'}]`;
      } else if (t.path === '/terms' || t.path === '/privacy') {
        const hasPills = text.includes('pointer-events-none absolute right-6 top-1/2');
        extra = ` [Margin pills removed: ${!hasPills ? '✓' : '✗'}]`;
      } else if (t.path === '/api/categories') {
        try {
          const json = JSON.parse(text);
          extra = ` [${json?.categories?.length ?? 0} categories]`;
        } catch {}
      }

      console.log(`[HTTP ${res.status}] ${t.name.padEnd(30)} ${t.path.padEnd(35)} (${ms}ms)${extra}`);
    } catch (err) {
      console.log(`[FAILED]   ${t.name.padEnd(30)} ${t.path.padEnd(35)} Error: ${err.message}`);
    }
  }

  // Test Contact Inquiry POST
  console.log('\nTesting Contact Inquiry API POST...');
  try {
    const inquiryRes = await fetch(`${base}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Automated Auditor',
        email: 'auditor@example.com',
        orderNumber: 'TEST-1234',
        message: 'Automated verification inquiry test'
      })
    });
    const inquiryJson = await inquiryRes.json();
    console.log(`[HTTP ${inquiryRes.status}] Contact Inquiry POST:`, inquiryJson);
  } catch (err) {
    console.log('[FAILED] Contact Inquiry POST error:', err.message);
  }

  // Test Logout Endpoint
  console.log('\nTesting Logout API Endpoint...');
  try {
    const logoutRes = await fetch(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const logoutJson = await logoutRes.json();
    console.log(`[HTTP ${logoutRes.status}] Logout API POST:`, logoutJson);
  } catch (err) {
    console.log('[FAILED] Logout API POST error:', err.message);
  }
}

testSite();
