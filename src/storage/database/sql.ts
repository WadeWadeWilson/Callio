export function nowIso(): string {
  return new Date().toISOString();
}

export function placeholders(count: number): string {
  if (count <= 0 || !Number.isInteger(count)) {
    throw new Error('Placeholder count must be a positive integer.');
  }

  return Array.from({ length: count }, () => '?').join(', ');
}
