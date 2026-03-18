import type { AssessmentModeConfig, ArchetypeInfo } from '../types';

export const assessmentModes: Record<string, AssessmentModeConfig> = {
  quick: {
    title: "The Quick Pulse",
    shortTitle: "Quick Pulse",
    duration: "03",
    signal: "Directional",
    archetype: "strategist",
    archetypeDisplay: "Strategist",
    summary: "Immediate baseline with fast calibration.",
    description: "Rapid onboarding for professionals who want a crisp baseline of strengths, imbalances, and immediate growth priorities.",
    heroCopy: "Rapid onboarding for fast baseline visibility.",
    profile: {
      "Leadership": 64, "Creativity": 72, "Strategy": 79,
      "Tech Proficiency": 55, "Problem Solving": 82, "Critical Thinking": 76,
      "Adaptability": 69, "Data Analysis": 52
    },
    growth: [
      { meta: "Priority 01 • Data Analysis", title: "Evidence Before Intuition", copy: "Translate qualitative judgment into measurable signals, simple experiments, and repeatable decision criteria.", foot: "4 micro-lessons • 90 minutes" },
      { meta: "Priority 02 • Tech Proficiency", title: "Tool Fluency for Non-Specialists", copy: "Build the technical literacy needed to collaborate with AI systems, automation tools, and product teams.", foot: "5 micro-lessons • 2 hours" },
      { meta: "Priority 03 • Adaptability", title: "Operating in Unfinished Environments", copy: "Learn how to change plans quickly without losing strategic coherence when evidence shifts.", foot: "3 scenarios • 70 minutes" },
      { meta: "Priority 04 • Leadership", title: "Influence Through Clarity", copy: "Strengthen narrative framing so strategic insight can move teams rather than remain personally obvious.", foot: "4 exercises • 80 minutes" }
    ],
    path: [
      { phase: "Phase I", title: "Stabilize the weakest evidence systems", copy: "Begin with data literacy so interpretation, prioritization, and tradeoffs are grounded in more than instinct.", foot: "Unlocks stronger strategic calibration" },
      { phase: "Phase II", title: "Add technical interface fluency", copy: "Learn enough tools and workflows to turn judgment into implementation leverage across product and AI environments.", foot: "Converts insight into execution" },
      { phase: "Phase III", title: "Stress-test adaptability under change", copy: "Use short simulations to practice decision updates when constraints, inputs, or goals shift unexpectedly.", foot: "Builds resilient response range" },
      { phase: "Phase IV", title: "Elevate communication and influence", copy: "Close the loop by expressing synthesis in a way that can align collaborators, stakeholders, and teams.", foot: "Turns private clarity into collective movement" }
    ],
    reading: "Placeholder: practical statistics, systems thinking, product judgment, and adaptive decision-making.",
    coaching: "Placeholder: a coach would help convert strategy into consistent weekly execution."
  },
  deep: {
    title: "The Deep Dive",
    shortTitle: "Deep Dive",
    duration: "18",
    signal: "High Fidelity",
    archetype: "polymath",
    archetypeDisplay: "Polymath",
    summary: "Scenario-based assessment with richer confidence.",
    description: "Detailed evaluation for users who want stronger archetype precision, more nuanced blind-spot mapping, and a more deliberate growth sequence.",
    heroCopy: "Detailed mapping with higher-confidence profiling.",
    profile: {
      "Leadership": 76, "Creativity": 85, "Strategy": 88,
      "Tech Proficiency": 69, "Problem Solving": 90, "Critical Thinking": 84,
      "Adaptability": 80, "Data Analysis": 66
    },
    growth: [
      { meta: "Priority 01 • Tech Proficiency", title: "From Conceptual Range to Build Capacity", copy: "Extend conceptual intelligence into direct technical execution so synthesis can materialize faster.", foot: "6 micro-lessons • 2.5 hours" },
      { meta: "Priority 02 • Data Analysis", title: "Quantitative Backbone", copy: "Sharpen numerical reasoning so broad insight is supported by rigorous evidence handling and experiment design.", foot: "4 labs • 2 hours" },
      { meta: "Priority 03 • Leadership", title: "Lead Through Translation", copy: "Convert cross-domain complexity into shared language that helps others move with confidence.", foot: "3 case studies • 75 minutes" },
      { meta: "Priority 04 • Focus Discipline", title: "Selective Depth Drills", copy: "Practice going narrow on demand without losing the broad perspective that defines the profile.", foot: "5 exercises • 95 minutes" }
    ],
    path: [
      { phase: "Phase I", title: "Increase technical embodiment", copy: "Reinforce technical build skills first so wide-ranging cognition gains a faster path to concrete artifacts.", foot: "Prevents abstraction bottlenecks" },
      { phase: "Phase II", title: "Add quantitative rigor", copy: "Introduce stronger analytics to create a firmer bridge between synthesis, evidence, and prioritization.", foot: "Improves confidence under complexity" },
      { phase: "Phase III", title: "Practice translation for teams", copy: "Focus on turning multi-domain insights into clear framing for collaborators with narrower vantage points.", foot: "Broadens impact radius" },
      { phase: "Phase IV", title: "Alternate breadth with deliberate depth", copy: "Use periodic depth sprints to ensure range remains paired with tactical credibility.", foot: "Creates a more durable Polymath profile" }
    ],
    reading: "Placeholder: systems theory, broad science, history of technology, and quantitative reasoning.",
    coaching: "Placeholder: a coach would help convert broad capability into a sharper operating cadence."
  },
  mirror: {
    title: "The LLM Mirror",
    shortTitle: "LLM Mirror",
    duration: "Private",
    signal: "Behavioral",
    archetype: "leader",
    archetypeDisplay: "Leader",
    summary: "Privacy-first synthesis from your own conversational history.",
    description: "Generate a prompt for a local LLM, paste in your own chat history privately, and return only the summarized profile to produce a skill graph.",
    heroCopy: "Private synthesis from real conversational behavior.",
    profile: {
      "Leadership": 82, "Creativity": 73, "Strategy": 75,
      "Tech Proficiency": 63, "Problem Solving": 71, "Critical Thinking": 78,
      "Adaptability": 89, "Data Analysis": 58
    },
    growth: [
      { meta: "Priority 01 • Data Analysis", title: "Make Adaptation Measurable", copy: "Pair situational flexibility with evidence handling so pivots are guided by data rather than solely by instinct.", foot: "4 labs • 85 minutes" },
      { meta: "Priority 02 • Tech Proficiency", title: "Operational Tool Literacy", copy: "Strengthen the ability to use technical systems directly when coordinating people, work, and AI-supported processes.", foot: "5 modules • 2 hours" },
      { meta: "Priority 03 • Strategic Framing", title: "From Adaptation to Architecture", copy: "Turn high responsiveness into more explicit strategic models and clearer sequencing decisions.", foot: "3 frameworks • 75 minutes" },
      { meta: "Priority 04 • Creativity", title: "Creative Expansion Sessions", copy: "Stretch imaginative range so leadership and adaptability produce more surprising, high-upside solution spaces.", foot: "4 prompts • 60 minutes" }
    ],
    path: [
      { phase: "Phase I", title: "Ground judgment in stronger evidence", copy: "Start by increasing quantitative fluency so highly adaptive decisions have a stronger signal base.", foot: "Stabilizes rapid pivots" },
      { phase: "Phase II", title: "Expand technical touchpoints", copy: "Develop enough direct technical literacy to operate with less dependence on translation layers.", foot: "Improves execution autonomy" },
      { phase: "Phase III", title: "Strengthen strategic architecture", copy: "Formalize how goals, constraints, and tradeoffs are structured so leadership becomes more reproducible.", foot: "Makes instinct legible" },
      { phase: "Phase IV", title: "Broaden idea generation", copy: "Add creative drills that increase range and allow leadership to steer toward more original outcomes.", foot: "Completes the synthesis loop" }
    ],
    reading: "Placeholder: decision science, measurement, communication under uncertainty, and creative strategy.",
    coaching: "Placeholder: a coach would help convert adaptive leadership into a disciplined skill graph."
  }
};

export const archetypeInfo: Record<string, ArchetypeInfo> = {
  polymath: {
    title: "The Polymath",
    description: "Builds unusual insight by carrying meaningful fluency across multiple disciplines at once.",
    strength: "Cross-domain pattern transfer",
    strengthCopy: "Quickly spots structural similarities between ideas, industries, and systems that appear unrelated on the surface.",
    balance: "Practice selective technical depth",
    balanceCopy: "Breadth becomes more defensible when at least one execution-heavy domain can anchor the synthesis."
  },
  strategist: {
    title: "The Strategist",
    description: "Designs coherent paths through complexity and naturally links decisions to second-order effects.",
    strength: "Systems pattern recognition",
    strengthCopy: "Excels at seeing how distinct domains influence one another before others notice the connection.",
    balance: "Increase technical and data fluency",
    balanceCopy: "Without stronger evidence handling, strategic insight risks remaining abstract rather than operational."
  },
  builder: {
    title: "The Builder",
    description: "Moves from idea to artifact quickly and tends to learn through making rather than pure abstraction.",
    strength: "Execution momentum",
    strengthCopy: "Creates tangible progress rapidly and can transform conceptual ambiguity into working systems.",
    balance: "Expand historical and strategic range",
    balanceCopy: "Execution improves when grounded in broader context, longer time horizons, and higher-level synthesis."
  },
  leader: {
    title: "The Leader",
    description: "Coordinates people, priorities, and adaptation with high social signal and strong situational response.",
    strength: "Influence under uncertainty",
    strengthCopy: "Maintains coherence across moving constraints and can mobilize others even when the environment remains fluid.",
    balance: "Deepen evidence-backed reasoning",
    balanceCopy: "Leadership compounds when paired with stronger data, sharper models, and more deliberate technical literacy."
  }
};

export const skillOrder = [
  "Leadership", "Creativity", "Strategy", "Tech Proficiency",
  "Problem Solving", "Critical Thinking", "Adaptability", "Data Analysis"
];

export const skillDescriptions: Record<string, string> = {
  "Leadership": "Your ability to align people, frame direction, and convert insight into coordinated movement.",
  "Creativity": "The range and originality of ideas you can generate when the problem is ambiguous or underdefined.",
  "Strategy": "How well you design long-range paths, sequence tradeoffs, and identify leverage in complex systems.",
  "Tech Proficiency": "Your practical fluency with tools, digital systems, and technical workflows that amplify capability.",
  "Problem Solving": "Your strength in decomposing complexity, locating constraints, and producing workable solutions.",
  "Critical Thinking": "The rigor of your reasoning, including skepticism, evidence handling, and logical coherence.",
  "Adaptability": "Your ability to update behavior, plans, and assumptions as environments change.",
  "Data Analysis": "Your capacity to interpret evidence, quantify uncertainty, and ground decisions in signal rather than narrative."
};
