import type { AssessmentResult, ProfileIntelligence, Domain, DomainKey } from '../types';

const domainDisplayNames: Record<DomainKey, string> = {
  leadership: 'Leadership',
  creativity: 'Creativity',
  strategy: 'Strategy',
  tech_proficiency: 'Tech Proficiency',
  problem_solving: 'Problem Solving',
  critical_thinking: 'Critical Thinking',
  adaptability: 'Adaptability',
  data_analysis: 'Data Analysis',
};

function levelColor(level: string): string {
  switch (level) {
    case 'Signature': return '#d4af37';
    case 'Strong': return '#b5952f';
    case 'Functional': return '#bcb4a3';
    case 'Developing': return '#8c8577';
    case 'Emerging': return '#e8715a';
    default: return '#bcb4a3';
  }
}

export function generateResultsPdf(
  result: AssessmentResult,
  intelligence: ProfileIntelligence,
  domains: Domain[],
): void {
  const date = new Date(result.completed_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const sortedDomains = [...domains].sort((a, b) => result.scores[b.key] - result.scores[a.key]);

  const domainRows = sortedDomains.map(d => {
    const score = result.scores[d.key];
    const level = result.levels[d.key];
    const color = levelColor(level);
    const barWidth = Math.max(2, score);
    return `
      <tr>
        <td style="padding:6px 12px;font-size:13px;color:#e6e6e6;">${d.label}</td>
        <td style="padding:6px 12px;width:50%;">
          <div style="background:rgba(255,255,255,0.06);border-radius:3px;height:8px;overflow:hidden;">
            <div style="height:100%;width:${barWidth}%;background:${color};border-radius:3px;"></div>
          </div>
        </td>
        <td style="padding:6px 12px;font-size:13px;color:${color};text-align:right;font-weight:600;font-variant-numeric:tabular-nums;">${score}</td>
        <td style="padding:6px 12px;font-size:11px;color:#8c8577;text-align:right;">${level}</td>
      </tr>`;
  }).join('');

  const strengthsList = result.top_strengths
    .map(k => `<li style="margin-bottom:4px;color:#e6e6e6;">${domainDisplayNames[k]} — ${result.scores[k]} (${result.levels[k]})</li>`)
    .join('');

  const growthList = result.growth_domains
    .map(k => `<li style="margin-bottom:4px;color:#bcb4a3;">${domainDisplayNames[k]} — ${result.scores[k]} (${result.levels[k]})</li>`)
    .join('');

  const curriculumItems = intelligence.curriculum
    .slice(0, 4)
    .map(c => `<li style="margin-bottom:6px;color:#bcb4a3;"><strong style="color:#e6e6e6;">${c.module_name}</strong> (${c.domain_label}) — ${c.estimated_time}</li>`)
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Renaissance Skills — Quick Pulse Results</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
      background: #0d0d0d;
      color: #e6e6e6;
      padding: 48px 56px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1, h2, h3, h4 { font-family: Georgia, "Palatino Linotype", serif; }
    .header { text-align: center; margin-bottom: 32px; }
    .brand { font-size: 11px; letter-spacing: 0.25em; text-transform: uppercase; color: #d4af37; }
    .date { font-size: 11px; color: #8c8577; margin-top: 6px; }
    .archetype-box {
      text-align: center; background: rgba(22,21,18,0.88);
      border: 1px solid rgba(212,175,55,0.2); border-radius: 14px;
      padding: 24px; margin-bottom: 24px;
    }
    .tag {
      display: inline-block; font-size: 10px; text-transform: uppercase;
      letter-spacing: 0.2em; color: #d4af37;
      border: 1px solid rgba(212,175,55,0.2);
      padding: 3px 10px; border-radius: 999px; margin-bottom: 8px;
    }
    .section { margin-bottom: 24px; }
    .section-title {
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
      color: #d4af37; margin-bottom: 10px;
    }
    .narrative { color: #bcb4a3; font-size: 13px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; }
    .two-col { display: flex; gap: 24px; }
    .two-col > div { flex: 1; }
    ul { list-style: none; padding: 0; }
    li::before { content: "— "; color: #d4af37; }
    .balance-box {
      display: flex; align-items: center; gap: 16px;
      background: rgba(22,21,18,0.88); border: 1px solid rgba(212,175,55,0.2);
      border-radius: 14px; padding: 16px 20px;
    }
    .balance-num { font-family: Georgia, serif; font-size: 36px; color: #d4af37; min-width: 60px; text-align: center; }
    .footer {
      text-align: center; margin-top: 32px; padding-top: 16px;
      border-top: 1px solid rgba(212,175,55,0.1);
      font-size: 10px; color: #8c8577;
      letter-spacing: 0.15em; text-transform: uppercase;
    }
    .next-steps {
      background: rgba(22,21,18,0.88); border: 1px solid rgba(212,175,55,0.2);
      border-radius: 14px; padding: 20px; margin-bottom: 24px;
    }
    .next-steps p { color: #bcb4a3; font-size: 13px; line-height: 1.55; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">Renaissance Skills</div>
    <h1 style="font-size:22px;margin-top:8px;">Quick Pulse Results</h1>
    <div class="date">${date}</div>
  </div>

  <div class="archetype-box">
    <div class="tag">${result.archetype.label}</div>
    <h2 style="font-size:20px;margin:8px 0 6px;">${result.archetype.label}</h2>
    <p style="color:#bcb4a3;font-size:13px;">${result.archetype.description}</p>
    <p style="color:#8c8577;font-size:12px;margin-top:6px;">Confidence: ${Math.round(result.archetype.confidence * 100)}%</p>
  </div>

  <div class="section">
    <div class="section-title">Domain Scores</div>
    <table>${domainRows}</table>
  </div>

  <div class="section two-col">
    <div>
      <div class="section-title">Top Strengths</div>
      <ul style="font-size:13px;">${strengthsList}</ul>
    </div>
    <div>
      <div class="section-title">Growth Domains</div>
      <ul style="font-size:13px;">${growthList}</ul>
    </div>
  </div>

  <div class="section">
    <div class="balance-box">
      <div class="balance-num">${result.balance_index}</div>
      <div>
        <div class="section-title" style="margin-bottom:4px;">Balance Index</div>
        <p style="color:#bcb4a3;font-size:12px;line-height:1.4;">${intelligence.balance_interpretation}</p>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Profile Analysis</div>
    <p class="narrative">${intelligence.narrative.summary}</p>
  </div>

  <div class="next-steps">
    <div class="section-title">What This Means For You</div>
    <p>
      Your ${result.archetype.label} profile suggests a natural orientation toward
      ${result.top_strengths.slice(0, 2).map(k => domainDisplayNames[k]).join(' and ')}.
      The most impactful next step is developing your
      ${domainDisplayNames[result.growth_domains[0]]} capability — even modest gains here will
      improve your balance index and unlock stronger cross-domain synthesis.
    </p>
    <p style="margin-top:8px;">
      ${intelligence.narrative.growth_priority}
    </p>
  </div>

  <div class="section">
    <div class="section-title">Recommended Development Path</div>
    <ul style="font-size:13px;">${curriculumItems}</ul>
  </div>

  <div class="footer">
    Renaissance Skills • Quick Pulse Assessment • renaissanceskills.com
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.addEventListener('load', () => {
    printWindow.print();
  });
}
