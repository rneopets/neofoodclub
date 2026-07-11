export function isProductionHost(): boolean {
  const host = window.location.hostname;
  return host === 'neofood.club' || host === 'www.neofood.club';
}
