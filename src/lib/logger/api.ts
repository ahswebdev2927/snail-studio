import { logger } from "./logger";

export async function logOutgoingRequest(
  serviceName: string,
  url: string,
  options: RequestInit = {},
  fetchFn: typeof fetch = fetch
): Promise<Response> {
  const start = Date.now();
  const method = options.method || "GET";

  logger.info(
    { serviceName, method, url, type: "api_outgoing_request" },
    `Outgoing API Request to ${serviceName}: ${method} ${url}`
  );

  try {
    const response = await fetchFn(url, options);
    const duration = Date.now() - start;

    logger.info(
      { serviceName, method, url, status: response.status, duration, type: "api_outgoing_response" },
      `API Response from ${serviceName}: ${method} ${url} - ${response.status} (${duration}ms)`
    );

    return response;
  } catch (error: any) {
    const duration = Date.now() - start;
    logger.error(
      {
        serviceName,
        method,
        url,
        duration,
        error: error.message || String(error),
        stack: error.stack,
        type: "api_outgoing_failed"
      },
      `API Request to ${serviceName} failed: ${method} ${url} - ${error.message || String(error)}`
    );
    throw error;
  }
}
