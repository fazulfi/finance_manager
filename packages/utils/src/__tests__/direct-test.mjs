// Direct test of parseCurrency function
import { parseCurrency } from "../../currency.js";

console.log("Testing parseCurrency with narrow no-breaking space...");
const testString1 = "Rp\u202f500.000,00"; // narrow no-breaking space
console.log("Test string:", JSON.stringify(testString1));
console.log("Test string length:", testString1.length);

try {
  const result1 = parseCurrency(testString1, "id-ID");
  console.log("✓ Success! Parsed:", result1);
} catch (e) {
  console.log("✗ Failed:", e.message);
}

console.log("\nTesting parseCurrency with regular no-breaking space...");
const testString2 = "Rp\u00A0500.000,00"; // regular no-breaking space
console.log("Test string:", JSON.stringify(testString2));
console.log("Test string length:", testString2.length);

try {
  const result2 = parseCurrency(testString2, "id-ID");
  console.log("✓ Success! Parsed:", result2);
} catch (e) {
  console.log("✗ Failed:", e.message);
}

console.log("\nTesting parseCurrency with regular space...");
const testString3 = "Rp 500.000,00"; // regular space
console.log("Test string:", JSON.stringify(testString3));
console.log("Test string length:", testString3.length);

try {
  const result3 = parseCurrency(testString3, "id-ID");
  console.log("✓ Success! Parsed:", result3);
} catch (e) {
  console.log("✗ Failed:", e.message);
}
