export function getCardTemplate(overall: number) {
  if (overall >= 9.0) return 'ultimate';
  if (overall >= 7.0) return 'oro';
  if (overall >= 4.6) return 'argento';
  return 'bronzo';
} 