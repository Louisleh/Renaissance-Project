import type { CourseModule, CurriculumData, DomainKey, Lesson } from '../types';

function buildCourse(
  id: string,
  domain: DomainKey,
  title: string,
  description: string,
  difficulty: CourseModule['difficulty'],
  prerequisites: DomainKey[],
  lessons: Lesson[]
): CourseModule {
  return {
    id,
    domain,
    title,
    description,
    difficulty,
    prerequisites,
    lessons,
    lesson_count: lessons.length,
    estimated_minutes: lessons.reduce((total, lesson) => total + lesson.estimated_minutes, 0),
  };
}

const courses: CourseModule[] = [
  buildCourse(
    'leadership_influence',
    'leadership',
    'Influence Through Clarity',
    'Build the leadership habit of creating direction, alignment, and follow-through without relying on force or charisma alone.',
    'foundation',
    ['adaptability'],
    [
      {
        id: 'leadership_01_01',
        title: 'Framing a Clear Direction',
        type: 'read',
        estimated_minutes: 15,
        content: {
          body: `Leadership usually breaks down before execution begins. People do not resist work as often as they resist confusion. When a group is uncertain about what matters most, what "good" looks like, or how a choice connects to the larger mission, effort fragments. Clarity is therefore not a soft skill layered on top of leadership. It is the core mechanism that allows a group to move in the same direction.

Start with three questions whenever you lead a project, conversation, or decision:

- What outcome are we actually pursuing?
- What constraint matters most right now?
- What tradeoff are we willing to make and what tradeoff are we not willing to make?

This framing matters because teams often confuse activity with progress. A leader who can name the desired outcome, the constraints, and the real tradeoffs gives people a mental map. That map reduces rework and prevents local optimization, where one person improves their piece while damaging the overall system.

Strong direction-setting is short, concrete, and repeatable. If a teammate cannot restate the goal in plain language after hearing it once, the framing is not finished. Try expressing direction in a single sentence, followed by a short list of non-negotiables. Then test it by asking others to play it back in their own words.

Leadership clarity is not about sounding authoritative. It is about reducing ambiguity so good people can make aligned decisions even when you are not in the room.`,
          takeaway: 'Good leadership often begins by reducing ambiguity. If people can restate the goal, constraints, and tradeoffs, you have created usable direction.',
          reading: { title: 'The 7 Habits of Highly Effective People', author: 'Stephen R. Covey' },
        },
      },
      {
        id: 'leadership_01_02',
        title: 'Stakeholder Alignment Map',
        type: 'exercise',
        estimated_minutes: 20,
        content: {
          body: `Most stalled initiatives are not blocked by effort. They are blocked by misaligned incentives, fears, or assumptions between stakeholders. Skilled leaders do not wait for conflict to reveal itself late. They surface it early and create alignment deliberately.

Build a simple stakeholder map with four columns:

- Stakeholder
- What they care about
- What they fear losing
- What they need to say yes

This exercise forces you to leave the comfort of your own logic. A recommendation that looks obvious from your vantage point may feel risky, expensive, or politically costly from another person's vantage point. Alignment improves when you translate the same initiative into language each stakeholder can actually use.

Once the map is complete, rank stakeholders by influence and by uncertainty. High-influence, high-uncertainty stakeholders should receive the earliest communication. Your goal is not to manipulate them. Your goal is to reduce preventable surprise and create informed commitment.

Finally, draft one sentence for each stakeholder that explains why this work matters to them specifically. That discipline prevents generic communication and reveals where your case is still weak.`,
          prompt: 'Pick one real project. Create a 4-column stakeholder map for at least five people or groups. Then write one tailored alignment sentence for each.',
          takeaway: 'Alignment improves when you translate one initiative into several stakeholder-specific cases for action.',
          reading: { title: 'Crucial Conversations', author: 'Kerry Patterson, Joseph Grenny, Ron McMillan, and Al Switzler' },
        },
      },
      {
        id: 'leadership_01_03',
        title: 'Delegation Without Abdication',
        type: 'scenario',
        estimated_minutes: 18,
        content: {
          body: `Scenario: You assign an important workstream to a capable teammate. Two weeks later, the work is drifting. The teammate is busy, assumptions were never clarified, and the final output is now off track. Many leaders respond in one of two bad ways: they either take the work back entirely or become vague and passive again. Neither builds leadership capacity.

Good delegation is not merely assigning a task. It is transferring ownership with enough structure that the other person can succeed independently. That structure usually includes:

- the desired outcome
- the decision boundaries
- the review checkpoints
- the risks that need escalation

Delegation fails when ownership and authority are mismatched. If someone is responsible for delivery but has no authority to make key choices, they will stall. If they have full authority but no shared success criteria, they may move fast in the wrong direction.

When you delegate, specify what is fixed and what is flexible. For example: the deadline is fixed, the output quality bar is fixed, but the method is flexible. Then set one early checkpoint focused on assumptions rather than polished output. Early checkpointing catches drift while it is still cheap to correct.

The aim of delegation is not to stay distant. It is to create enough scaffolding that someone else can grow into the work.`,
          prompt: 'Think of one task you should stop owning personally. Write a delegation brief with outcome, decision boundaries, review checkpoints, and escalation triggers.',
          takeaway: 'Delegation works when ownership, authority, and clarity move together. Without all three, tasks either drift or boomerang back.',
        },
      },
      {
        id: 'leadership_01_04',
        title: 'Feedback Loops That Compound Trust',
        type: 'reflection',
        estimated_minutes: 15,
        content: {
          body: `Trust is often described as a feeling, but in teams it is built through repeated feedback loops. People trust leaders who help them see reality more clearly, not leaders who avoid tension until problems become expensive.

Useful feedback has three qualities. First, it is specific. "This is not working" is vague; "the recommendation is strong but the evidence is thin in sections two and three" is usable. Second, it is timely. Feedback delivered long after the moment of leverage becomes blame or autobiography. Third, it is directional. It tells a person not only what is weak, but what to do next.

You can improve team trust by making feedback normal, small, and consistent. Instead of reserving feedback for major failures or formal reviews, build short loops into regular work. Ask:

- What became clearer this week?
- Where did we lose signal?
- What is the next highest-leverage adjustment?

These questions keep attention on learning instead of ego protection. They also signal that correction is part of progress, not evidence of incompetence.

Reflect on your own pattern: do people get clearer after interacting with you, or only judged? Strong leadership is not conflict avoidance. It is the ability to help people face reality without losing momentum or dignity.`,
          prompt: 'Reflect on the last time you gave or avoided feedback. What signal did the other person need, what made it hard to say, and how could you have made it more specific and actionable?',
          takeaway: 'Trust compounds when feedback is specific, timely, and directional. The goal is clearer action, not emotional release.',
          reading: { title: 'Thanks for the Feedback', author: 'Douglas Stone and Sheila Heen' },
        },
      },
    ]
  ),
  buildCourse(
    'creativity_cross_domain',
    'creativity',
    'Cross-Domain Idea Generation',
    'Learn how to produce more original options by delaying judgment, importing ideas across fields, and reframing constraints.',
    'foundation',
    [],
    [
      {
        id: 'creativity_01_01',
        title: 'Divergence Before Judgment',
        type: 'read',
        estimated_minutes: 15,
        content: {
          body: `Many people think they lack creativity when the real problem is sequence. They judge too early. Creativity depends on separating idea generation from idea selection long enough to let surprising options appear.

In practice, most weak ideation sessions collapse because someone asks "Which one is best?" before there is a field of possibilities to choose from. Premature evaluation narrows the search space to what feels familiar, defensible, or safe. That can be useful later, but it kills novelty early.

Use a simple two-stage rule:

- Stage one: increase option count without evaluating.
- Stage two: evaluate options using explicit criteria.

During divergence, force variation. Generate at least one idea that is cheaper, one that is faster, one that is more radical, and one that borrows from another field entirely. If all your ideas live on the same branch of the tree, you are still thinking inside one frame.

During convergence, shift gears and ask which option has the best mix of upside, feasibility, and learning value. The goal is not to keep every idea alive. The goal is to create enough variation that the final choice is meaningfully better than your first instinct.

Creativity is not random inspiration. It is disciplined expansion before disciplined selection.`,
          takeaway: 'Originality often comes from sequence, not magic: diverge broadly first, then evaluate with intent.',
          reading: { title: 'A Technique for Producing Ideas', author: 'James Webb Young' },
        },
      },
      {
        id: 'creativity_01_02',
        title: 'Analogical Transfer Practice',
        type: 'exercise',
        estimated_minutes: 20,
        content: {
          body: `Cross-domain thinkers often solve better problems because they notice structural similarities between situations that look unrelated on the surface. This is analogical transfer: moving a pattern from one domain into another where it creates new leverage.

To practice it, begin with the challenge in front of you. Describe its structure in plain terms. Is it a queueing problem, a trust problem, a signal problem, a coordination problem, or a constraint problem? Once you have the structure, search other domains where that same structure appears.

For example:

- A product adoption problem may resemble habit formation.
- A communication bottleneck may resemble network routing.
- A hiring funnel problem may resemble a leaky pipeline.

The transfer matters because it gives you new moves. When you borrow a model from another field, you import not only language but solution patterns, metrics, and failure modes.

The discipline is to transfer the structure, not the surface. If you imitate visible details from another field without understanding the underlying mechanics, the analogy becomes decoration. But if you transfer a real causal pattern, you widen your strategic toolkit quickly.`,
          prompt: 'Take one live problem. Name its deeper structure, find two unrelated fields with the same structure, and write one usable tactic you can import from each.',
          takeaway: 'Analogies are powerful when they transfer structure, not surface detail. Ask what kind of system the problem really is.',
        },
      },
      {
        id: 'creativity_01_03',
        title: 'Constraint Reframing Sprint',
        type: 'scenario',
        estimated_minutes: 18,
        content: {
          body: `Scenario: Your team says a goal is impossible because there is not enough time, budget, or authority. Constraints are real, but teams often treat the first visible constraint as the final truth. Creative work begins by questioning whether the frame around the constraint is too narrow.

Try reframing the challenge through four questions:

- What if the constraint is fixed but the format is flexible?
- What if the timeline is fixed but the scope can change?
- What if the budget is fixed but the partnership model can change?
- What if the original target is wrong and a smaller proxy outcome creates more learning?

Constraint reframing does not mean magical thinking. It means treating constraints as design inputs rather than conversation stoppers. A rigid team asks, "Can we do it?" A creative team asks, "What version of success is still available under these conditions?"

This approach often produces solutions that are less perfect but more real. It also reduces the emotional paralysis that comes from assuming only one path counts as success.

The most useful reframe is often the one that preserves the learning objective while shrinking the cost of action.`,
          prompt: 'Choose a current constraint. Write three alternate versions of success that still advance the underlying objective under the current limits.',
          takeaway: 'Constraints do not end creativity. They define the boundaries inside which better framing becomes valuable.',
        },
      },
      {
        id: 'creativity_01_04',
        title: 'Synthesis Notebook Review',
        type: 'reflection',
        estimated_minutes: 12,
        content: {
          body: `Creative synthesis gets stronger when you build a habit of capturing fragments before they disappear. Many strong ideas are not created in one sitting. They are assembled later from observations, models, and questions recorded over time.

Keep a synthesis notebook with four recurring sections:

- surprising observations
- models worth reusing
- unresolved questions
- cross-domain connections

The purpose is not volume. It is retrieval. You are building a personal library of raw material that your future self can combine. Over time, this reduces the blank-page problem because you are no longer starting from zero.

Review the notebook weekly. Ask:

- Which notes describe the same hidden pattern?
- Which observation now matters more because of something new I learned?
- Which old question can now be answered or reframed?

This review turns isolated fragments into a network. That network is often where original synthesis appears.

Creative people do not just generate. They notice, collect, and recombine.`,
          prompt: 'Review your recent notes, bookmarks, or idea fragments. Identify two that connect unexpectedly and write a one-paragraph synthesis that combines them into a new direction.',
          takeaway: 'Creativity compounds when you capture fragments and revisit them. Synthesis is easier when raw material is already waiting for you.',
        },
      },
    ]
  ),
  buildCourse(
    'strategy_systems',
    'strategy',
    'Systems Mapping and Leverage',
    'Learn to see the system before acting, anticipate second-order effects, and sequence moves for durable advantage.',
    'intermediate',
    ['critical_thinking'],
    [
      {
        id: 'strategy_01_01',
        title: 'Draw the System Before You Move',
        type: 'read',
        estimated_minutes: 18,
        content: {
          body: `Strategy often fails when people mistake a visible event for the whole system. A bad quarter, a slow launch, or a misaligned team may feel like isolated issues, but they usually sit inside a set of recurring relationships: incentives, delays, dependencies, bottlenecks, and feedback loops.

Before proposing action, map the system at a simple level:

- What are the main actors or components?
- What flows between them: information, money, effort, approval, trust?
- Where are the delays?
- Which nodes create outsized downstream effects?

This map changes the quality of your decision-making. Instead of asking, "What should we do next?" you begin asking, "Where would a small change alter the trajectory of the whole system?"

Leverage is rarely where the noise is loudest. It often sits in one of three places:

- a repeated bottleneck
- a hidden incentive
- a missing feedback loop

Systems mapping also protects you from symbolic action. If an intervention looks dramatic but changes none of the underlying relationships, it will create motion without improvement.

The strategist's advantage is not seeing more details than everyone else. It is seeing how the details connect.`,
          takeaway: 'Map the system before prescribing action. Leverage becomes clearer when you can see actors, flows, delays, and feedback loops together.',
          reading: { title: 'Thinking in Systems', author: 'Donella H. Meadows' },
        },
      },
      {
        id: 'strategy_01_02',
        title: 'Second-Order Consequences',
        type: 'scenario',
        estimated_minutes: 18,
        content: {
          body: `Scenario: A leader wants a fast performance gain, so they impose a strong incentive tied to one short-term metric. The metric improves immediately, but collaboration falls, quality declines, and downstream teams absorb the hidden cost. This is a classic second-order failure.

First-order thinking asks, "What happens right after we act?" Strategic thinking asks, "What happens next, and then what?" The point is not to become paralyzed by complexity. The point is to avoid naive interventions that simply move the cost elsewhere.

Before acting, ask:

- What behavior will this incentive increase?
- What behavior might it quietly discourage?
- Who bears the second-order cost if the first-order metric improves?
- What does success look like one quarter later, not just one week later?

You will not predict every consequence. That is not the standard. The standard is to identify the most likely distortions before you scale the decision.

Second-order thinking is especially important when a metric, policy, or shortcut creates local gains by weakening the broader system. Good strategy is not only about selecting the right target. It is also about choosing targets that do not create expensive side effects.`,
          prompt: 'Take one policy, metric, or incentive from your environment. Write the likely first-order benefit, then list at least three plausible second-order costs or distortions.',
          takeaway: 'First-order gains are easy to spot. Strategic maturity comes from anticipating what the intervention changes after the initial win.',
        },
      },
      {
        id: 'strategy_01_03',
        title: 'Strategic Sequencing Canvas',
        type: 'exercise',
        estimated_minutes: 20,
        content: {
          body: `Strong strategy is not just about picking good moves. It is about sequencing them so each step increases the value of the next. The wrong move at the wrong time can waste a good idea.

Use a simple sequencing canvas with four columns:

- outcome you want
- capabilities required
- capabilities you already have
- capabilities you must build first

This reveals whether the next step should be execution, capability-building, or proof-gathering. For example, if you need broad adoption later, but currently lack trust and evidence, the right first move may be a small pilot rather than a full launch.

Good sequencing often follows this pattern:

- reduce uncertainty
- build capability
- create proof
- scale intentionally

This order prevents teams from scaling fragility. It also makes tradeoffs visible. If you skip evidence, you may move fast into the wrong system. If you over-invest in preparation, you may never expose the idea to reality.

The strategist's job is to know what must be true before the next move becomes wise.`,
          prompt: 'Pick one important goal. Fill in the four-column sequencing canvas and identify the next move that increases the probability of the move after it.',
          takeaway: 'Strategy is partly sequencing. The best next step is the one that makes later steps stronger, cheaper, or less risky.',
        },
      },
    ]
  ),
  buildCourse(
    'tech_fluency',
    'tech_proficiency',
    'Tool Fluency for Non-Specialists',
    'Build the practical technical literacy needed to collaborate with software, data, automation, and AI systems without becoming an engineer.',
    'foundation',
    [],
    [
      {
        id: 'tech_01_01',
        title: 'Technical Mental Models for Non-Engineers',
        type: 'read',
        estimated_minutes: 18,
        content: {
          body: `Tech fluency begins when you stop treating software as magic. You do not need to write production code to think more technically. You do need a few stable mental models.

Start with these:

- Inputs become outputs through rules.
- Every system has interfaces where one component hands off to another.
- Most failures are mismatches between assumptions, data, permissions, timing, or format.

These models are valuable because they change how you ask questions. Instead of saying "the system is broken," you begin asking:

- What input triggered this?
- What rule or transformation is happening?
- Where is the handoff failing?
- What assumption about format, access, or timing is wrong?

Technical fluency is less about memorizing jargon and more about understanding how systems are shaped. When you have these models, conversations with technical teams become more precise. You can describe problems more clearly, understand constraints faster, and recognize where automation or tooling could remove friction.

The practical test of fluency is simple: can you explain a process as a system of inputs, rules, and outputs? If yes, you are already thinking more technically than most non-specialists.`,
          takeaway: 'Tech fluency starts with mental models, not terminology. Think in inputs, outputs, rules, interfaces, and assumptions.',
          reading: { title: 'Code', author: 'Charles Petzold' },
        },
      },
      {
        id: 'tech_01_02',
        title: 'APIs, Data, and Interfaces Without Jargon',
        type: 'read',
        estimated_minutes: 18,
        content: {
          body: `Many modern workflows are stitched together through interfaces. An API is simply a structured way for one system to request something from another. A database is a place where structured information lives. A user interface is one way humans interact with the system.

You do not need low-level implementation knowledge to work well with these ideas. You do need to understand the roles they play.

Think of it this way:

- the interface is how a request is made
- the data is what is stored or moved
- the logic is what happens in between

This matters for product, operations, and strategy because almost every modern capability depends on these interactions. When you understand where the interface ends and the underlying logic begins, you can describe requirements more clearly and avoid asking for impossible combinations.

For example, if a report is wrong, is the issue the displayed interface, the underlying data, or the transformation logic? Different answers mean different fixes. Non-specialists who can distinguish those layers are easier to collaborate with and faster at triaging problems.

Technical communication improves when you specify the layer you are actually talking about.`,
          takeaway: 'Separate interface, data, and logic. Many technical misunderstandings come from mixing those layers together.',
          reading: { title: 'Designing Data-Intensive Applications', author: 'Martin Kleppmann' },
        },
      },
      {
        id: 'tech_01_03',
        title: 'Automation Spotting Drill',
        type: 'exercise',
        estimated_minutes: 20,
        content: {
          body: `Automation opportunities are often hidden in plain sight. They live inside repetitive steps, copy-paste work, manual approvals, recurring formatting, and status-chasing behavior. The challenge is not just to notice them, but to describe them clearly enough that they can be improved.

Use this drill on a workflow you touch frequently:

- list every step in order
- mark which steps are repetitive
- note where information is manually transferred
- identify where decisions are rule-based versus judgment-based

Then ask three questions:

- Which steps could be templated?
- Which could be triggered automatically?
- Which should stay human because they depend on nuance or trust?

This distinction matters. Good automation does not remove humans from everything. It removes humans from predictable, low-value repetition so attention can move toward higher-judgment work.

The outcome of this drill is not necessarily a perfect automation build. It is a better map of where technical leverage exists.`,
          prompt: 'Choose one recurring workflow and break it into steps. Mark at least two steps that could be templated or automated and explain why.',
          takeaway: 'Automation thinking starts with process visibility. You must see repetition clearly before you can remove it intelligently.',
        },
      },
      {
        id: 'tech_01_04',
        title: 'Working With AI as a Thought Partner',
        type: 'scenario',
        estimated_minutes: 18,
        content: {
          body: `Scenario: You are using an AI system to speed up research, writing, or problem-solving. The temptation is to treat the output as either magic or junk. Both reactions waste value. AI works best when treated as an accelerant inside a structured loop.

That loop is:

- frame the task precisely
- generate options or drafts
- critique the output
- refine based on gaps

The quality of the first prompt matters, but not as much as the quality of your review. Strong users do not merely ask better questions. They audit the response for unsupported claims, missing context, shallow reasoning, or poorly chosen assumptions.

AI collaboration is strongest when you use it for:

- option generation
- summarization
- pattern surfacing
- first-draft structure

It is weakest when you outsource final judgment, especially in ambiguous or high-stakes contexts.

Your advantage is not that the model knows more than you do. Your advantage is that you can combine speed from the model with discernment from your own reasoning.`,
          prompt: 'Take a task you often do manually. Write the prompt you would give an AI system, then list the three checks you would apply before trusting the output.',
          takeaway: 'AI is most useful when it accelerates a judgment loop you still own. Prompting matters, but review matters more.',
        },
      },
      {
        id: 'tech_01_05',
        title: 'Translate Requirements Into Technical Language',
        type: 'reflection',
        estimated_minutes: 15,
        content: {
          body: `Many cross-functional failures come from weak translation. A non-technical stakeholder describes what they want in terms of outcomes or feelings, while a technical team needs a clearer statement of behavior, constraints, and success criteria.

Better requirement language usually answers five questions:

- What should happen?
- Under what conditions?
- For whom?
- What constraints matter?
- How will we know it works?

For example, "make reporting easier" is vague. "Reduce manual weekly reporting time from two hours to twenty minutes for account managers, without losing drill-down visibility" is much more actionable.

Reflect on recent requests you made. Did they specify the desired behavior, or only the hoped-for benefit? Did they clarify edge cases? Did they define success in measurable terms?

Technical teams are not hard to work with because they love complexity. They are hard to work with when the request remains ambiguous. Translation is a leverage skill because it shortens the gap between intention and implementation.`,
          prompt: 'Take one recent vague request and rewrite it into a clearer requirement using behavior, conditions, constraints, and success criteria.',
          takeaway: 'Better technical collaboration often depends on clearer translation. Requirements improve when they describe behavior, constraints, and measurable success.',
        },
      },
    ]
  ),
  buildCourse(
    'problem_solving_constraints',
    'problem_solving',
    'Constraint Decomposition',
    'Learn how to define the real problem, identify the governing constraint, and improve solutions iteratively under real-world limits.',
    'foundation',
    [],
    [
      {
        id: 'problem_01_01',
        title: 'Define the Real Problem',
        type: 'read',
        estimated_minutes: 15,
        content: {
          body: `Weak problem-solving often begins with solving the first problem that appears instead of the real one underneath it. Symptoms are visible; causes are not. If you frame the symptom as the problem, you can work hard and still miss the system that creates it.

Ask three framing questions before jumping into solutions:

- What is happening?
- Why is it happening?
- What would be different if the problem were solved?

The third question matters because it pushes you toward outcome rather than activity. A good problem statement describes the gap between the current state and the desired state, not just the annoyance people feel.

For example, "meetings are too long" may really be "decisions are not being made during meetings because ownership and prework are unclear." Those lead to very different interventions.

Strong problem solvers also test whether the stated problem belongs to the right level. Is this an individual skill issue, a workflow issue, an incentive issue, or a measurement issue? Clarity about level helps prevent shallow fixes.

You do not need perfect diagnosis before acting. You do need a better question than the one most people start with.`,
          takeaway: 'The quality of your solution is constrained by the quality of your problem framing. Fix the framing first.',
          reading: { title: 'Are Your Lights On?', author: 'Donald C. Gause and Gerald M. Weinberg' },
        },
      },
      {
        id: 'problem_01_02',
        title: 'Find the Constraint That Governs the System',
        type: 'exercise',
        estimated_minutes: 18,
        content: {
          body: `Every system has many friction points, but only a few actually govern throughput or quality. If you try to improve everything at once, you dilute effort. If you find the real constraint, you create leverage.

To identify the governing constraint, trace where work, information, or decisions slow down consistently. Look for:

- queues
- handoff delays
- repeated escalation
- scarce expertise
- approval bottlenecks

Then ask whether the constraint is physical, informational, behavioral, or structural. A physical constraint might be staffing capacity. An informational constraint might be poor data quality. A behavioral constraint might be avoidance of hard decisions.

Once identified, do not immediately optimize the entire surrounding system. First elevate the constraint directly. If that changes the flow, you were probably looking at the right thing. If nothing changes, you may have identified noise rather than the governing limit.

Problem-solving improves when you can distinguish between symptoms that are annoying and constraints that actually control the outcome.`,
          prompt: 'Map one workflow with delays. Name the likely governing constraint, explain why it matters more than nearby friction points, and propose one direct intervention.',
          takeaway: 'Not every friction point deserves equal effort. Find the constraint that governs the system before you optimize around it.',
        },
      },
      {
        id: 'problem_01_03',
        title: 'Expand the Solution Space Before Picking',
        type: 'scenario',
        estimated_minutes: 18,
        content: {
          body: `Scenario: A problem is urgent and everyone wants a fix today. Under pressure, teams often latch onto the first plausible solution. That may feel decisive, but it creates a hidden risk: the search space collapses before better options are considered.

Good problem solvers briefly widen the solution space before choosing. A useful practice is to force at least four categories of options:

- remove the problem source
- reduce the impact
- detect it earlier
- recover faster when it happens

This structure prevents tunnel vision. It also surfaces different resource profiles. Sometimes the best fix is not prevention; it is faster detection. Sometimes the best move is not building something new; it is removing a harmful rule.

Urgency does not justify a narrow search. It just means your widening step must be disciplined and short. Even five minutes spent generating varied categories of solutions can change the quality of the final choice substantially.

The goal is not endless ideation. It is to make sure the selected fix defeated real alternatives, not just the absence of alternatives.`,
          prompt: 'Take a live problem and list one option in each of the four categories: remove, reduce, detect, recover. Then choose the best first move and explain why.',
          takeaway: 'Better problem-solving comes from a wider solution space. Generate categories of options before selecting one path.',
        },
      },
      {
        id: 'problem_01_04',
        title: 'Iterate With Evidence, Not Ego',
        type: 'reflection',
        estimated_minutes: 15,
        content: {
          body: `A good solution is rarely perfect on the first pass. What matters is whether you update it intelligently. Many teams confuse persistence with competence and keep defending a weak solution long after reality has given them better information.

Iteration works best when you define in advance what evidence would make you revise the plan. Ask:

- What would count as success?
- What would count as partial success?
- What signal would tell us we are wrong?

This pre-commitment matters because it lowers the emotional cost of changing course later. If the revision criteria are known up front, adaptation feels like discipline rather than failure.

Reflect on a recent solution you backed strongly. Did you monitor it against explicit signals, or mainly against your own attachment to the idea? The most effective problem solvers preserve conviction about the goal while staying loose about the method.

Iteration is not just repetition. It is learning under feedback.`,
          prompt: 'Choose one recent initiative and write the signals that would justify staying the course, adjusting the solution, or abandoning it entirely.',
          takeaway: 'Iteration becomes smarter when you define revision signals before your ego gets attached to the first solution.',
        },
      },
    ]
  ),
  buildCourse(
    'critical_thinking_assumptions',
    'critical_thinking',
    'Assumption Testing',
    'Strengthen your reasoning by separating claims from evidence, spotting common distortions, and updating beliefs under uncertainty.',
    'foundation',
    [],
    [
      {
        id: 'critical_01_01',
        title: 'Separate Claim, Evidence, and Assumption',
        type: 'read',
        estimated_minutes: 18,
        content: {
          body: `Critical thinking begins with separation. In most conversations, people blur together three different things:

- the claim being made
- the evidence supporting it
- the assumptions connecting the evidence to the claim

When those layers blur, weak reasoning feels stronger than it is. You can improve instantly by naming them explicitly. If someone says, "This initiative will improve retention," ask:

- What exactly is the claim?
- What evidence supports it?
- What assumptions make that evidence relevant?

Often the assumption is where the real weakness lives. For example, strong results in one context may not transfer to another. A user survey may not predict real behavior. An average metric may hide variation that matters.

Separating the layers does not make you cynical. It makes you precise. The goal is not to dismiss everything. It is to know what must be true before the conclusion deserves confidence.

This habit is especially valuable under pressure, when plausible stories can outrun the evidence behind them.`,
          takeaway: 'Reasoning gets sharper when you separate the claim, the evidence, and the assumptions binding them together.',
          reading: { title: 'The Scout Mindset', author: 'Julia Galef' },
        },
      },
      {
        id: 'critical_01_02',
        title: 'Common Reasoning Traps in Real Decisions',
        type: 'scenario',
        estimated_minutes: 18,
        content: {
          body: `Scenario: A team continues investing in a weak initiative because they have already spent months on it. Another team rejects a good idea because it came from a person they distrust. A manager overweights one dramatic anecdote while ignoring the broader pattern. These are reasoning traps, not intelligence failures.

Three traps are especially common:

- sunk cost bias: continuing because of what has already been spent
- confirmation bias: searching for support more eagerly than contradiction
- availability bias: overvaluing what is vivid, recent, or emotionally sticky

You do not eliminate these biases through self-confidence. You reduce them through process. Build routines that ask:

- What would disconfirm this?
- If we were deciding today from scratch, would we still choose this?
- Are we overweighting one memorable case over the base rate?

Reasoning traps matter because they silently distort judgment while preserving the feeling of rationality. A strong thinker is not someone who never makes biased moves. It is someone who has built procedures that catch them earlier.

Good critical thinking often looks less like brilliance and more like disciplined error-checking.`,
          prompt: 'Describe one decision where sunk cost, confirmation, or availability bias might be distorting your judgment. What process check would correct it?',
          takeaway: 'Bias is easier to manage through structure than through willpower. Build checks that expose the trap before it governs the decision.',
        },
      },
      {
        id: 'critical_01_03',
        title: 'Bayesian Updating in Everyday Judgment',
        type: 'exercise',
        estimated_minutes: 20,
        content: {
          body: `Bayesian updating sounds mathematical, but the underlying habit is simple: start with an initial belief, then revise it as new evidence arrives. Many people do one of two things instead: they never revise, or they swing wildly with every new signal.

Better updating has three steps:

- state your current belief clearly
- rate how strong the new evidence really is
- move your belief proportionally, not dramatically

Suppose you believe a project has a high chance of success because a pilot looked promising. New evidence arrives showing adoption is lower in a second user segment. You should not necessarily abandon the project, but your confidence should change. The question is not "Was I right or wrong?" The question is "How much should this new signal move me?"

This habit is useful well beyond statistics. It teaches intellectual flexibility without chaos. You keep a model of the world, but you let evidence reshape it.

The skill to build is proportional revision. Weak thinkers cling or swing. Strong thinkers update.`,
          prompt: 'Write down one current belief you hold with medium confidence. Then name one recent piece of evidence that should move that belief up or down, and explain by how much.',
          takeaway: 'Critical thinking improves when beliefs move proportionally with evidence. Update without clinging and without overreacting.',
        },
      },
    ]
  ),
  buildCourse(
    'adaptability_change',
    'adaptability',
    'Operating Under Change',
    'Build the capacity to stay coherent when plans change, environments shift, and ambiguity increases.',
    'foundation',
    [],
    [
      {
        id: 'adaptability_01_01',
        title: 'Stability in Ambiguous Contexts',
        type: 'read',
        estimated_minutes: 15,
        content: {
          body: `Adaptability is not the same as constant motion. People who react to every new signal immediately often feel adaptive, but they can become directionless. Real adaptability combines flexibility with a stable internal frame.

That frame usually contains three things:

- the objective you are still trying to reach
- the assumptions you are testing
- the signals that would justify a pivot

When those are clear, ambiguity becomes more manageable. You may not know the right method yet, but you still know what you are trying to learn or achieve. Without that frame, uncertainty turns into emotional noise.

One reason ambiguity feels draining is that the mind wants closure. It prefers a wrong answer over an unresolved situation. Adaptability means resisting that urge long enough to gather better signal.

A practical move is to name what is stable and what is changing. Example: the market is changing, the timeline is changing, but the customer problem we are solving remains stable. That distinction preserves orientation.

Adaptive people are not comfortable because they know everything. They are stable because they know which parts of the map still hold.`,
          takeaway: 'Adaptability requires a stable frame. Separate what is changing from what still remains true.',
          reading: { title: 'Antifragile', author: 'Nassim Nicholas Taleb' },
        },
      },
      {
        id: 'adaptability_01_02',
        title: 'Revise the Plan, Not the Goal',
        type: 'scenario',
        estimated_minutes: 18,
        content: {
          body: `Scenario: Your original project plan no longer fits the new conditions. Some people cling to the old plan because changing it feels like failure. Others abandon the goal entirely because the first route closed. Adaptability requires a more mature distinction: the goal may stay stable while the plan changes substantially.

Begin by asking:

- What outcome still matters?
- Which assumptions behind the original plan are no longer valid?
- What smaller step now creates the best learning or forward motion?

This shifts attention from defending the old plan to redesigning the path. In volatile contexts, plan revision is not an exception. It is part of the job.

The challenge is emotional as much as cognitive. People often over-identify with the original plan because it represented competence and certainty. Strong adaptability means letting reality edit the method without experiencing that as a loss of identity.

When conditions change, do not ask only, "Can we still do what we planned?" Also ask, "What is the smartest version of progress now?"`,
          prompt: 'Take one current plan that is under pressure. Identify the stable goal, the assumptions that broke, and the new next step that fits present reality better.',
          takeaway: 'Adaptability improves when you hold goals with conviction but methods with flexibility.',
        },
      },
      {
        id: 'adaptability_01_03',
        title: 'Context Switching With Deliberate Recovery',
        type: 'reflection',
        estimated_minutes: 15,
        content: {
          body: `Modern work often demands rapid switching between contexts, but frequent switching carries a hidden tax: cognitive residue. Part of your attention remains attached to the last task while you try to enter the next one. Over time this reduces quality, increases stress, and creates the illusion that you are busy while actually fragmented.

Adaptability is not just the ability to switch. It is the ability to recover cleanly after the switch.

Use a short reset ritual:

- close the previous loop with one sentence about its status
- write the next task's objective in one sentence
- name the first concrete action before you begin

This ritual lowers transition friction. It also reduces the temptation to carry diffuse anxiety from one context into another.

Reflect on your own switching pattern. Do you end tasks clearly, or do you abandon them mid-thought and drag them mentally into the next block? Recovery is a hidden part of adaptability because it protects your attention from becoming permanently scattered.

You do not need fewer contexts every time. You need cleaner transitions between them.`,
          prompt: 'Describe your current switching pattern. What residue do you carry between tasks, and what reset ritual could reduce that carryover this week?',
          takeaway: 'Adaptability includes recovery. Clean transitions protect attention and improve performance under change.',
        },
      },
    ]
  ),
  buildCourse(
    'data_evidence',
    'data_analysis',
    'Evidence Before Intuition',
    'Build a practical evidence habit so your judgments rely on signal, baselines, and experiments rather than narrative alone.',
    'foundation',
    ['critical_thinking'],
    [
      {
        id: 'data_01_01',
        title: 'Think in Baselines and Distributions',
        type: 'read',
        estimated_minutes: 18,
        content: {
          body: `Data analysis begins with a simple question: compared to what? A number without a baseline is often just decoration. If customer satisfaction rises to 78, is that good? It depends on the previous value, the target, the normal variance, and the comparative benchmark.

Good evidence habits start with baselines:

- historical baseline: what has usually happened here?
- comparative baseline: what happens in similar contexts?
- expected baseline: what result would we predict without intervention?

You also need to think beyond averages. Many decisions fail because people rely on a single average that hides variation. A system with an average outcome of "fine" may still contain serious risk if the distribution is unstable or skewed.

Ask:

- Is this result typical or exceptional?
- How much variation is hidden behind the average?
- Are we seeing a real shift or normal fluctuation?

This mindset protects you from overreacting to noise and from underreacting to important signal.

Data analysis is not only about spreadsheets. It is about refusing to let isolated numbers speak without context.`,
          takeaway: 'Numbers become meaningful when attached to a baseline and interpreted with variation in mind, not just an average.',
          reading: { title: 'How to Measure Anything', author: 'Douglas W. Hubbard' },
        },
      },
      {
        id: 'data_01_02',
        title: 'Read a Metric Without Being Misled',
        type: 'scenario',
        estimated_minutes: 18,
        content: {
          body: `Scenario: A dashboard shows a positive headline number, so leadership assumes everything is improving. But the number is aggregated across segments with very different patterns. One segment improved sharply while another collapsed. The headline metric told a true story, but not the whole story.

Metrics mislead when they are:

- too aggregated
- divorced from denominator context
- optimized without understanding tradeoffs

Before trusting a metric, ask:

- What exactly is being counted?
- What is the denominator?
- Which segments behave differently?
- What behavior would someone change if they chased this number?

That last question matters because metrics shape behavior. If a metric can improve while the system worsens elsewhere, it is an incomplete steering signal.

This does not mean metrics are useless. It means good analysts read them with structural curiosity. They want to know what the metric is compressing, what it hides, and how it could be gamed.

Metrics are signals. They are not reality itself.`,
          prompt: 'Choose one metric you use regularly. Write what it counts, what denominator matters, which segments should be split out, and how the metric could be gamed.',
          takeaway: 'A metric is only as useful as your understanding of what it compresses, hides, and incentivizes.',
        },
      },
      {
        id: 'data_01_03',
        title: 'Design a Small Useful Experiment',
        type: 'exercise',
        estimated_minutes: 20,
        content: {
          body: `One of the fastest ways to improve judgment is to replace argument with experiment where possible. A good experiment does not need to be large. It needs to answer a concrete question with less ambiguity than a purely verbal debate.

Start with:

- the question you are trying to answer
- the minimum change worth testing
- the metric that would show movement
- the time window for observing results

Keep the experiment small enough that failure is cheap and learning is fast. Large, slow experiments often fail because they try to answer too many questions at once. A good small experiment isolates one variable or one decision sufficiently to create usable signal.

Also define what would count as success, partial success, and failure before you run the test. This protects you from rewriting the rules after seeing the result.

The value of experimentation is not only better data. It is faster alignment. Teams argue less when the next step is a well-defined test rather than a philosophical battle.`,
          prompt: 'Draft a small experiment for one live question. State the question, the smallest intervention, the success metric, and the observation window.',
          takeaway: 'Experiments create faster, cleaner signal when they are narrow, measurable, and defined before the results arrive.',
        },
      },
      {
        id: 'data_01_04',
        title: 'Metrics That Change Behavior',
        type: 'reflection',
        estimated_minutes: 15,
        content: {
          body: `Every metric is also an intervention. Once a number is tracked, people begin reacting to it. That means metrics should be chosen not only for descriptive power, but for the behavior they encourage.

Reflect on three kinds of metrics:

- vanity metrics: impressive, easy to report, but weakly tied to meaningful outcomes
- operational metrics: useful for monitoring process health
- decision metrics: directly support tradeoffs and action

The most valuable metrics are the ones that cause better decisions. They reduce ambiguity and guide attention toward the highest-leverage actions. Vanity metrics may create energy, but they often encourage superficial wins that look good in reporting while leaving the real system untouched.

Ask yourself:

- If this metric improves, what meaningful outcome should improve with it?
- Could people game this metric while harming the true objective?
- Does this metric change what we do next, or does it simply decorate the slide?

Evidence becomes powerful when it informs behavior, not merely observation.`,
          prompt: 'Review one metric dashboard you use. Identify one vanity metric, one operational metric, and one decision metric. If a decision metric is missing, define it.',
          takeaway: 'Choose metrics that improve decisions, not just presentations. Good measurement changes behavior in the right direction.',
        },
      },
    ]
  ),
];

export const curriculumData: CurriculumData = {
  version: 1,
  courses,
};

export const curriculumCourses = curriculumData.courses;

export function getCourseById(courseId: string): CourseModule | undefined {
  return curriculumCourses.find((course) => course.id === courseId);
}

export function getCourseByDomain(domain: DomainKey): CourseModule | undefined {
  return curriculumCourses.find((course) => course.domain === domain);
}

export function getCourseByModuleName(moduleName: string): CourseModule | undefined {
  return curriculumCourses.find((course) => course.title === moduleName);
}
