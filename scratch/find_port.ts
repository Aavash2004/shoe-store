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

async function testPort(port: number) {
  console.log(`\n--- Testing Port ${port} ---`);
  const base = `http://localhost:${port}`;
  const ok1 = await checkUrl(`${base}/`, "Home Page");
  const ok2 = await checkUrl(`${base}/shop`, "Shop Page");
  const ok3 = await checkUrl(`${base}/api/products`, "Products API");
  return ok1 && ok2 && ok3;
}

async function main() {
  for (const port of [3000, 3001, 3002, 3003]) {
    await testPort(port);
  }
}

main().finally(() => process.exit(0));
