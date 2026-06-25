export function parseOptionalBiometricNo(raw: string): {
  value: number | null;
  error?: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null };
  }

  if (!/^\d+$/.test(trimmed)) {
    return { value: null, error: "Biometric number must be a whole number." };
  }

  const value = Number.parseInt(trimmed, 10);
  if (!Number.isSafeInteger(value) || value <= 0) {
    return { value: null, error: "Biometric number must be greater than zero." };
  }

  return { value };
}

export function formatBiometricNo(value: number | null | undefined): string {
  if (value == null) return "";
  return String(value);
}
