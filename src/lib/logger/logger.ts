import pino from "pino";

const isProd = process.env.NODE_ENV === "production";
const logLevel = process.env.LOG_LEVEL || (isProd ? "info" : "debug");

let logger: pino.Logger;

if (isProd) {
  const transport = pino.transport({
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
