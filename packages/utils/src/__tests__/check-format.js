// Check what Intl.NumberFormat actually outputs for IDR
const formatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 2,
});

const result = formatter.format(500000);
console.log("Formatted string:", JSON.stringify(result));
console.log("Formatted string length:", result.length);

for (let i = 0; i < result.length; i++) {
  const char = result[i];
  const code = result.codePointAt(i);
  console.log(`  Position ${i}: '${char}' (U+${code.toString(16).padStart(4, "0").toUpperCase()})`);
}

// Try parsing with parseCurrency
const { parseCurrency } = require("./src/currency.js");
try {
  const parsed = parseCurrency(result, "id-ID");
  console.log("\nParsed result:", parsed);
} catch (e) {
  console.log("\nParsing failed:", e.message);
}
