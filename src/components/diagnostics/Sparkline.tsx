interface SparklineProps {
  data: number[];
  color: string;
  /** Sample indices to highlight (stutter marks). */
  marks?: number[];
  height?: number;
  width?: number;
}

export function Sparkline({ data, color, marks = [], height = 36, width = 220 }: SparklineProps) {
  if (data.length < 2) {
    return <div style={{ height, width, opacity: 0.3 }} className="sparkline-placeholder">—</div>;
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const x = (idx: number) => (idx / (data.length - 1)) * width;
  const y = (val: number) => height - ((val - min) / range) * (height - 8) - 4;
  const points = data.map((val, idx) => `${x(idx).toFixed(1)},${y(val).toFixed(1)}`).join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" points={points} />
      {marks.map((idx, i) =>
        idx < 0 || idx >= data.length ? null : (
          <circle key={i} cx={x(idx)} cy={y(data[idx] ?? min)} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
        ),
      )}
    </svg>
  );
}
