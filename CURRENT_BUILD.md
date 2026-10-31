# Current build: October 31, 2026

This prerelease is a snapshot requested by the owner, not a final hackathon submission or a production-ready release.

## Run the prebuilt edition

Download `time-of-death-prebuilt.zip` from this repository's Releases page. Extract the entire ZIP, install Node.js 22.13+ and Git if necessary, and open `Start-Time-of-Death.cmd` on Windows. Standard local mode needs no npm install or paid service. Other platforms can run `node server.mjs` from the extracted folder and open the printed loopback address.

Optional Ollama models and framework integrations require their documented setup. Credentials and local case data are excluded from the upload.

## Included

- Local Git investigations, readiness checks, execution receipts and exports.
- Coroner workspace, flowing Bayer background at 20% opacity and a nine-step spotlight tour.
- Three bundled display-font choices, with Cormorant Garamond selected by default.
- Optional local AI, Mastra workflow, Temporal recovery and Sentry instrumentation.
- Historical evidence, licenses, independent Copilot reports and unchanged bug reproducers.

## Known blocker

`test/copilot-retest.test.mjs` currently fails. A patch can leave the direct check entry point unchanged, weaken a helper it imports, and receive a `passed` verification. The assertion has been preserved. A passing receipt is not sufficient to establish check integrity for arbitrary repositories.

Copilot's earlier post-fix run reported 42 passing tests and this one failure. Subsequent UI work has focused build, render and placement checks; those results do not replace a fresh full acceptance run. Real-browser validation of the latest tour, focus behavior and motion remains pending. T480 performance is a design target, not a completed hardware benchmark.

GitHub Actions is disabled for this private snapshot upload. CI is not claimed green, and the upload does not start hosted jobs. The workflow file remains available for later use.
