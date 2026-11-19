/**
 * Indian Rupee (INR) currency formatter using Indian numbering system (lakhs & crores).
 * Example:
 *   formatINR(450) -> "₹450"
 *   formatINR(1250.5) -> "₹1,250.50"
 *   formatINR(1250, { forceDecimals: true }) -> "₹1,250.00"
 */
export function formatINR(
  amount: number | string | null | undefined,
  options?: { forceDecimals?: boolean }
): string {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return "₹0";
  }
  const val = Number(amount);
  const hasDecimals = val % 1 !== 0;
  const decimals = (options?.forceDecimals || hasDecimals) ? 2 : 0;

  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 2,
  }).format(val);

  return `₹${formatted}`;
}
