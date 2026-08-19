export function formatCurrency(paise: number): string {
  if (typeof paise !== "number" || isNaN(paise)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(paise / 100);
}

export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return "";
  
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof date === "number") {
    // If it's less than 10 billion, it's stored in seconds. Convert to milliseconds.
    const ms = date < 10000000000 ? date * 1000 : date;
    d = new Date(ms);
  } else if (typeof date === "string") {
    const num = Number(date);
    if (!isNaN(num) && date.trim() !== "") {
      const ms = num < 10000000000 ? num * 1000 : num;
      d = new Date(ms);
    } else {
      d = new Date(date);
    }
  } else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) return "";
  
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }); // returns e.g. "19 Aug 2026"
}

export function formatPhoneNumber(value: any): string {
  if (!value) return "";
  const cleaned = String(value).replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    const last10 = cleaned.slice(2);
    return `+91 ${last10.slice(0, 3)} ${last10.slice(3, 6)} ${last10.slice(6)}`;
  }
  if (cleaned.length > 10) {
    const countryCodeLength = cleaned.length - 10;
    const countryCode = cleaned.slice(0, countryCodeLength);
    const last10 = cleaned.slice(countryCodeLength);
    return `+${countryCode} ${last10.slice(0, 3)} ${last10.slice(3, 6)} ${last10.slice(6)}`;
  }
  const originalStr = String(value).trim();
  if (originalStr.startsWith("+")) return originalStr;
  return originalStr ? `+${originalStr}` : "";
}

export function formatExportField(key: string, value: any): string {
  if (value === null || value === undefined) {
    return "";
  }

  // Handle specific fields
  if (key === "lifetimeValue" || key === "averageOrderValue") {
    return formatCurrency(Number(value));
  }

  if (["createdAt", "updatedAt", "lastLoginAt", "firstOrderDate", "lastOrderDate"].includes(key)) {
    return formatDate(value);
  }

  if (key === "phoneNumber" || key === "whatsappNumber") {
    return formatPhoneNumber(value);
  }

  if (key === "marketingConsent") {
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    return String(value);
  }

  if (key === "accountStatus") {
    if (typeof value === "boolean") {
      return value ? "Active" : "Banned";
    }
    return String(value);
  }

  return String(value);
}

export function generateCSV(headers: string[], rows: Record<string, string>[]): string {
  const escapeField = (val: string) => {
    const stringVal = val === null || val === undefined ? "" : String(val);
    // If field contains double quotes, commas, or newlines, wrap in quotes and escape internal quotes
    if (/[",\n\r]/.test(stringVal)) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  };

  const csvRows = [
    headers.map(escapeField).join(","),
    ...rows.map(row => headers.map(h => escapeField(row[h] || "")).join(","))
  ];

  // Include UTF-8 BOM to ensure Excel opens Unicode characters correctly
  return "\ufeff" + csvRows.join("\n");
}
