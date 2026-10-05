export function normalizeMpesaPhone(input: string): string | null {
  if (!/^[+\d\s().-]+$/.test(input.trim())) return null;
  const digits = input.replace(/\D/g, "");

  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;

  return null;
}