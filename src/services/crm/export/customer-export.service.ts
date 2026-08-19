import { db } from "@/db";
import { and, sql, desc, asc } from "drizzle-orm";
import { CustomerExportPreviewSchema, CustomerExportRequestSchema } from "./customer-export.types";
import { getBaseCustomerQuery, buildQueryConditions } from "./customer-export-query";
import { formatExportField, generateCSV } from "./customer-export-formatters";
import { EXPORT_FIELD_MAP } from "./customer-export-fields";

/**
 * Executes a paginated preview query for the export builder screen.
 */
export async function getExportPreview(payload: any) {
  // Validate request
  const request = CustomerExportPreviewSchema.parse(payload);

  const baseSubquery = getBaseCustomerQuery().as("customer_base");
  const conditions = await buildQueryConditions(
    baseSubquery,
    request.filters,
    request.selection,
    request.search
  );

  // 1. Get total matching count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(baseSubquery)
    .where(and(...conditions));
  
  const total = countResult[0]?.count || 0;

  // 2. Build the sorting expression
  let orderExpr = desc(baseSubquery.createdAt);
  if (request.sort && request.sort.field) {
    const column = (baseSubquery as any)[request.sort.field];
    if (column) {
      orderExpr = request.sort.direction === "desc" ? desc(column) : asc(column);
    }
  }

  // 3. Query rows for current page in a single query expression
  const dbRows = await db
    .select()
    .from(baseSubquery)
    .where(and(...conditions))
    .orderBy(orderExpr)
    .limit(request.pageSize)
    .offset((request.page - 1) * request.pageSize);

  // 4. Format result rows according to selected fields registry
  const rows = dbRows.map((row: any) => {
    const formattedRow: Record<string, string> = {};
    for (const fieldKey of request.fields) {
      formattedRow[fieldKey] = formatExportField(fieldKey, row[fieldKey]);
    }
    return formattedRow;
  });

  return {
    rows,
    pagination: {
      page: request.page,
      pageSize: request.pageSize,
      total,
      totalPages: Math.ceil(total / request.pageSize)
    },
    selectedFieldCount: request.fields.length
  };
}

/**
 * Generates the CSV file content for all matching customers.
 */
export async function generateExportFile(payload: any) {
  // Validate request
  const config = CustomerExportRequestSchema.parse(payload);

  const baseSubquery = getBaseCustomerQuery().as("customer_base");
  const conditions = await buildQueryConditions(
    baseSubquery,
    config.filters,
    config.selection
  );

  // Retrieve ALL matching customers (no limit)
  const dbRows = await db
    .select()
    .from(baseSubquery)
    .where(and(...conditions))
    .orderBy(desc(baseSubquery.createdAt));

  // Format header labels using the field registry
  const headers = config.fields;
  const headerLabels = headers.map(key => EXPORT_FIELD_MAP.get(key)?.label || key);

  // Format all values
  const formattedRows = dbRows.map((row: any) => {
    const formattedRow: Record<string, string> = {};
    for (const fieldKey of headers) {
      const label = EXPORT_FIELD_MAP.get(fieldKey)?.label || fieldKey;
      formattedRow[label] = formatExportField(fieldKey, row[fieldKey]);
    }
    return formattedRow;
  });

  // Generate CSV contents
  const csvContent = generateCSV(headerLabels, formattedRows);

  return {
    csvContent,
    customerCount: dbRows.length,
    selectedFieldCount: headers.length
  };
}
