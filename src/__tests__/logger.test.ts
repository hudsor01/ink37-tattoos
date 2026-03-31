import { describe, it, expect, vi } from 'vitest';

// Mock server-only since logger imports it
vi.mock('server-only', () => ({}));

describe('Logger module', () => {
  it('exports logger instance with expected methods', async () => {
    const { logger } = await import('@/lib/logger');

    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.fatal).toBe('function');
    expect(typeof logger.trace).toBe('function');
  });

  it('exports createRequestLogger function', async () => {
    const { createRequestLogger } = await import('@/lib/logger');

    expect(createRequestLogger).toBeDefined();
    expect(typeof createRequestLogger).toBe('function');
  });

  it('createRequestLogger returns a child logger with requestId', async () => {
    const { createRequestLogger } = await import('@/lib/logger');

    const requestLogger = createRequestLogger('test-request-123');

    expect(requestLogger).toBeDefined();
    expect(typeof requestLogger.info).toBe('function');
    expect(typeof requestLogger.error).toBe('function');
    expect(typeof requestLogger.warn).toBe('function');
  });

  it('exports Logger type', async () => {
    // Verify the module exports exist (type is erased at runtime,
    // but the module should export without error)
    const mod = await import('@/lib/logger');

    expect(mod.logger).toBeDefined();
    expect(mod.createRequestLogger).toBeDefined();
  });

  it('logger has base fields configured', async () => {
    const { logger } = await import('@/lib/logger');

    // Pino loggers expose bindings() to get base fields
    const bindings = logger.bindings();
    expect(bindings.service).toBe('ink37-tattoos');
    expect(bindings.env).toBeDefined();
  });

  it('logger is pino-based', async () => {
    // Verify the implementation file uses pino
    const fs = await import('node:fs');
    const content = fs.readFileSync('src/lib/logger.ts', 'utf-8');

    expect(content).toContain("import pino from 'pino'");
    expect(content).toContain('pino(');
    expect(content).toContain("service: 'ink37-tattoos'");
  });
});
