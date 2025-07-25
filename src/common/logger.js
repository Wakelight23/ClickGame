export function logInfo(module, message) {
  console.info(`[INFO] [${new Date().toISOString()}] [${module}] ${message}`);
}

export function logWarn(module, message) {
  console.warn(`[WARN] [${new Date().toISOString()}] [${module}] ${message}`);
}

export function logError(module, message, error) {
  console.error(`[ERROR] [${new Date().toISOString()}] [${module}] ${message}`, error);
}
