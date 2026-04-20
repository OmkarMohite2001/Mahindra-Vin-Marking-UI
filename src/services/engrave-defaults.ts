export const MACHINE_SERIAL_DEFAULTS = {
  baudRate: 9600,
  template: 'TEST.tml',
  completionToken: 'GO F',
  useChecksum: false,
  interDelayMs: 1000,
  responseTimeoutMs: 15000,
} as const;

export const SCANNER_SERIAL_DEFAULTS = {
  baudRate: 9600,
  autoConnect: true,
} as const;
