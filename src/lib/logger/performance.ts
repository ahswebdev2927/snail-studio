import { logger } from "./logger";

export async function measurePerformance<T>(
  label: string,
  fn: () => Promise<T>,
  context: Record<string, unknown> = {}
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - start;

    logger.debug(
      { label, duration, ...context, type: "performance_metric" },
      `Performance [${label}]: completed in ${duration}ms`
    );

    if (duration > 500) {
      logger.warn(
        { label, duration, ...context, type: "performance_slow_operation" },
        `Slow operation [${label}]: took ${duration}ms`
      );
    }

    return result;
  } catch (error: any) {
    const duration = Date.now() - start;
    logger.error(
      {
        label,
        duration,
        error: error.message || String(error),
        ...context,
        type: "performance_failure"
      },
      `Operation failed [${label}]: failed after ${duration}ms - ${error.message || String(error)}`
    );
    throw error;
  }
}
