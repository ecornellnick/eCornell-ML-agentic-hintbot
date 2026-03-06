                                                                                                                                      
                                                                                                                                                                        
  An agentic hint system for Jupyter notebook programming assignments. When a student clicks "Give me a hint", the system analyzes their notebook and provides a
  single, well-calibrated hint that guides them without revealing the solution.

  Architecture: Chained Prompting/Pipeline

  The original implementation (prompts/teds-prompt.md) was a single prompt that handled everything in one LLM call: locating exercises, selecting which to
  address, verifying correctness, classifying errors, and constructing the hint.

  This has been decomposed into a 3-agent pipeline where each agent has a focused responsibility and passes structured output to the next:

  Student clicks "Give me a hint"
           │
     index.js collects notebook context
           │
     ┌─────▼──────────────────────────┐
     │  Agent 1: Locate (Step 1)      │
     │  Input:  Notebook, Solution    │
     │  Output: JSON                  │
     │  - Finds all exercises         │
     │  - Determines NOT_STARTED /    │
     │    HAS_ATTEMPTED status        │
     └─────┬──────────────────────────┘
           │
     ┌─────▼──────────────────────────┐
     │  Agent 2: Analyze (Steps 2-4)  │
     │  Input:  Notebook, Solution,   │
     │          Agent 1 JSON          │
     │  Output: JSON                  │
     │  - Selects exercise to address │
     │  - Verifies correctness        │
     │  - Classifies & diagnoses      │
     └─────┬──────────────────────────┘
           │
     ┌─────▼──────────────────────────┐
     │  Agent 3: Hint (Step 5)        │
     │  Input:  Notebook,             │
     │          Agent 1 JSON,         │
     │          Agent 2 JSON          │
     │  Output: Plain text hint       │
     │  - Constructs the hint         │
     │  - Applies the Reveal Test     │
     │  - NO solution access          │
     └─────┬──────────────────────────┘
           │
     Hint displayed to student

  Key design decision: Agent 3 does NOT receive the instructor solution notebook (INSTRUCTOR_VIEW). It only gets the processed diagnosis from Agent 2. This reduces the
  risk of solution leakage into the student-facing hint.

  How index.js Works

  1. Collects the student's open Jupyter notebook context via codioIDE.coachBot.getContext()
  2. Filters to only markdown and code cells
  3. Calls Agent 1 (locate) — validates the response is valid JSON
  4. Calls Agent 2 (analyze) — passes Agent 1's output, validates the response is valid JSON
  5. Calls Agent 3 (hint) — passes both Agent 1 and Agent 2 outputs, streams the plain text result to the student

  If any agent returns malformed JSON or an unexpected error occurs, a fallback message is shown and the menu is re-displayed so the student can try again.

  Prompt Management Setup

  The prompt files in the prompts/ directory must be added to Codio Org-Level Prompt Management. Each file must be saved with the following prompt id (this is what index.js
  references via {% prompt '...' %}):

  ┌────────────────────────────────┬────────────────────────┐
  │              File              │ Prompt Management Name │
  ├────────────────────────────────┼────────────────────────┤
  │ prompts/agent_step_1_locate.md │ AGENT_STEP_1_LOCATE    │
  ├────────────────────────────────┼────────────────────────┤
  │ prompts/agent_step_2_and_3.md  │ AGENT_STEP_2_ANALYZE   │
  ├────────────────────────────────┼────────────────────────┤
  │ prompts/agent_step_3_hint.md   │ AGENT_STEP_3_HINT      │
  └────────────────────────────────┴────────────────────────┘

  The INSTRUCTOR_VIEW variable (*.ipynb) is automatically injected by Codio for Agents 1 and 2 based on the filepath pattern in the prompt. Agent 3 does not use
  INSTRUCTOR_VIEW by design.

  prompts/teds-prompt.md is the original prompt, kept for reference. It is not used in the pipeline.
