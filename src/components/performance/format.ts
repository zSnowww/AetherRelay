export function formatMemory(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  }
  const mb = Math.round(bytes / 1024 / 1024);
  return `${mb} MB`;
}

/** Two-letter fallback avatar for apps without an icon. */
export function getAppInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/** Stable gradient per package so the same app keeps the same avatar colour. */
export function getAppGradient(pkg: string): string {
  let hash = 0;
  for (let i = 0; i < pkg.length; i++) {
    hash = (hash << 5) - hash + pkg.charCodeAt(i);
    hash |= 0;
  }
  const gradients = [
    "linear-gradient(135deg, #FF5E62 0%, #FF9966 100%)",
    "linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)",
    "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    "linear-gradient(135deg, #F368E0 0%, #B53471 100%)",
    "linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)",
    "linear-gradient(135deg, #f12711 0%, #f5af19 100%)",
    "linear-gradient(135deg, #0575E6 0%, #00F260 100%)",
    "linear-gradient(135deg, #b20a2c 0%, #ff6b6b 100%)",
    "linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)",
  ];
  return gradients[Math.abs(hash) % gradients.length];
}
