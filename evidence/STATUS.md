# Build and evidence status

Implemented: local Node server with no runtime npm dependencies; browser interface; Git bisect engine; source-preserving disposable clones; repeated endpoint and candidate/parent checks; skip/timeout/cancellation handling; target failure text; portable Node regression scripts; CLI; case archive; JSON/Markdown exports; optional local Ollama analysis; static evidence-ID validation; calculated witness for a limited class of changed comparisons.

Frontend: user requested a reference document on October 30. Further visual redesign is waiting for that document. Initial interface was browser-tested and screenshots are available; they are not the final approved design.

Copilot: CLI installed, but launch attempts reported no authentication. No Copilot review or contribution is claimed. The review prompt is ready in COPILOT_TASK.md. User has been asked to sign in; independent local acceptance testing continues.

Evaluation: evidence/evaluation.json records five controlled histories, all with the expected outcome. Three seeded regressions yielded the expected candidate. One clean range and one ambiguous skipped range correctly produced no confirmed candidate. No arbitrary-project accuracy or sequential time-saving claim follows from these five cases.

Local inference: actual CPU-only gemma3:1b Q4_K_M model, approximately 806 MB on disk. First explanation took 54.322 seconds and misdescribed the changed comparison; preserved in ai-first-attempt.json. The next explanation took 28.733 seconds with a revised prompt and a calculated comparison witness; preserved in ai-revised-attempt.json. It correctly identifies the boundary-handling area but remains vague, and its evidence choices still require review. Further prompt evaluation is ongoing. Valid evidence IDs do not prove a claim true.

Hardware: Ryzen 5 3600 as reported by Windows, six visible logical processors, 15.9 GiB total system RAM. CPU-only inference tested; actual T480 speed and memory performance remain unverified.

Browser: full demo completed using the interface, selecting commit 15/24 with 6 distinct tested revisions and 16 check executions, including repeated confirmations. The observed run took approximately 7.7 seconds. Earlier native browser automation was unavailable; in-app browser access subsequently recovered.

Submission: no public repository, hosted demo/video, published DEV article, or remote CI results are claimed yet. Frontend reference, Copilot sign-in, final screenshots, article finalization and publication remain outstanding.
