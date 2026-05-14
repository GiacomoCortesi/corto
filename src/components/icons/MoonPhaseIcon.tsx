import { useId, type SVGProps } from "react";

type Props = Omit<SVGProps<SVGSVGElement>, "title"> & {
  /** Sun–moon angle in radians (0 = new, π = full, 2π = new). */
  angleRadians: number;
  size?: number;
  title?: string;
};

/**
 * Lit fraction = (1 − cos θ) / 2 — see half-disk + terminator ellipse construction.
 */
export function MoonPhaseIcon({
  angleRadians,
  size = 12,
  className,
  title,
  ...props
}: Props) {
  const uid = useId().replace(/:/g, "");
  const clipId = `moon-clip-${uid}`;
  const litMaskId = `moon-lit-${uid}`;
  const shadowGradId = `moon-shadow-${uid}`;
  const litGradId = `moon-lit-grad-${uid}`;
  const earthGradId = `moon-earth-${uid}`;

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 0.5;

  const cosT = Math.cos(angleRadians);
  const illumination = (1 - cosT) / 2;
  const waxing = angleRadians <= Math.PI;
  const rxEllipse = Math.abs(cosT) * r;
  const isCrescent = illumination < 0.5;

  const litHalfX = waxing ? cx : cx - r;
  const litCx = waxing ? cx + r * 0.22 : cx - r * 0.22;
  const earthCx = waxing ? cx - r * 0.28 : cx + r * 0.28;

  const showPhase = illumination > 0.001 && illumination < 0.999;
  const isFull = illumination >= 0.999;
  const isNew = illumination <= 0.001;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden
      focusable="false"
      className={className}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <clipPath id={clipId}>
          <circle cx={cx} cy={cy} r={r} />
        </clipPath>

        <radialGradient
          id={shadowGradId}
          cx={earthCx}
          cy={cy - r * 0.08}
          r={r * 1.15}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#3d3020" />
          <stop offset="55%" stopColor="#1f1810" />
          <stop offset="100%" stopColor="#0d0a06" />
        </radialGradient>

        <radialGradient
          id={litGradId}
          cx={litCx}
          cy={cy - r * 0.18}
          r={r * 1.05}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fff8e1" />
          <stop offset="40%" stopColor="#f5e6b8" />
          <stop offset="75%" stopColor="#e0c98a" />
          <stop offset="100%" stopColor="#b8956a" />
        </radialGradient>

        <radialGradient
          id={earthGradId}
          cx={earthCx}
          cy={cy + r * 0.05}
          r={r * 0.72}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#6b5438" stopOpacity={0.5} />
          <stop offset="100%" stopColor="#2c2418" stopOpacity={0} />
        </radialGradient>

        <mask id={litMaskId}>
          <rect width={size} height={size} fill="black" />
          {showPhase ? (
            <>
              <rect x={litHalfX} y={cy - r} width={r} height={2 * r} fill="white" />
              {rxEllipse > 0.01 ? (
                <ellipse
                  cx={cx}
                  cy={cy}
                  rx={rxEllipse}
                  ry={r}
                  fill={isCrescent ? "black" : "white"}
                />
              ) : null}
            </>
          ) : isFull ? (
            <circle cx={cx} cy={cy} r={r} fill="white" />
          ) : null}
        </mask>
      </defs>

      {/* Shadow disk */}
      <circle cx={cx} cy={cy} r={r} fill={`url(#${shadowGradId})`} />

      {/* Faint earthshine on the night side */}
      {!isNew ? (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={`url(#${earthGradId})`}
          clipPath={`url(#${clipId})`}
        />
      ) : null}

      {/* Lit surface */}
      {!isNew ? (
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill={`url(#${litGradId})`}
          mask={`url(#${litMaskId})`}
        />
      ) : null}

      {/* Mare — subtle surface mottling on the lit side */}
      {!isNew && size >= 11 ? (
        <g mask={`url(#${litMaskId})`} clipPath={`url(#${clipId})`} opacity={0.24}>
          <ellipse cx={cx - r * 0.18} cy={cy - r * 0.12} rx={r * 0.28} ry={r * 0.2} fill="#a07840" />
          <ellipse cx={cx + r * 0.22} cy={cy + r * 0.18} rx={r * 0.22} ry={r * 0.16} fill="#8b6530" />
          <ellipse cx={cx + r * 0.05} cy={cy - r * 0.28} rx={r * 0.14} ry={r * 0.1} fill="#9a7040" />
        </g>
      ) : null}

      {/* Limb highlight */}
      {!isNew ? (
        <circle
          cx={cx}
          cy={cy}
          r={r - 0.35}
          fill="none"
          stroke="#fff5d6"
          strokeOpacity={isFull ? 0.35 : 0.22}
          strokeWidth={0.45}
          mask={`url(#${litMaskId})`}
        />
      ) : null}

      {/* Outer rim */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#3d2e1a"
        strokeOpacity={0.5}
        strokeWidth={0.5}
      />
    </svg>
  );
}
