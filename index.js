// Jupyter hint coach extension using shared Step 1
(async function(codioIDE, window) {
  codioIDE.coachBot.register(
    "customHintsJupyterML",
    "ML hint button",
    onButtonPress
  );

  async function onButtonPress() {
    codioIDE.coachBot.showThinkingAnimation();

    try {
      const context = await codioIDE.coachBot.getContext();
      const environmentGuidance = await loadEnvironmentGuidance();
      const notebookContext = getNotebookContext(context);
      const studentNotebook = serializeNotebookContext(notebookContext);
      const guideInstructions = getGuideInstructions(context);
      const workedExample = getWorkedExample(context);

      const step1Result = await codioIDE.coachBot.ask({
        systemPrompt: "You locate notebook tasks and determine NOT_STARTED vs HAS_ATTEMPTED. Return only valid JSON.",
        userPrompt: "{% prompt 'AGENT_STEP_1_LOCATE_TASKS' %}",
        vars: {
          CONTEXT_TYPE: "notebook",
          STUDENT_CONTEXT: studentNotebook,
          INSTRUCTOR_REFERENCE: "",
          GUIDE_INSTRUCTIONS: guideInstructions,
          WORKED_EXAMPLE: workedExample,
          EDITABLE_TARGETS: JSON.stringify({
            type: "cells",
            source_path: notebookContext ? notebookContext.path || null : null
          }),
          TASK_BOUNDARY_HINTS: JSON.stringify({
            student_markers: [
              "# YOUR CODE HERE",
              "# END OF YOUR CODE",
              "# TODO",
              "# BEGIN STUDENT CODE",
              "## Your code here",
              "-- YOUR CODE HERE",
              "-- END OF YOUR CODE"
            ],
            solution_markers: [
              "### BEGIN SOLUTION",
              "### END SOLUTION"
            ],
            header_patterns: [
              "Part",
              "Exercise",
              "Step",
              "Question",
              "[Graded]",
              "Task",
              "Problem"
            ]
          }),
          ASSESSMENT_CONTEXT: JSON.stringify({
            opened_resource: notebookContext ? notebookContext.path || "notebook" : "notebook"
          }),
          ENVIRONMENT_GUIDANCE: JSON.stringify(environmentGuidance)
        }
      }, { stream: false, preventMenu: true });

      const step2Result = await codioIDE.coachBot.ask({
        systemPrompt: "You analyze notebook student work, select a task, and diagnose it. Return only valid JSON.",
        userPrompt: "{% prompt 'AGENT_STEP_2_ANALYZE_JUPYTER_V2' %}",
        vars: {
          CONTEXT_TYPE: "notebook",
          STUDENT_CONTEXT: studentNotebook,
          INSTRUCTOR_REFERENCE: "",
          GUIDE_INSTRUCTIONS: guideInstructions,
          WORKED_EXAMPLE: workedExample,
          EDITABLE_TARGETS: JSON.stringify({
            type: "cells",
            source_path: notebookContext ? notebookContext.path || null : null
          }),
          TASK_BOUNDARY_HINTS: JSON.stringify({
            solution_markers: [
              "### BEGIN SOLUTION",
              "### END SOLUTION"
            ]
          }),
          ASSESSMENT_CONTEXT: JSON.stringify({
            opened_resource: notebookContext ? notebookContext.path || "notebook" : "notebook"
          }),
          ENVIRONMENT_GUIDANCE: JSON.stringify(environmentGuidance),
          STEP_1: step1Result.result
        }
      }, { stream: false, preventMenu: true });

      codioIDE.coachBot.hideThinkingAnimation();

      await codioIDE.coachBot.ask({
        systemPrompt: "You construct one helpful, well-calibrated notebook hint. Return only plain text.",
        userPrompt: "{% prompt 'AGENT_STEP_3_HINT_JUPYTER_V2' %}",
        vars: {
          STUDENT_CONTEXT: studentNotebook,
          GUIDE_INSTRUCTIONS: guideInstructions,
          WORKED_EXAMPLE: workedExample,
          STEP_1: step1Result.result,
          STEP_2: step2Result.result
        }
      });
    } catch (error) {
      handlePipelineError(error);
    }
  }

  async function loadEnvironmentGuidance() {
    try {
      const response = await fetch("step1_environment_guidance_jupyter.json");
      if (!response.ok) {
        throw new Error("Unable to load step1 environment guidance");
      }
      return await response.json();
    } catch (error) {
      console.error("Guidance load error:", error);
      return {
        context_type: "notebook",
        fallback: true,
        note: "No external environment guidance could be loaded."
      };
    }
  }

  function getNotebookContext(context) {
    if (context && Array.isArray(context.jupyterContext) && context.jupyterContext.length > 0) {
      return context.jupyterContext[0];
    }
    return null;
  }

  function serializeNotebookContext(notebookContext) {
    if (!notebookContext || !Array.isArray(notebookContext.content)) {
      return "[]";
    }

    const markdownAndCodeCells = notebookContext.content
      .map(function(cell, index) {
        const clone = Object.assign({}, cell);
        delete clone.id;
        clone.cell = index;
        return clone;
      })
      .filter(function(cell) {
        return cell.type === "markdown" || cell.type === "code";
      });

    return JSON.stringify(markdownAndCodeCells);
  }

  function getGuideInstructions(context) {
    if (context && context.guidesPage && typeof context.guidesPage.content === "string") {
      return context.guidesPage.content;
    }
    return "";
  }

  function getWorkedExample(context) {
    if (context && context.guidesPage && typeof context.guidesPage.content === "string") {
      const title = String(context.guidesPage.title || "").toLowerCase();
      if (title.includes("example") || title.includes("walkthrough")) {
        return context.guidesPage.content;
      }
    }
    return "";
  }

  function handlePipelineError(error) {
    console.error("Jupyter hint pipeline error:", error);
    codioIDE.coachBot.hideThinkingAnimation();
    codioIDE.coachBot.write("I'm having trouble analyzing your notebook right now. Please try clicking the hint button again.");
    codioIDE.coachBot.showMenu();
  }
})(window.codioIDE, window);
