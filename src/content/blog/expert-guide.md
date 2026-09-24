---
slug: guiding-llms-with-your-expertise
readingMinutes: 18
---

## 1 Where Your Expertise Fits in LLM Development

### 1.1 Two phases of LLM training (conceptual view)

You can think of modern LLM training as having two fundamentally different phases:

#### (1) Pre-training: learning language and knowledge

* Data: large-scale text corpora (books, web, code, etc.)  
* Goal: learn  
  * grammar,  
  * world knowledge,  
  * general patterns of text.  
* This phase answers:  
  **“What exists in the world?”**

#### (2) Post-training: learning preference

* Data: human-curated tasks and evaluations, often in the form of:  
  * SFT：Prompt \+ Response, examples of tasks the model should perform.  
  * RL：Prompt \+ Evaluation, encode value-based reinforcement:  
    * Responses that align with human judgment are reinforced.  
    * Responses that violate these standards are penalized.  
* Goal: align the model with  
  * human values and expectations,  
  * professional standards.  
* This phase answers:  
  **“Given a situation, what should be done or said?”**

**Your contribution sits exclusively in post-training for RL data**: you decide what good looks like.

---

### 1.2 Your role

As a domain expert, you will supply the two critical ingredients of post-training data:

1. Task background and context (**Prompt**): realistic scenarios in your field that reflect meaningful, professional challenges.  
2. Multi-dimensional evaluation (**Rubrics** / checklist-style rewards): structured criteria that capture professional values, showing which responses are acceptable, excellent, or incorrect.

---

## 2 Designing High-Value Prompts

### 2.1 What a “Prompt” Is — and What We Mean by a High-Value Prompt

At the most basic level, a Prompt is simply a question or instruction given to a language model.

Examples of ordinary Prompts include:

* “What is the capital of the UK?”  
* “How does inflation affect bond prices?”  
* “Summarize this document.”

These Prompts are valid, but they are **not what we are asking you to produce.**

---

For post-training alignment, we are interested in a specific subclass of Prompts, which we will call **High-Value Prompts**.

A High-Value Prompt is best understood as:  
**A written representation of a real decision-making situation that a competent professional in your field might realistically face, where judgment matters.**

In other words:

* A Prompt defines what the model is asked to do.  
* A High-Value Prompt defines a professional situation in which doing the right thing is non-trivial.

---

From the model’s perspective, a well-designed High-Value Prompt typically makes explicit three elements:

#### 1\. Role

Who is the model acting as?

* A senior investment analyst reviewing a portfolio adjustment,  
* A legal counsel advising a startup under regulatory uncertainty,  
* A physician deciding on a treatment plan with incomplete data,  
* A staff engineer reviewing a high-risk system design.

#### 2\. Situation

What is happening?

* Relevant background facts,  
* Practical constraints (regulatory, technical, ethical, organizational),  
* Sources of uncertainty, ambiguity, or conflict.

#### 3\. Objective

What constitutes success?

* Making a recommendation,  
* Choosing between alternatives,  
* Identifying risks and trade-offs,  
* Explaining reasoning to a stakeholder.

You can think of this as writing a concise brief to a trusted colleague—not an exam question for a student.

---

All in all, The Prompt conveys the task environment.

* When the model does not have tool-based access:  
    
  * All information required to complete the task must be explicitly included in the Prompt.  
  * This may involve long documents, datasets, logs, or multiple files.  
  * There is no upper bound on Prompt length, as long as the inputs reflect what a real professional would reasonably have access to.


* When the model has tool-based access (e.g., search, file system, shell):  
    
  * Inputs do not need to be fully inlined at the instruction level.  
  * Required materials can be placed in an accessible workspace, container, or API.  
  * The model is expected to discover, inspect, and reason over these inputs via tools—just as a human would.

---

### 2.2 Core Design Principles for High-Value Prompts

A High-Value Prompt must satisfy four non-negotiable principles. These principles work together; violating any one of them sharply reduces data quality.

---

#### (1) Realistic

The scenario should be something that could plausibly occur in real professional practice.

Ask yourself:

* “Have I personally encountered a version of this situation?”  
* “Would I believe a colleague who said they were dealing with this today?”

Avoid:

* Artificial puzzles,  
* Hypothetical edge cases that almost never arise,  
* Toy examples that remove real-world constraints.

---

#### (2) Consequential

The task should matter in a meaningful professional sense.

“Consequential” does not mean “hard for its own sake.”

It means that decisions have real stakes, such as:

* Financial impact (e.g., investment decisions, cost trade-offs),  
* Legal, regulatory, or compliance risk,  
* Patient, client, or user outcomes,  
* Reputational, operational, or systemic consequences.

A useful heuristic:  
**If getting this wrong would not meaningfully matter in the real world, the Prompt is probably too shallow.**

---

#### (3) Judgment-Driven

The correct response should require professional judgment, not recall.

Avoid Prompts where:

* There is a single textbook answer,  
* The task reduces applying a known formula,  
* The main difficulty is remembering terminology or definitions.

Instead, favor situations involving:

* Conflicting objectives,  
* Incomplete, noisy, or ambiguous information,  
* Time, budget, or regulatory constraints,  
* Trade-offs between what is technically optimal and what is practically acceptable.

A useful diagnostic question:  
**If two competent professionals disagreed on this task, would their disagreement be about judgment rather than facts?**

If yes, the Prompt is likely well-designed.

---

#### (4) Specific and Constrained

Vague Prompts produce vague learning signals.

Compare:

* “Give advice on managing risk in investments.” vs.  
* “You are advising a pension fund with a 20-year horizon, strict drawdown limits, and regulatory capital constraints during a period of rising interest rates. How should portfolio risk be adjusted, and why?”

Specificity matters for two fundamental reasons:

##### 1\. It forces reasoning within constraints

Real professional judgment is always exercised under constraints—regulatory, temporal, financial, ethical, or organizational.

A specific Prompt compels the model to reason within these constraints, rather than giving generic advice.

##### 2\. It enables meaningful evaluation via Rubrics

Rubrics (introduced in the next section) can only distinguish good responses from bad ones when the task is well-specified.

If the Prompt is too generic, almost any reasonable-sounding answer appears acceptable, making rigorous evaluation impossible.

In short:  
**A Prompt that is not specific enough cannot be evaluated reliably—and therefore cannot train the model effectively.**

---

### 2.3 What We Are Testing: Judgment, Not Knowledge

A common mistake in Prompt design is overestimating the value of testing factual knowledge.

Examples of low-value Prompts:

* “What does regulation X say about Y?”  
* “Define term Z.”  
* “What is the formula for …?”

These primarily test memory—something modern LLMs already possess in abundance.

High-Value Prompts instead test:

* Decision-making under constraints,  
* Balancing competing priorities,  
* Sensitivity to risk and second-order effects,  
* Adherence to professional norms and standards of care.

Your goal is not to ask:  
“Does the model know this?”

But rather:  
“Can the model reason and decide the way a competent professional would?”

---

### 2.4 Your Comparative Advantage as a Domain Expert

It is important to be explicit about why your expertise is irreplaceable in this process.

Non-experts can:

* Write generic questions,  
* Rephrase textbook problems,  
* Generate superficial scenarios.

Only domain experts can:

* Identify which details actually matter,  
* Encode tacit professional norms,  
* Construct scenarios where the wrong answer sounds plausible but is subtly flawed.

This tacit knowledge—what is reasonable, acceptable, or reckless in real practice—is precisely what post-training data is designed to capture.

Your Prompts are not merely inputs to a model.  
They are compressed representations of professional judgment.

---

## 3 Designing Effective Rubrics

### 3.1 What a "Rubric" Really Is — The Unit Test of Professional Judgment

If the Prompt defines the task environment, the Rubric defines how performance is judged.

A Rubric is best understood as:  
A structured, explicit representation of professional judgment that distinguishes good responses from bad ones in one single perspective.

Crucially:

* Rubrics do not describe how to solve the problem.  
* Rubrics describe how the solution will be evaluated in multiple perspectives.

A useful mental model for experts is:

**Prompt : Rubric :: Function : Unit Test**

* A Prompt defines what task is being attempted.  
* A Rubric defines whether the attempt succeeded.

In software engineering, a function without unit tests may appear to work, but failures are silent, inconsistent, and hard to diagnose. Similarly, a Prompt without Rubrics is merely a question. It does not teach the model what professional correctness actually looks like.

Rubrics play the same role that:

* Checklists play in aviation or medicine,  
* Review criteria play in legal, investment, or ethics committees,  
* Acceptance criteria play in engineering design reviews.

Concretely, a Rubric specifies:

* What properties a response must satisfy to be acceptable,  
* What differentiates an excellent response from a merely adequate one,  
* What kinds of errors are unacceptable, misleading, or dangerous.

In post-training, Rubrics are used for Evaluation, and:

* Score or rank multiple model outputs,  
* Provide reward signals for reinforcement learning (RL),  
* Reject or filter low-quality responses during data curation.

Without Rubrics, the model receives no reliable signal about what "good" actually means. With well-designed Rubrics, professional judgment becomes legible, reproducible, and learnable.

---

### 3.2 Why Rubric-Based Evaluation Is Necessary

A common intuition is to "evaluate the answer as a whole." In practice, this approach fails for three fundamental reasons.

**First, overall judgments are inherently ambiguous.**

Different evaluators focus on different aspects of a response:

* One may prioritize correctness,  
* Another risk management,  
* Another clarity, tone, or compliance.

Even when experts agree on the final verdict, they often disagree on why. This leads to inconsistent signals during training.

**Second, many high-value professional tasks have no single ground truth.**

Open-ended decisions—legal advice, investment recommendations, medical judgment, system design—do not admit a single correct answer. However, the absence of ground truth does not mean the absence of standards.

A Rubric system can:

* Fully subsume ground-truth evaluation where it exists,  
* And extend beyond it to capture judgment, trade-offs, and professional norms.

**Third, Rubrics decompose complexity into structured, multi-dimensional evaluation.**

Instead of asking "Is this response good?", Rubrics ask:

* Is it factually correct?  
* Does it address the core objective?  
* Does it respect constraints?  
* Does it manage risk appropriately?  
* Does it communicate at the right level and tone?

Each dimension is evaluated independently, with explicit criteria. This decomposition:

* Reduces ambiguity,  
* Increases inter-rater consistency,  
* Makes the evaluation process transparent and explainable.

The result is not only better training data, but also a clearer articulation of why a response is good or bad.

---

### 3.3 The Five Elements of a Rubric

Each individual Rubric criterion should be explicitly characterized along five axes. Together, these elements make evaluation precise, auditable, and complete.

#### (1) Criteria — What is being evaluated?

The criteria is the substantive requirement itself.

Examples:

* "The response should organize suggestions for toy photography backgrounds into the following three categories: Star Wars, Superheroes, Bionicle"  
* "The response should include at least one bullet point that accurately summarizes PTO accrual rules, including when PTO is earned and when accrual pauses, based solely on the provided policy document information: PTO accrues biweekly after each completed pay period and is prorated for mid-year hires or status changes. Annual accrual rates are determined by tenure as of January 1: 15 days for employees with less than three years of service, 20 days for employees with three to seven years, and 25 days for employees with more than seven years. PTO accrual pauses during unpaid leave exceeding 30 consecutive days, when an employee reaches the maximum allowable balance capped at 1.5 times the annual accrual rate, and for any pay period in which the employee takes PTO, regardless of the type of PTO used. Accrual resumes only after the employee returns to active work and the balance falls below the cap. Accrued PTO carries over year to year, subject to the cap, unless otherwise required by law."  
* "The response should use a firm tone. For example, it could use phrases like "non-negotiable" and "no excuses"."

A criterion should describe an observable property of the response, not a vague impression.

#### (2) Subjectiveness — Objective vs. Subjective

Subjectiveness describes how the satisfaction of a Rubric criterion is evaluated,

Specifically, it answers the question:  
Can this criterion be evaluated mechanically and unambiguously, or does it require human judgment?

Each criterion should be labeled as:

* **Objective**: The satisfaction of the criterion can be determined without human judgment. The evaluation is deterministic, reproducible, independent of the evaluator's preferences or interpretation.  
  * Exact format or structural requirements,  
  * Deterministic numerical or symbolic answers,  
  * Binary factual correctness that can be verified against ground truth,  
  * Explicit inclusion or exclusion of required elements.  
* **Subjective**: Dependent on evaluator's judgment or values.  
  * Whether risks are prioritized appropriately,  
  * Whether tone, caution, or confidence is appropriate for the audience.

High-quality Rubric sets deliberately include both.

The goal is not to eliminate subjectivity, but to **make explicit where subjectivity is unavoidable and meaningful.**

#### (3) Implicitness — Explicit vs. Implicit

Criteria may arise from:

* **Explicit instructions**: Directly stated in the Prompt.  
  * "Provide a recommendation and justify it."  
* **Implicit requirements**: Necessary to complete the task competently, even if unstated.  
  * Considering risks,  
  * Avoiding illegal actions,  
  * Explaining assumptions.

High-quality Rubrics always surface implicit expectations. This is where much expert value lies.

#### (4) Type — Core Intent / Extra Credit / Hurdle

Each criterion should be classified by its role:

* **Core Intent**: Central to the task's purpose.  
  * Failure here means the task was not truly completed.  
* **Extra Credit**: Enhances quality but is not essential.  
  * Demonstrates depth, foresight, or exceptional clarity.  
* **Hurdle**: A hard constraint.  
  * Violations are unacceptable regardless of other strengths (e.g., unsafe advice, legal violations).

This structure allows nuanced evaluation without collapsing everything into a single score.

#### (5) Dimension — Which aspect of performance does this test?

Common evaluation dimensions include:

* **Instruction Following**: Did the response do what was asked?  
* **Truthfulness / Correctness**: Are claims accurate and justified?  
* **Reasoning Quality**: Are trade-offs explicit and coherent?  
* **Writing Quality**: Is the response clear, structured, and readable?  
* **Tone**: Is the communication appropriate for the audience?  
* **Verbosity**: Is the level of detail appropriate?  
* ...

Explicit dimensions prevent over-weighting any single aspect by accident.

---

### 3.4 Core Design Principles for Effective Rubrics

Well-designed Rubrics obey a small number of strict principles. Violating any one of them materially degrades the training signal, regardless of how good the Prompt itself may be.

#### (1) Completeness of the Rubric Set

The Rubric set must be **complete with respect to the Prompt-defined task**, not with respect to any particular response.

Concretely:

* The Rubrics must depend **only on the Prompt**:  
  * the role,  
  * the situation,  
  * the objectives,  
  * the explicit and implicit constraints.  
* Rubrics must **not** be retrofitted to a specific model output,

Every professionally relevant requirement implied by the Prompt must be represented by at least one Rubric criterion.

A useful test:  
**If a response fails in a way that a professional would consider important, there must exist a Rubric that detects that failure.**

If such a failure mode is not captured, the Rubric set is incomplete—even if most responses appear “good enough.”

Completeness is not about having many Rubrics; it is about having Rubrics that collectively span the task’s full evaluative surface.

---

#### (2) Criteria Must Be Concrete and Unambiguous

Each Rubric criterion must specify **observable properties** of a response, not abstract qualities.

Poor criteria:

* Rely on vague adjectives (“good,” “reasonable,” “appropriate”),  
* Collapse multiple requirements into a single judgment,  
* Leave room for uncontrolled interpretation by evaluators.

Strong criteria:

* Specify what must be present, absent, or demonstrated,  
* Make failure modes explicit,  
* Allow different evaluators to reach the same conclusion given the same response.

For example, prefer criteria that answer:

* What exactly must the response do?  
* What exactly would constitute a clear failure?

Higher concreteness directly yields:

* Higher inter-rater agreement,  
* Lower evaluation noise,  
* Stronger and more stable learning signals for RL or rejection sampling.

Ambiguous criteria do not encode professional judgment; they obscure it.

---

#### (3) Closed-Form Tasks Require Explicit Ground Truth

When a task admits a correct or verifiable answer, Rubrics must encode that ground truth directly.

In such cases:

* The correct answer should be stated explicitly in the Rubric,  
* Evaluation should not rely on approximate, impressionistic, or “close enough” judgments,  
* Partial credit should be awarded only if explicitly justified by the task structure.

Examples of closed-form components include:

* Numerical results,  
* Deterministic classifications,  
* Compliance checks against well-defined rules,  
* Factual claims that can be verified unambiguously.

Rubrics are fully capable of mixing:

* Ground-truth-based criteria (for closed-form aspects),  
* Judgment-based criteria (for open-ended aspects),

within the same task.

Failing to encode ground truth when it exists introduces unnecessary ambiguity and wastes high-quality signal.

---

#### (4) Use Coverage Analysis to Audit Completeness

Completeness should not be assumed; it should be audited systematically.

After drafting the Rubrics, explicitly check coverage across the following axes:

* **Subjectiveness**: Are both objectively evaluable and judgment-dependent criteria represented where appropriate?  
* **Implicitness**: Are implicit professional requirements surfaced, not just explicit instructions?  
* **Type**: Are core intents, extra-credit signals, and hard hurdles all present?  
* **Dimension**: Are all relevant performance dimensions (e.g., correctness, reasoning, instruction following, communication) covered?

Coverage gaps are diagnostic:

* Missing dimensions often indicate unarticulated professional expectations,  
* Overconcentration in one axis (e.g., only correctness) usually signals shallow evaluation,  
* Absence of hurdles often allows professionally unacceptable responses to score well.

This coverage-based audit converts Rubric design from an intuitive activity into a structured quality-control process.

A Rubric set that passes this audit is far more likely to:

* Generalize across diverse responses,  
* Encode expert judgment faithfully,  
* Provide reliable signals for post-training alignment.

---

### 3.5 Encoding Tacit Professional Norms

The highest-value Rubrics capture what is usually left unsaid.

Junior practitioners may know the rules. Senior practitioners know what is reasonable.

Examples of tacit norms worth encoding:

* When caution is preferable to optimization,  
* When escalation is required rather than independent action,  
* When something is technically legal but still unacceptable,  
* When deferring action is better than acting decisively.

Additional examples include:

* Recognizing when uncertainty should be highlighted rather than hidden,  
* Knowing which risks are acceptable to tolerate and which are not,  
* Understanding how advice should change with audience seniority or vulnerability,  
* Identifying recommendations that are defensible in theory but reckless in practice.

A simple test:  
**If a smart but inexperienced professional could have written your Rubric, it is likely missing the expert signal.**

Your unique value lies in making implicit professional judgment explicit. Rubrics are the mechanism by which that judgment is transferred to the model.

In this sense, Rubrics are not just evaluation tools.  
They are **formalized professional wisdom**—encoded so that machines can learn it, and humans can agree on it.

---

## 4 Designing a High-Quality Dataset

While individual High-Value Prompts and Rubrics are the building blocks, the ultimate goal is to create a **Dataset**. A dataset is not merely a collection of random tasks; it is a structured "curriculum" that shapes how the model thinks and behaves across your entire professional field.

---

### 4.1 Diversity, Distribution, and the Goal of Generalization

In LLM training, we don't just want the model to "memorize" the specific examples you provide. We want it to **generalize**—to develop the ability to handle a situation it has never seen before by applying the underlying principles it learned from your data.

To achieve generalization, a dataset must prioritize **Diversity over Volume.**

* **Avoid "Clusters" of Similarity**: If a legal expert provides 100 prompts that all deal with "standard non-disclosure agreements," the model will become excellent at NDAs but remain incompetent at litigation or intellectual property.  
* **Cover the "Edge Cases"**: Generalization is built at the boundaries. A high-quality dataset includes:  
  * Common cases: The bread-and-butter of the profession.  
  * Rare but high-stakes cases: Situations that occur once a year but carry massive financial or legal risk.  
  * Conflicting cases: Where two professional "rules" contradict each other, forcing the model to weigh priorities.  
* **The "Swiss Cheese" Effect**: Every time you write a prompt that is too similar to the previous one, you are wasting effort. Think of your professional domain as a map; your goal is to place "pins" (data points) as widely as possible to cover the entire territory, rather than putting all the pins in one city.

---

### 4.2 Meta-Tagging: Creating a Balanced Curriculum

To ensure the dataset is healthy and balanced, we use **Metadata** (tags) to categorize every Prompt. This allows us to "audit" the dataset and identify gaps in the model's education.

When you submit a Prompt, you will likely be asked to provide tags such as:

* **Domain/Sub-domain**: (e.g., Finance \-\> Fixed Income \-\> Distressed Debt). a.k.a Ontology   
* **Difficulty Level**: (e.g., Junior Associate vs. Senior Partner level).  
* **Primary Capability**: (e.g., Creative Synthesis, Risk Identification, Logical Deduction, or Technical Calculation).  
* ...

**Why this matters for you**: By looking at these tags, we can see if the dataset is "skewed." If 90% of our medical data is tagged as "Diagnosis" and only 5% as "Treatment Planning," the model will be imbalanced. Your role is to help us fill the "empty" tags to ensure the model is a well-rounded professional.

---

### 4.3 The "Expert-in-the-Loop" Consistency

The final hallmark of a great dataset is **Internal Consistency**. This is where Rubrics become vital across the entire project.

If Expert A writes a Rubric that says "Always prioritize safety over speed," but Expert B writes a Rubric for a similar task saying "Prioritize speed at all costs," the model receives a conflicting signal. This effectively "cancels out" learning, leaving the model no smarter than before.

As you work on the dataset, you should:

1. **Standardize your "Hurdles"**: Ensure that what you consider "unacceptable" (e.g., a specific legal error) is treated as unacceptable across all your prompts.  
2. **Calibrate with Peers**: Periodically review how other experts in your field are defining "Excellent" (Extra Credit) vs. "Adequate" (Core Intent).

---

### 4.4 Summary: The Anatomy of a Gold-Standard Dataset

A "Gold-Standard" dataset produced by experts should look like this:

* **High Information Density**: Every prompt teaches the model something new.  
* **Wide Distribution**: It covers the full spectrum of the industry.  
* **Rigorous Rubrics**: It provides a "Unit Test" that the model cannot "cheat" or bypass.  
* **Real-World Messiness**: It includes the nuances, the "gray areas," and the professional secrets that can't be found in a textbook.

**Your Final Goal**: You are not just "labeling data." You are codifying the "unwritten rules" of your profession. When the LLM is deployed, it will rely on the boundaries and values you have set in this dataset to serve as a safe, competent, and reliable professional partner.
