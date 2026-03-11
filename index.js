// Wrapping the whole extension in a JS function 
// (ensures all global variables set in this extension cannot be referenced outside its scope)
(async function(codioIDE, window) {

  // register(id: unique button id, name: name of button visible in Coach, function: function to call when button is clicked) 
  codioIDE.coachBot.register("customHintsJupyterML", "ML hint button", onButtonPress)

  // function called when I have a question button is pressed
  async function onButtonPress() {

    codioIDE.coachBot.showThinkingAnimation()

    // automatically collects all available context 
    let context = await codioIDE.coachBot.getContext()
    // console.log(context)
    
    // select open jupyterlab notebook related context
    let openJupyterFileContext = context.jupyterContext[0]
    // let jupyterFileName = openJupyterFileContext.path
    let jupyterFileContent = openJupyterFileContext.content
    
    // filter and map cell indices of code and markdown cells into a new array
    const markdownAndCodeCells = jupyterFileContent.map(
        ({ id, ...rest }, index) => ({
              cell: index,
            ...rest
        })).filter(
            obj => obj.type === 'markdown' || obj.type === 'code'
        )
    const str_student_jupyter = JSON.stringify(markdownAndCodeCells)
    console.log("code and markdown", str_student_jupyter)

    function handlePipelineError(label, e) {
      console.error(label, e)
      codioIDE.coachBot.hideThinkingAnimation()
      codioIDE.coachBot.write("I'm having trouble analyzing your notebook right now. Please try clicking the hint button again.")
      codioIDE.coachBot.showMenu()
    }

    try {
      // Agent 1: Locate exercises and determine status
      const step1Result = await codioIDE.coachBot.ask({
        systemPrompt: "You are an assistant that locates exercises in Jupyter notebooks and determines their status. Return only valid JSON.",
        userPrompt: "{% prompt 'AGENT_STEP_1_LOCATE' %}",
        vars: {
          "JUPYTER_NOTEBOOK": str_student_jupyter,
        }
      }, {stream: false, preventMenu: true})
      console.log("Step 1 result:", step1Result.result)

      /* Commented out per Mohit's Email
      try { JSON.parse(step1Result.result) } catch (e) {
        handlePipelineError("Step 1 returned invalid JSON:", e)
        return
      }
      */
      // Agent 2: Select exercise, verify correctness, classify, and diagnose
      const step2Result = await codioIDE.coachBot.ask({
        systemPrompt: "You are an assistant that analyzes student code to select, verify, classify, and diagnose exercises. Return only valid JSON.",
        userPrompt: "{% prompt 'AGENT_STEP_2_ANALYZE' %}",
        vars: {
          "JUPYTER_NOTEBOOK": str_student_jupyter,
          "STEP_1": step1Result.result,
        }
      }, {stream: false, preventMenu: true})
      console.log("Step 2 result:", step2Result.result)

      /* Commented out per Mohit's Email
      try { JSON.parse(step2Result.result) } catch (e) {
        handlePipelineError("Step 2 returned invalid JSON:", e)
        return
      }
      */
      
      codioIDE.coachBot.hideThinkingAnimation()
      // Agent 3: Construct the hint (no INSTRUCTOR_VIEW to prevent solution leakage)
      const step3Result = await codioIDE.coachBot.ask({
        systemPrompt: "You are an assistant that constructs helpful, well-calibrated hints for students. Return only plain text.",
        userPrompt: "{% prompt 'AGENT_STEP_3_HINT' %}",
        vars: {
          "JUPYTER_NOTEBOOK": str_student_jupyter,
          "STEP_1": step1Result.result,
          "STEP_2": step2Result.result,
        }
      })
    } catch (e) {
      handlePipelineError("Hint pipeline error:", e)
    }
  }

})(window.codioIDE, window)
