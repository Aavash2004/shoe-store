import { debounce } from "../lib/utils/debounce";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function expectEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} (expected ${expected}, got ${actual})`);
  }
}

async function runTests() {
  console.log("=== RUNNING DEBOUNCE UNIT TESTS ===");

  // Test 1: Standard delay execution
  console.log("\n[Test 1] Standard Delay Execution...");
  {
    const state = { callCount: 0, lastValue: "" };
    const fn = debounce((val: string) => {
      state.callCount++;
      state.lastValue = val;
    }, 50);

    fn("first");
    expectEqual(state.callCount, 0, "Test 1 Failed: Function ran synchronously!");
    if (!fn.isPending()) throw new Error("Test 1 Failed: isPending() should be true!");

    await sleep(70);
    expectEqual(state.callCount, 1, "Test 1 Failed: Expected 1 call");
    expectEqual(state.lastValue, "first", "Test 1 Failed: Expected 'first'");
    if (fn.isPending()) throw new Error("Test 1 Failed: isPending() should be false after execution!");
    console.log("✓ Test 1 PASSED: Function executes after delay and isPending reflects state.");
  }

  // Test 2: Rapid sequential invocations cancel prior calls
  console.log("\n[Test 2] Rapid Sequential Invocations...");
  {
    const state = { callCount: 0, lastValue: "" };
    const fn = debounce((val: string) => {
      state.callCount++;
      state.lastValue = val;
    }, 50);

    fn("call 1");
    await sleep(20);
    fn("call 2");
    await sleep(20);
    fn("call 3");

    expectEqual(state.callCount, 0, "Test 2 Failed: Premature execution during rapid calls!");

    await sleep(70);
    expectEqual(state.callCount, 1, "Test 2 Failed: Expected exactly 1 call");
    expectEqual(state.lastValue, "call 3", "Test 2 Failed: Expected 'call 3'");
    console.log("✓ Test 2 PASSED: Rapid calls debounced into a single execution with latest arguments.");
  }

  // Test 3: .cancel() halts pending execution
  console.log("\n[Test 3] Cancel Pending Invocations...");
  {
    const state = { callCount: 0 };
    const fn = debounce(() => {
      state.callCount++;
    }, 50);

    fn();
    if (!fn.isPending()) throw new Error("Test 3 Failed: isPending() should be true!");

    fn.cancel();
    if (fn.isPending()) throw new Error("Test 3 Failed: isPending() should be false after cancel()!");

    await sleep(70);
    expectEqual(state.callCount, 0, "Test 3 Failed: Function executed after cancel()!");
    console.log("✓ Test 3 PASSED: .cancel() successfully aborts pending execution.");
  }

  // Test 4: .flush() executes immediately with latest arguments
  console.log("\n[Test 4] Flush Pending Invocations...");
  {
    const state = { callCount: 0, flushedArg: 0 };
    const fn = debounce((qty: number) => {
      state.callCount++;
      state.flushedArg = qty;
    }, 100);

    fn(1);
    fn(2);
    fn(5);

    // Call flush immediately before the 100ms timer
    fn.flush();
    expectEqual(state.callCount, 1, "Test 4 Failed: Expected 1 immediate call");
    expectEqual(state.flushedArg, 5, "Test 4 Failed: Expected arg 5");
    if (fn.isPending()) throw new Error("Test 4 Failed: isPending() should be false after flush()!");

    // Wait past the original timer to ensure it does not fire again
    await sleep(120);
    expectEqual(state.callCount, 1, "Test 4 Failed: Flush triggered a duplicate second call!");
    console.log("✓ Test 4 PASSED: .flush() immediately executes latest arguments and clears timer.");
  }

  // Test 5: Independent instance isolation (verifying per-variant Map safety)
  console.log("\n[Test 5] Instance Isolation (Multi-Item Map Safety)...");
  {
    const results: Record<string, number> = {};
    const map = new Map<string, ReturnType<typeof debounce>>();

    const getOrCreate = (key: string, wait: number) => {
      let d = map.get(key);
      if (!d) {
        d = debounce((val: number) => {
          results[key] = val;
        }, wait);
        map.set(key, d);
      }
      return d;
    };

    const debouncedA = getOrCreate("shoe-a", 120);
    const debouncedB = getOrCreate("shoe-b", 50);

    debouncedA(10);
    debouncedB(20);

    // After 70ms: shoe-b (50ms delay) should be done, shoe-a (120ms delay) must still be pending
    await sleep(75);
    if (results["shoe-b"] !== 20) {
      throw new Error(`Test 5 Failed: shoe-b should have finished, got: ${results["shoe-b"]}`);
    }
    if (results["shoe-a"] !== undefined) {
      throw new Error("Test 5 Failed: shoe-a should still be pending!");
    }

    // Now re-trigger shoe-a to verify resetting shoe-a timer doesn't affect shoe-b
    debouncedA(30);
    await sleep(75); // 75ms into shoe-a's new 120ms timer -> still pending
    if (results["shoe-a"] !== undefined) {
      throw new Error("Test 5 Failed: shoe-a should have reset and still be pending!");
    }

    await sleep(75); // total 150ms since reset -> shoe-a should now have 30
    if (results["shoe-a"] !== 30) {
      throw new Error(`Test 5 Failed: shoe-a expected 30, got: ${results["shoe-a"]}`);
    }
    console.log("✓ Test 5 PASSED: Independent debounced instances do not cross-talk or interfere.");
  }

  // Test 6: Flush-on-unmount simulation for Map
  console.log("\n[Test 6] Flush All Instances on Unmount...");
  {
    const flushedValues: string[] = [];
    const map = new Map<string, ReturnType<typeof debounce>>();

    const fn1 = debounce((v: string) => flushedValues.push(v), 200);
    const fn2 = debounce((v: string) => flushedValues.push(v), 200);
    map.set("item1", fn1);
    map.set("item2", fn2);

    fn1("item1_qty4");
    fn2("item2_qty1");

    // Simulate component unmount flush
    map.forEach((fn) => fn.flush());

    if (flushedValues.length !== 2 || !flushedValues.includes("item1_qty4") || !flushedValues.includes("item2_qty1")) {
      throw new Error(`Test 6 Failed: Expected both items to flush on unmount, got ${JSON.stringify(flushedValues)}`);
    }
    console.log("✓ Test 6 PASSED: All pending instances flushed synchronously on unmount.");
  }

  console.log("\n==========================================");
  console.log("ALL 6 DEBOUNCE TESTS PASSED SUCCESSFULLY!");
  console.log("==========================================");
}

runTests().catch((err) => {
  console.error("TEST SUITE FAILED:", err);
  process.exit(1);
});
