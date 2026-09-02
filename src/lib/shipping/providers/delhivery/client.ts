import { getDelhiveryConfig } from "./config";

export interface DelhiveryRequestOptions {
  endpoint: string; // e.g. "/c/api/pin-codes/json/" or "/api/cmu/create.json"
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
  contentType?: "application/json" | "application/x-www-form-urlencoded" | "text/plain";
  timeoutMs?: number;
}

export class DelhiveryApiError extends Error {
  public statusCode?: number;
  public rawData?: any;

  constructor(message: string, statusCode?: number, rawData?: any) {
    super(message);
    this.name = "DelhiveryApiError";
    this.statusCode = statusCode;
    this.rawData = rawData;
  }
}

/**
 * Centralized reusable HTTP client for Delhivery API calls.
 * Handles headers, timeouts, error parsing, and error classification.
 */
export async function delhiveryFetch<T = any>(options: DelhiveryRequestOptions): Promise<T> {
  const config = getDelhiveryConfig();

  if (!config.apiToken) {
    throw new DelhiveryApiError("Delhivery API Token is not configured in system environment.");
  }

  const method = options.method || "GET";
  const timeoutMs = options.timeoutMs || 15000;
  const contentType = options.contentType || "application/json";

  const cleanEndpoint = options.endpoint.startsWith("/") ? options.endpoint : `/${options.endpoint}`;
  const url = `${config.baseUrl}${cleanEndpoint}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Authorization: `Token ${config.apiToken}`,
    "Content-Type": contentType,
  };

  let bodyPayload: any = undefined;

  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === "string") {
      bodyPayload = options.body;
    } else if (contentType === "application/x-www-form-urlencoded" && options.body instanceof URLSearchParams) {
      bodyPayload = options.body.toString();
    } else {
      bodyPayload = JSON.stringify(options.body);
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: bodyPayload,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      const errorText = await response.text();
      throw new DelhiveryApiError(
        `Delhivery API HTTP Error ${response.status}: ${errorText}`,
        response.status,
        errorText
      );
    }

    const contentTypeHeader = response.headers.get("content-type") || "";
    if (contentTypeHeader.includes("application/json") || contentTypeHeader.includes("json")) {
      const data = await response.json();
      return data as T;
    }

    const textData = await response.text();
    return textData as unknown as T;
  } catch (error: any) {
    clearTimeout(timer);

    if (error.name === "AbortError") {
      throw new DelhiveryApiError(`Delhivery API request timed out after ${timeoutMs}ms.`);
    }

    if (error instanceof DelhiveryApiError) {
      throw error;
    }

    throw new DelhiveryApiError(`Delhivery Network Error: ${error?.message || "Unknown error"}`);
  }
}
