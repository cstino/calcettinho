export function calcOverall({ ATT, DIF, VEL, PAS, FOR, POR }: { ATT: number, DIF: number, VEL: number, PAS: number, FOR: number, POR: number }) {
  return Number(((ATT + DIF + VEL + PAS + FOR + POR) / 6).toFixed(2));
} 