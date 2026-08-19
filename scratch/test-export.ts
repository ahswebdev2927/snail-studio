import { EXPORT_FIELD_REGISTRY } from "../src/services/crm/export/customer-export-fields";
import { formatExportField } from "../src/services/crm/export/customer-export-formatters";
import { getExportPreview, generateExportFile } from "../src/services/crm/export/customer-export.service";

async function runTests() {
  console.log("=== STARTING CRM EXPORT BACKEND TESTING ===");

  // Test 1: Field Selection Registry
  console.log("\n[Test 1] Verifying Field Registry...");
  const keys = EXPORT_FIELD_REGISTRY.map(f => f.key);
  console.log(`Found ${keys.length} registered fields.`);
  if (keys.includes("customerId") && keys.includes("lifetimeValue") && keys.includes("customerTags")) {
    console.log("✅ Registry holds all required profile, revenue, and marketing keys.");
  } else {
    throw new Error("❌ Field registry is missing expected keys.");
  }

  // Test 2: Formatting Helper
  console.log("\n[Test 2] Verifying Value Formatters...");
  const tests = [
    { key: "lifetimeValue", val: 500000, expected: "₹5,000.00" },
    { key: "averageOrderValue", val: 125050, expected: "₹1,250.50" },
    { key: "createdAt", val: 1776991200, expected: "24 Apr 2026" }, // 2026-04-24
    { key: "marketingConsent", val: true, expected: "Yes" },
    { key: "accountStatus", val: false, expected: "Banned" },
    { key: "name", val: "Nail Enthusiast", expected: "Nail Enthusiast" }
  ];

  for (const t of tests) {
    const formatted = formatExportField(t.key, t.val);
    console.log(`Field '${t.key}' with value '${t.val}' formatted to: '${formatted}'`);
    if (formatted.replace(/\u00a0/g, " ") !== t.expected) {
      // Allow for potential non-breaking space issues in Intl.NumberFormat
      if (t.key.includes("Value") && formatted.replace(/\s/g, "") === t.expected.replace(/\s/g, "")) {
        continue;
      }
      throw new Error(`❌ Formatting failed for ${t.key}. Got: '${formatted}', Expected: '${t.expected}'`);
    }
  }
  console.log("✅ Formatters work correctly.");

  // Test 3: Preview Query execution
  console.log("\n[Test 3] Fetching Preview Dataset (All Customers)...");
  try {
    const preview = await getExportPreview({
      fields: ["customerId", "name", "email", "totalOrders", "lifetimeValue", "accountStatus"],
      filters: {
        operator: "AND",
        conditions: []
      },
      selection: {
        mode: "all"
      },
      page: 1,
      pageSize: 5
    });

    console.log(`Successfully fetched preview! Matches: ${preview.pagination.total}`);
    console.log("Sample Preview Row:", JSON.stringify(preview.rows[0], null, 2));
    console.log("✅ Preview Query executed successfully.");
  } catch (err) {
    console.error("❌ Preview Query failed:", err);
    process.exit(1);
  }

  // Test 4: Dynamic Filters
  console.log("\n[Test 4] Fetching Preview with Filters (Orders >= 0)...");
  try {
    const preview = await getExportPreview({
      fields: ["customerId", "name", "totalOrders", "lifetimeValue"],
      filters: {
        operator: "AND",
        conditions: [
          {
            field: "totalOrders",
            operator: "greaterThanOrEqual",
            value: 0
          }
        ]
      },
      selection: {
        mode: "all"
      },
      page: 1,
      pageSize: 5
    });

    console.log(`Successfully fetched filtered preview! Matches: ${preview.pagination.total}`);
    console.log("✅ Filtered Query executed successfully.");
  } catch (err) {
    console.error("❌ Filtered Query failed:", err);
    process.exit(1);
  }

  // Test 5: Full CSV Generation
  console.log("\n[Test 5] Generating Full CSV Export...");
  try {
    const exportResult = await generateExportFile({
      fields: ["name", "email", "totalOrders", "lifetimeValue", "customerTags"],
      filters: {
        operator: "AND",
        conditions: []
      },
      selection: {
        mode: "all"
      },
      format: "csv"
    });

    console.log(`Generated CSV content length: ${exportResult.csvContent.length} bytes`);
    console.log(`Exported customer count: ${exportResult.customerCount}`);
    
    // Print first two lines
    const lines = exportResult.csvContent.split("\n");
    console.log("CSV Header:", lines[0]);
    if (lines[1]) console.log("CSV Row 1:", lines[1]);
    
    console.log("✅ Full CSV generation works.");
  } catch (err) {
    console.error("❌ CSV Generation failed:", err);
    process.exit(1);
  }

  console.log("\n=== ALL CRM EXPORT BACKEND TESTS PASSED ===");
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
