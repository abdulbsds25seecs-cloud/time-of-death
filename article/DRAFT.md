---
title: I Built a Time Machine That Finds the Commit That Broke My App
published: false
tags: devchallenge, hf26challenge, git, opensource
---

<!-- WORKING DRAFT. Apply the official DEV submission template before publishing.
Final frontend reference, public repository, demo/video, Copilot review and final inference evaluation are still outstanding.
Do not publish with these editor notes or unresolved links. -->

A session should stop working at its expiration time. In the test repository I created, a one-character change made it valid for that exact instant instead.

There were 24 commits in the selected history. The failure was easy to reproduce. Finding the change was the interesting part.

I built **Time of Death**, a local tool that searches Git history for the first failing boundary, keeps the execution evidence, and asks an open-weight model to help explain it. The demonstration is deliberately synthetic: I planted the bug so I could check the investigator's answer.

## What I Built

You give the tool a repository, a known working revision, a later failing revision, and a command that reproduces the problem. It tests revisions in a disposable clone and draws the results on a timeline.

The result is a small case file: the candidate commit, a passing parent, the relevant diff, captured output from every check, and an optional local AI autopsy with references back to that evidence.

Git bisect does the search. I did not invent a new search algorithm. The work here is making the investigation visible, preserving the user's working tree, handling inconclusive cases, and turning the evidence into a report someone else can inspect.

Repository: **[add the actual public repository URL before publication]**.

## Demo

<!-- Insert the final frontend screenshot and real demo/video link. -->

The bundled repository starts with this condition:

```js
return now < expiresAt;
```

At commit 15, it becomes:

```js
return now <= expiresAt;
```

My check requires a session to be rejected when `now` equals `expiresAt`. At the candidate commit, that check fails. At its parent, it passes.

One browser run tested six distinct revisions in the 24-commit range. It executed the command 16 times because endpoint checks and final confirmation were repeated. The recorded run took about 7.7 seconds on my development machine. That number excludes AI inference and is not a benchmark for a large application.

There is also a portable-check option. If the regression test you wrote today did not exist in older commits, you can replay the same Node script in each revision. It is injected only into the disposable clone.

## Ghost in the Machine

The ghost is an old decision that still affects the current program. The interface follows the history until that change becomes visible, then preserves the evidence around it.

I wanted the theme to describe what the tool does, not just its colors. A broken build gets an investigation, an observed boundary, and an autopsy report.

## How It Works

The application uses Node's built-in HTTP server, a plain browser interface, Git, and optional Ollama inference. It has no runtime npm dependencies and no frontend build step.

Before searching, it checks that the working endpoint passes and the failing endpoint reproduces the failure. It runs selected revisions repeatedly. A timeout is not marked as a bad commit. Exit code 125 means the revision cannot be tested. Inconsistent outcomes and ambiguous skipped commits produce an inconclusive result.

When the search converges, it reruns the candidate and its parent. Only then does it produce a confirmed boundary.

For the AI autopsy, Gemma receives a bounded packet containing the diff and the confirmation logs. Its response contains hypotheses, suggested next checks, and evidence identifiers. The application rejects identifiers that do not exist in the packet. Those checks validate references, not the truth of the model's interpretation.

## What the Tests Showed

I evaluated five controlled histories with two executions of each selected revision. These measurements were taken on Windows, Node 24.14.0, and a Ryzen 5 3600 system reporting six logical processors and 15.9 GiB of RAM. The synthetic repositories had no external package dependencies. AI inference was not part of these timings.

| Controlled case | Commits in range | Expected outcome | Observed outcome | Check executions | Duration (s) |
| --- | ---: | --- | --- | ---: | ---: |
| Early regression | 16 | Known candidate | Correct candidate | 16 | 6.895 |
| Middle regression | 24 | Known candidate | Correct candidate | 16 | 5.599 |
| Late regression | 24 | Known candidate | Correct candidate | 18 | 6.289 |
| No regression | 8 | Reject failing endpoint | Inconclusive | 4 | 1.808 |
| Ambiguous skipped revisions | 8 | No unique candidate | Inconclusive | 12 | 5.137 |

All five outcomes matched their expected result. The two inconclusive cases matter: returning a confident hash would have been the wrong answer. Five controlled cases do not establish reliability across arbitrary repositories. I did not measure a sequential wall-time baseline, so I am not claiming a percentage reduction in debugging time.

The acceptance suite also exercises dirty tracked and untracked files, invalid ranges, missing modules, unrelated failures, hanging checks, cancellation, alternating results, report generation, and HTTP request boundaries. The exact test output is saved with the project.

## The Small Model Was Wrong Before It Was Useful

My first CPU-only Gemma 3 1B response took 54.322 seconds. It referenced real evidence but described the changed comparison in the wrong direction. The citation checks accepted its identifiers. They could not make its reasoning correct.

I kept that failed response rather than replacing it with a success claim. I revised the prompt to emphasize old versus new behavior and added a calculated example for a limited class of simple changed comparisons. At equal numeric inputs, the tool can calculate the old and new comparison results without evaluating repository code.

The next recorded response took 28.733 seconds and correctly pointed to the boundary-handling area, but remained vague. **[Update this paragraph with the final reviewed inference attempt; keep the earlier failure and distinguish prompt changes from model capability.]**

The model is a second reader, not the authority deciding which revision passed. Hypotheses remain labeled and suggested checks are not executed automatically.

## Why Open Weights Matter Here

Debugging evidence can contain private source code, internal names and logs. With a local Ollama endpoint, the evidence stays on that machine. The model can be replaced, the report remains readable without it, and there is no per-request API bill.

I also wanted the tool to remain useful on modest hardware. Git checks run sequentially. Inference is deferred until after the search. Gemma is requested to unload after each explanation. A CPU-only 8 GB laptop is a design target, but I have not tested an actual ThinkPad T480 and will not claim its performance from desktop measurements.

Gemma is open-weight under its own terms. Git, Node and Ollama have their own licenses. The model and third-party binaries are not bundled with this project's source.

## What Does Not Work Yet

- This version supports linear selected histories, not ranges containing merges.
- Bisection assumes the selected check has a reproducible good-to-bad transition. A bug that appears, disappears, and reappears can violate that assumption.
- Historical dependencies are not installed automatically. A dependency-free check is the easiest starting point.
- Cloning isolates Git state, not arbitrary code execution. Users must trust the repository and check command.
- Local AI can misinterpret a valid diff. Valid evidence references are not semantic verification.

## Prize Categories

- **Best Use of Gemma:** local open-weight interpretation of the candidate diff and measured check outcomes, with evidence-linked reports and documented model failures.
- **GitHub Copilot:** **[List only after an actual qualifying contribution is completed and documented. An installed CLI and an unsigned review prompt are not a contribution.]**

## Try It

Install Node 22+ and Git, then run:

```powershell
node server.mjs
```

Open `http://127.0.0.1:4317`, load the synthetic demo, and start the investigation. For local explanations, install Ollama and download `gemma3:1b`.

**[Final repository link] · [Real demo/video link] · [Recorded evaluation evidence]**

<!-- Editing basis: the user's DEV_article_writing_guide.md. No private anecdote, adoption claim, benchmark or Copilot contribution has been invented. -->
