interface AetherLogoProps {
  size?: number;
  className?: string;
}

export function AetherLogo({ size = 44, className = "" }: AetherLogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`aether-logo-svg ${className}`}
      aria-label="Aether Relay Logo"
    >
      {/* Base tile surface */}
      <rect
        width="512"
        height="512"
        fill="var(--surface, #111114)"
        rx="112"
        className="aether-logo-bg"
      />
      {/* Subtle glowing border */}
      <rect
        width="480"
        height="480"
        x="16"
        y="16"
        fill="none"
        stroke="var(--lime, #c5f015)"
        strokeWidth="6"
        strokeOpacity="0.4"
        rx="96"
        className="aether-logo-border"
      />
      {/* Main Aether glyph: matches theme accent */}
      <path
        fill="var(--lime, #c5f015)"
        d="M256 130 140 340h70l46-110 46 110h70Zm-30 250h60v20h-60z"
        className="aether-logo-glyph"
      />
      {/* Center cutout */}
      <circle
        cx="256"
        cy="130"
        r="11"
        fill="var(--bg, #0b0f0b)"
        className="aether-logo-hole"
      />
    </svg>
  );
}
