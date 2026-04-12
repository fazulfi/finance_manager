// Quick test to verify Unicode property escape works
const testString = "Rp\u202f500.000,00"; // narrow no-break space
const testRegex = /\p{White_Space}/gu;
console.log("Test string:", JSON.stringify(testString));
console.log("Test string length:", testString.length);
console.log("Test string chars:");
for (let i = 0; i < testString.length; i++) {
    const char = testString[i];
    const code = testString.codePointAt(i);
    console.log(`  Position ${i}: '${char}' (U+${code.toString(16).padStart(4, "0").toUpperCase()})`);
}
const matches = testString.match(testRegex);
console.log("\nMatches with \\p{White_Space}:", matches);
const result = testString.replace(/\p{White_Space}/gu, "");
console.log("After replacement:", result);
console.log("Expected: Rp500.000,00");
console.log("Match:", result === "Rp500.000,00");
