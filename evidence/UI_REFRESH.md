# Workspace design refresh

October 31, 2026. The user's latest request asks for better design taste, with Sentry as a UI reference. This updates the earlier design direction: compact system typography now carries controls and dense prose, with a locally bundled display serif for the brand, panel headings, tour and physical candidate tag. Cormorant Garamond is now the default; Typography offers Newsreader and the original IM Fell English as alternatives. The warm palette, meaningful status colors and Bayer timeline remain.

Changes are confined to `src/main.jsx` and the new `src/console.css` presentation layer:

- The navigation rail was removed at the user’s follow-up request. Archive and guide controls remain in the header.
- Workspace heading and case overview populated from actual form/history/receipt state. No fabricated charts or measurements.
- Independent columns for setup, investigation and autopsy; the center's panels no longer inherit empty vertical gaps from tall sidebars.
- Clearer panel hierarchy, compact inputs, segmented diff controls, recessed output and quieter metadata.
- Stacked tablet/mobile layout; archive and guide remain accessible when the rail is hidden.
- A flowing Bayer dither texture sits behind the workspace at 20% opacity. Interfering wave fields vary its density over time, rather than translating a fixed image. A low-resolution canvas reuses its pixel buffer, caps updates at 10 fps and precomputes trigonometry per row/column. It pauses when hidden and stays still for reduced motion; a static SVG pattern is the fallback.
- Offline system fonts and existing bundled fonts. No new dependencies, external assets or paid services.

Validation: production build passed; the three existing design/helper tests passed; an isolated server-side React render confirmed the idle workspace, forms and navigation render without errors. The render check is under ignored `work/` and is not a browser screenshot or an interaction test. Native Chrome inspection was deferred when the helper detected the user's input in the target window. Desktop/mobile visual and interaction QA remain for the independent acceptance pass.

No backend, engine, verification or Copilot test files were changed in this design pass. The prior full acceptance result belongs to the earlier build; this refresh does not claim a new full-suite result. Refresh the running app to load its rebuilt assets.

## Guided onboarding and typography

The first visit offers Take tour and Do not show again. Nine spotlight steps cover repository selection, revisions, the check, execution, the timeline, evidence, candidate/fix verification, local AI and exports. The overlay masks the page around the target, adds a warm outline/glow and a pointing card, scrolls targets into view, and recalculates placement on resize, scrolling and font readiness. It traps keyboard focus, makes the background inert, restores focus on close and isolates shortcuts from app commands. The tour never starts checks. Completing it or choosing Do not show again records a local browser preference; Take tour in the header can replay it. Storage failures do not prevent using the tour.

Typography offers three locally bundled font previews, remembers the selection when browser storage works, and leaves machine output in IBM Plex Mono. Cormorant Garamond and Newsreader are distributed with their OFL notices in licenses/. Font assets came from Fontsource; licenses came from the Google Fonts repositories.

Latest focused validation: production build; six design/placement tests; server-side rendering of the welcome, all nine tour cards, font choices and idle app. This is not browser interaction or pixel QA. The native browser helper returned a screenshot of another foreground app for the Chrome target, so it was not used to operate or validate the tour. Real-browser checks of keyboard focus, preferences, glow, mobile scrolling and motion remain for the independent UI pass. No new full acceptance-suite claim is made while Copilot is testing the backend.
