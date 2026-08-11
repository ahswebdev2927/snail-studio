import pino from "pino";

const isProd = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || (isProd ? "info" : "debug");

let logger: pino.Logger;

if (isProd) {
  let transport;
  try {
    // In server environments (like Next.js on Hostinger/Vercel), worker-based transports
    // like 'pino-roll' can fail due to bundler/worker limitations or read-only filesystems.
    // We only attempt to initialize pino-roll if not in Next.js server/edge runtime.
    if (!process.env.NEXT_RUNTIME) {
      transport = pino.transport({
        targets: [
          {
            target: "pino-roll",
            options: {
              file: "./logs/combined.log",
              frequency: 30 * 24 * 60 * 60 * 1000, // Monthly (30 days)
              size: "25m",
              mkdir: true,
              limit: { count: 5}
            },
            level: "info"
          },
          {
            target: "pino-roll",
            options: {
              file: "./logs/errors.log",
              frequency: 30 * 24 * 60 * 60 * 1000, // Monthly (30 days)
              size: "25m",
              mkdir: true,
              limit: { count: 5}
            },
            level: "error"
          },
          {
            target: "pino/file",
            options: { destination: 1 }, // stdout
            level: "info"
          }
        ]
      });
    }
  } catch (error) {
    console.warn("⚠️ Failed to initialize pino-roll file transport, falling back to stdout logging:", error);
  }

  if (transport) {
    logger = pino({
      level: logLevel,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label.toUpperCase() })
      }
    }, transport);
  } else {
    logger = pino({
      level: logLevel,
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level: (label) => ({ level: label.toUpperCase() })
      }
    });
  }
} else {
  logger = pino({
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label.toUpperCase() })
    },
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname"
      }
    }
  });
}

export { logger };
