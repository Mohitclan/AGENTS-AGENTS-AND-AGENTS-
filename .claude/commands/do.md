---
description: Hand the team any task; it runs the whole chain on autopilot and gives you the finished result and a report
argument-hint: <the task, in plain words>
disable-model-invocation: true
---

Run this task on autopilot, as described under "Autopilot" in your agent file: $ARGUMENTS

Run the whole chain to a finished result without asking me anything between steps. Write the report to `outputs/reports/<first task ID>.md`, then show me the Result section, what needs my approval and my questions, and end with the JARVIS block.
