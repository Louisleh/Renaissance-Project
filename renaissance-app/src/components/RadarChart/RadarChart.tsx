import { useCallback, useMemo } from 'react';
import './RadarChart.css';

interface RadarChartProps {
  labels: string[];
  values: number[];
  size?: number;
  showLabels?: boolean;
  animated?: boolean;
}

export function RadarChart({ labels, values, size = 380, showLabels = true, animated = false }: RadarChartProps) {
  const radius = 160;
  const count = labels.length;
  const half = size / 2;

  const polar = useCallback((index: number, value: number) => {
    const angle = ((-90 + index * (360 / count)) * Math.PI) / 180;
    const scaled = radius * (value / 100);
    return { x: Math.cos(angle) * scaled, y: Math.sin(angle) * scaled };
  }, [count]);

  const polyPoints = useCallback((vals: number[]) =>
    vals.map((v, i) => {
      const p = polar(i, Math.min(100, v));
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    }).join(' '), [polar]);

  const ringScales = useMemo(() => [1, 0.8, 0.6, 0.4, 0.2] as const, []);

  const ringsHtml = useMemo(() =>
    ringScales.map((s, i) => {
      const pts = polyPoints(labels.map(() => s * 100));
      return <polygon key={i} fill="none" stroke="rgba(212,175,55,0.14)" strokeWidth="1" points={pts} />;
    }), [labels, polyPoints, ringScales]);

  const axesHtml = useMemo(() =>
    labels.map((_, i) => {
      const p = polar(i, 100);
      return <line key={i} x1="0" y1="0" x2={p.x} y2={p.y} stroke="rgba(212,175,55,0.24)" strokeWidth="1" />;
    }), [labels, polar]);

  const shapePoints = polyPoints(values);
  const glowPoints = polyPoints(values.map(v => Math.min(100, v * 1.08)));

  return (
    <svg
      className={`radar-chart ${animated ? 'radar-chart--animated' : ''}`}
      viewBox={`-${half} -${half} ${size} ${size}`}
      aria-hidden="true"
    >
      <defs>
        <filter id="radarDotGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {ringsHtml}
      {axesHtml}

      <polygon
        fill="rgba(212,175,55,0.08)"
        stroke="rgba(212,175,55,0.22)"
        strokeWidth="2"
        points={glowPoints}
      />
      <polygon
        className="radar-shape"
        fill="rgba(212,175,55,0.14)"
        stroke="rgba(239,211,104,0.92)"
        strokeWidth="2"
        points={shapePoints}
      />

      {values.map((v, i) => {
        const p = polar(i, v);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="5"
            fill="#f3dd91"
            stroke="rgba(13,13,13,0.8)"
            strokeWidth="2"
            filter="url(#radarDotGlow)"
          />
        );
      })}

      {showLabels && labels.map((label, i) => {
        const p = polar(i, 118);
        const anchor = Math.abs(p.x) < 10 ? 'middle' : p.x > 0 ? 'start' : 'end';
        return (
          <text
            key={i}
            x={p.x}
            y={p.y}
            fill="#bcb4a3"
            fontSize="11"
            textAnchor={anchor}
            dominantBaseline="middle"
            fontFamily="Segoe UI, Helvetica Neue, Arial, sans-serif"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
