const MONTHS = /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/g;

/** The group writes months capitalised ("22 de Octubre"); apply to any formatted Spanish date. */
export function capitalizeMonths(text: string): string {
  return text.replace(MONTHS, (m) => m.charAt(0).toUpperCase() + m.slice(1));
}
