import type { TopicStat } from "../types";

interface PieChartProps {
  topics: TopicStat[];
  size?: number;
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function PieChart({ topics, size = 200 }: PieChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  if (topics.length === 0) return null;

  // Single topic = full circle
  if (topics.length === 1) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill={topics[0].color} opacity={0.8} />
      </svg>
    );
  }

  let currentAngle = 0;
  const slices = topics
    .filter((t) => t.percentage > 0)
    .map((topic) => {
      const angle = (topic.percentage / 100) * 360;
      const path = describeArc(cx, cy, r, currentAngle, currentAngle + angle);
      currentAngle += angle;
      return { ...topic, path };
    });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((slice, i) => (
        <path
          key={i}
          d={slice.path}
          fill={slice.color}
          opacity={0.8}
          className="transition-opacity hover:opacity-100"
        />
      ))}
    </svg>
  );
}
