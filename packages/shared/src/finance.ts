export const TAX_RATE = 0.12;

export function calculateTaxCents(subtotalCents: number) {
  return Math.round(subtotalCents * TAX_RATE);
}

export function calculateTotalCents(subtotalCents: number) {
  const taxCents = calculateTaxCents(subtotalCents);

  return {
    taxCents,
    totalCents: subtotalCents + taxCents,
  };
}
