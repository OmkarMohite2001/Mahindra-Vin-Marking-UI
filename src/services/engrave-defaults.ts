export type MachineLineEndingStorageValue = '\\r\\n' | '\\n' | '\\r';

export const MACHINE_SERIAL_DEFAULTS = {
  baudRate: 9600,
  template: 'TEST12.tml',
  completionToken: 'GO F',
  lineTerminator: '\\r\\n' as MachineLineEndingStorageValue,
  interDelayMs: 1000,
  responseTimeoutMs: 15000,
} as const;

export const SCANNER_SERIAL_DEFAULTS = {
  baudRate: 9600,
  autoConnect: true,
} as const;
