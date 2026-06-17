# Jupyter Hint Coach V2 Candidate

This is a staged candidate version of the Jupyter Hint Coach workflow. It is not the current production Jupyter workflow. It is intended for testing Mohit's lighter two-step Jupyter architecture before any cutover.

## Purpose

This version replaces the current three-step generalized Jupyter hint flow with a Jupyter-specific two-step pipeline:

1. a notebook task locator
2. a combined coach that verifies, classifies, and returns a single hint

The goal is to reduce payload size, simplify task detection, and improve reliability for Jupyter notebooks that use explicit `# YOUR CODE HERE` markers.

## Pipeline

This candidate uses:

1. `AGENT_LOCATOR_COACH_JUPYTER_V2`
   - Jupyter-specific locator prompt
   - identifies notebook task cells and returns a JSON task array

2. `AGENT_COACH_JUPYTER_V2`
   - Jupyter-specific combined coach prompt
   - aligns tasks to `NOTEBOOK_INSTRUCTOR_VIEW` by notebook order
   - verifies attempted tasks
   - selects the next task to address
   - returns a single non-revealing hint in JSON

## Files Used

This candidate workflow uses:

- `index_v2_candidate.js`
- `metadata.json`

It does not depend on:

- `step1_environment_guidance_jupyter.json`

That guidance file remains in the folder only because it is still used by the older Jupyter workflow.

## Required Prompt IDs

This candidate requires these Prompt Management entries:

- `AGENT_LOCATOR_COACH_JUPYTER_V2`
- `AGENT_COACH_JUPYTER_V2`

It does not use the current production Jupyter prompt IDs:

- `AGENT_STEP_1_LOCATE_TASKS`
- `AGENT_STEP_2_ANALYZE_JUPYTER_V2`
- `AGENT_STEP_3_HINT_JUPYTER_V2`

## Button Identity

For safe staged testing, this version keeps a temporary helper/button identity:

- helper id: `customHintsJupyterMLv2`
- button label: `ML hint button (v2)`

This avoids clobbering the current live Jupyter Hint Coach during testing.

If this candidate is later adopted as the production workflow, those values can be switched back to:

- `customHintsJupyterML`
- `ML hint button`

## Notes

- The locator assumes task cells are identified by `# YOUR CODE HERE`.
- The coach aligns student tasks to instructor task cells by notebook order, not by `nbgrader.grade_id`.
- The coach does not return extracted solution code in its output.
- The extension uses minimal notebook serialization and retains defensive parsing/logging for staged debugging.

## Testing Status

This candidate should be tested in a safe environment before replacing the current Jupyter workflow.

Recommended comparison notebooks include:

- `Euclidean_Distance.ipynb`
- `Facial_Recognition_System.ipynb`
- `Baby_Name_Classifier.ipynb`

## Cutover Checklist

If testing passes and this candidate is approved to replace the current Jupyter workflow:

1. Replace the live extension entry file with `index_v2_candidate.js`
   - rename it to `index.js` in the production extension bundle, or copy its contents into the production `index.js`

2. Update the helper/button identity in the extension code:
   - change `customHintsJupyterMLv2` to `customHintsJupyterML`
   - change `ML hint button (v2)` to `ML hint button`

3. Confirm Prompt Management contains:
   - `AGENT_LOCATOR_COACH_JUPYTER_V2`
   - `AGENT_COACH_JUPYTER_V2`

4. Confirm the production Jupyter extension is no longer calling:
   - `AGENT_STEP_1_LOCATE_TASKS`
   - `AGENT_STEP_2_ANALYZE_JUPYTER_V2`
   - `AGENT_STEP_3_HINT_JUPYTER_V2`

5. Update the main Jupyter extension README to describe the new two-step workflow.

6. Retest the production Jupyter workflow on multiple notebooks before retiring the old prompt path.

7. Only after a successful rollback window, decide whether to archive:
   - the old Jupyter prompt files
   - `step1_environment_guidance_jupyter.json`
   - the current production `index.js`
