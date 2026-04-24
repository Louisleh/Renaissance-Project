import { useMemo } from 'react';
import { KNOWLEDGE_DOMAINS, type KnowledgeDomain } from '../../types/cards';
import { getAllCards } from '../../data/flashcards';
import type { DomainMastery } from '../../lib/progression/mastery';

interface Props {
  masteries: DomainMastery[];
  size?: number;
}

interface Node {
  domain: KnowledgeDomain;
  x: number;
  y: number;
  mastery: number;
}

interface Edge {
  a: Node;
  b: Node;
  weight: number;
}

const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;

function computeEdges(): Array<{ a: KnowledgeDomain; b: KnowledgeDomain; weight: number }> {
  const weights = new Map<string, number>();
  const key = (a: KnowledgeDomain, b: KnowledgeDomain) =>
    a < b ? `${a}|${b}` : `${b}|${a}`;

  for (const card of getAllCards()) {
    if (card.type === 'connection') {
      const k = key(card.domainA, card.domainB);
      weights.set(k, (weights.get(k) ?? 0) + 1);
    } else if (card.type === 'synthesis' || card.type === 'scenario') {
      const domains = card.domains;
      for (let i = 0; i < domains.length; i++) {
        for (let j = i + 1; j < domains.length; j++) {
          const k = key(domains[i], domains[j]);
          weights.set(k, (weights.get(k) ?? 0) + 1);
        }
      }
    }
  }

  return Array.from(weights.entries()).map(([k, weight]) => {
    const [a, b] = k.split('|') as [KnowledgeDomain, KnowledgeDomain];
    return { a, b, weight };
  });
}

const EDGE_DEFINITIONS = computeEdges();

export function Constellation({ masteries, size = 480 }: Props) {
  const masteryByDomain = useMemo(() => {
    const map = new Map<KnowledgeDomain, number>();
    for (const m of masteries) map.set(m.domain, m.mastery);
    return map;
  }, [masteries]);

  const center = size / 2;
  const radius = size * 0.36;

  const nodes: Node[] = useMemo(() => {
    return KNOWLEDGE_DOMAINS.map((domain, i) => {
      const step = (Math.PI * 2) / KNOWLEDGE_DOMAINS.length;
      const angle = i * step - Math.PI / 2 + (i % 2 === 0 ? 0 : step / GOLDEN_RATIO / 3);
      return {
        domain,
        x: center + radius * Math.cos(angle),
        y: center + radius * Math.sin(angle),
        mastery: masteryByDomain.get(domain) ?? 0,
      };
    });
  }, [center, radius, masteryByDomain]);

  const edges: Edge[] = useMemo(() => {
    const nodeByDomain = new Map(nodes.map((n) => [n.domain, n]));
    return EDGE_DEFINITIONS.map(({ a, b, weight }) => {
      const nodeA = nodeByDomain.get(a);
      const nodeB = nodeByDomain.get(b);
      if (!nodeA || !nodeB) return null;
      return { a: nodeA, b: nodeB, weight };
    }).filter((e): e is Edge => e !== null);
  }, [nodes]);

  const maxEdgeWeight = Math.max(1, ...edges.map((e) => e.weight));

  return (
    <svg
      className="journey-constellation"
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      height="auto"
      role="img"
      aria-label="Knowledge constellation showing domain mastery and cross-domain connections"
    >
      <g className="journey-constellation-edges">
        {edges.map(({ a, b, weight }) => {
          const avgMastery = (a.mastery + b.mastery) / 2;
          const opacity = 0.08 + (avgMastery / 100) * 0.4;
          const strokeWidth = 0.6 + (weight / maxEdgeWeight) * 1.8;
          return (
            <line
              key={`${a.domain}-${b.domain}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--gold)"
              strokeWidth={strokeWidth}
              opacity={opacity}
            />
          );
        })}
      </g>
      <g className="journey-constellation-nodes">
        {nodes.map((n) => {
          const ringColor = n.mastery >= 75
            ? 'var(--ring-mastered)'
            : n.mastery >= 30
              ? 'var(--ring-active)'
              : 'var(--ring-inactive)';
          const ringWidth = 2 + (n.mastery / 100) * 8;
          return (
            <g key={n.domain} className="journey-constellation-node">
              <circle cx={n.x} cy={n.y} r={14} fill="var(--bg-deep)" stroke={ringColor} strokeWidth={ringWidth} />
              <circle cx={n.x} cy={n.y} r={3} fill="var(--gold)" />
              <text
                x={n.x}
                y={n.y + 34}
                textAnchor="middle"
                fill="var(--muted-strong)"
                fontSize="10"
                fontFamily="var(--body-font)"
              >
                {n.domain}
              </text>
              <text
                x={n.x}
                y={n.y + 48}
                textAnchor="middle"
                fill="var(--gold)"
                fontSize="9"
                fontFamily="var(--body-font)"
                letterSpacing="1.5"
              >
                {n.mastery}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
