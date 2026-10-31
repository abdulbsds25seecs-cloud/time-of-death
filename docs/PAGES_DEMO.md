# Hosted recorded demo

Live URL: https://abdulbsds25seecs-cloud.github.io/time-of-death/

GitHub Pages serves the prebuilt static files in docs/demo, with docs/index.html forwarding visitors there. The source is demo/; rebuild from the repository root with npm run build:demo. The build prepares the public historical case, removes recording workstation paths and generates three reports. No credentials, local report archive, paid service, Node server or Ollama process is deployed.

The app supports replay/pause/full recording, revision selection, saved receipts, original diff, portable patch verification and a reviewed recorded model response. No user repository or command input is accepted. It is an evidence explorer, not a live investigation service.

Pages uses main:/docs and a .nojekyll marker. Local account credentials remain excluded. The app's standard local build and launch command are unchanged. Article drafts remain ignored and local.

Verification: demo production build and focused DOM tests pass. The fresh complete local suite passed 56 tests with zero failures; output is in evidence/pages-acceptance-tests.txt. Public HTML, JS, CSS, fonts, all three reports and the anonymous app download returned HTTP 200; see evidence/pages-live-verification.json. Visual browser verification was blocked when Computer Use could not determine the current browser URL; no fresh screenshot QA is claimed. Online HTML, assets and downloads are checked after deployment.
