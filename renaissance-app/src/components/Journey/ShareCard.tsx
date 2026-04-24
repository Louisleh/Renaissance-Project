import { useCallback, useMemo, useRef, useState, type ReactElement } from 'react';
import { KNOWLEDGE_DOMAINS, type KnowledgeDomain } from '../../types/cards';
import type { MasterySnapshot } from '../../lib/progression/mastery';
import { computeStreak } from '../../lib/progression/streak';
import { loadReviewLog } from '../../lib/srs/review-log';
import { loadCommonplaceEntries } from '../../lib/progression/commonplace';

interface Props {
  snapshot: MasterySnapshot;
}

const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase();
}

export function ShareCard({ snapshot }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [copied, setCopied] = useState(false);

  const streak = useMemo(() => computeStreak(loadReviewLog()), []);
  const commonplaceCount = useMemo(() => loadCommonplaceEntries().length, []);

  const width = 1080;
  const height = 1080;
  const cx = width / 2;
  const cy = height / 2 + 40;
  const radius = 280;

  const masteryByDomain = useMemo(() => {
    const map = new Map<KnowledgeDomain, number>();
    for (const d of snapshot.domains) map.set(d.domain, d.mastery);
    return map;
  }, [snapshot]);

  const nodes = useMemo(() => {
    return KNOWLEDGE_DOMAINS.map((domain, i) => {
      const step = (Math.PI * 2) / KNOWLEDGE_DOMAINS.length;
      const angle = i * step - Math.PI / 2 + (i % 2 === 0 ? 0 : step / GOLDEN_RATIO / 3);
      return {
        domain,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        mastery: masteryByDomain.get(domain) ?? 0,
        angle,
      };
    });
  }, [cx, cy, radius, masteryByDomain]);

  const today = new Date().toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const downloadPng = useCallback(async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const svgBlob = new Blob([`<?xml version="1.0" standalone="no"?>\n${source}`], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('svg load failed'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `renaissance-${sanitizeFilename(today)}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  }, [today]);

  const copySummary = useCallback(async () => {
    const text = [
      `Renaissance · ${today}`,
      `Synthesis ${snapshot.synthesis_index} · ${snapshot.synthesis_level}`,
      `${snapshot.total_reviewed} cards reviewed · ${Math.round(snapshot.overall_coverage * 100)}% coverage`,
      `${streak}-day streak · ${commonplaceCount} commonplace entries`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [commonplaceCount, snapshot, streak, today]);

  return (
    <div className="share-card">
      <div className="share-card-preview">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="share-card-svg"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <radialGradient id="shareBg" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#1a1712" />
              <stop offset="100%" stopColor="#0d0d0d" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width={width} height={height} fill="url(#shareBg)" />

          <text
            x={cx}
            y={130}
            textAnchor="middle"
            fill="#d4af37"
            fontSize="22"
            fontFamily="Iowan Old Style, Georgia, serif"
            letterSpacing="6"
          >
            RENAISSANCE
          </text>
          <text
            x={cx}
            y={180}
            textAnchor="middle"
            fill="#e6e6e6"
            fontSize="40"
            fontFamily="Iowan Old Style, Georgia, serif"
          >
            {today}
          </text>

          {nodes.map((n) => {
            const edges: ReactElement[] = [];
            for (const other of nodes) {
              if (other.domain <= n.domain) continue;
              const avg = (n.mastery + other.mastery) / 2;
              if (avg < 30) continue;
              const opacity = Math.min(0.5, 0.1 + (avg / 100) * 0.4);
              edges.push(
                <line
                  key={`${n.domain}-${other.domain}`}
                  x1={n.x}
                  y1={n.y}
                  x2={other.x}
                  y2={other.y}
                  stroke="#d4af37"
                  strokeWidth="1"
                  opacity={opacity}
                />,
              );
            }
            return <g key={`edges-${n.domain}`}>{edges}</g>;
          })}

          {nodes.map((n) => {
            const ringColor = n.mastery >= 75 ? '#d4af37' : n.mastery >= 30 ? 'rgba(212,175,55,0.55)' : 'rgba(212,175,55,0.18)';
            const ringWidth = 3 + (n.mastery / 100) * 14;
            const labelOffset = 55;
            const labelX = n.x + labelOffset * Math.cos(n.angle);
            const labelY = n.y + labelOffset * Math.sin(n.angle);
            return (
              <g key={n.domain}>
                <circle cx={n.x} cy={n.y} r={22} fill="#0d0d0d" stroke={ringColor} strokeWidth={ringWidth} />
                <circle cx={n.x} cy={n.y} r={5} fill="#d4af37" />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fill="#bcb4a3"
                  fontSize="16"
                  fontFamily="Segoe UI, Arial, sans-serif"
                >
                  {n.domain}
                </text>
                <text
                  x={labelX}
                  y={labelY + 22}
                  textAnchor="middle"
                  fill="#d4af37"
                  fontSize="14"
                  fontFamily="Segoe UI, Arial, sans-serif"
                  letterSpacing="2"
                >
                  {n.mastery}
                </text>
              </g>
            );
          })}

          <g transform={`translate(${cx}, ${height - 220})`}>
            <text textAnchor="middle" fill="#e6e6e6" fontSize="96" fontFamily="Iowan Old Style, Georgia, serif">
              {snapshot.synthesis_index}
            </text>
            <text y={40} textAnchor="middle" fill="#d4af37" fontSize="20" letterSpacing="8" fontFamily="Segoe UI, Arial, sans-serif">
              SYNTHESIS INDEX · {snapshot.synthesis_level.toUpperCase()}
            </text>
          </g>

          <g transform={`translate(${cx}, ${height - 80})`}>
            <text textAnchor="middle" fill="#bcb4a3" fontSize="22" fontFamily="Segoe UI, Arial, sans-serif">
              {snapshot.total_reviewed} reviewed · {Math.round(snapshot.overall_coverage * 100)}% coverage · {streak}-day streak
            </text>
          </g>
        </svg>
      </div>
      <div className="share-card-actions">
        <button type="button" className="hero-button" onClick={() => void downloadPng()}>
          Download PNG
        </button>
        <button type="button" className="ghost-button" onClick={() => void copySummary()}>
          {copied ? 'Copied!' : 'Copy summary text'}
        </button>
      </div>
      <p className="share-card-note">
        Everything in this card comes from your local data only. Nothing is uploaded.
      </p>
    </div>
  );
}
