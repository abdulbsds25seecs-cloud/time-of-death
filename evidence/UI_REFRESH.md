# Workspace design refresh

October 31, 2026. The user's latest request asks for better design taste, with Sentry as a UI reference. This updates the earlier design direction: compact system typography now carries controls and dense prose, with the locally bundled ledger face retained for the brand, empty timeline and physical candidate tag. The warm palette, meaningful status colors and Bayer timeline remain.

Changes are confined to `src/main.jsx` and the new `src/console.css` presentation layer:

- Compact navigation rail with real section links, active anchor state, archive and guide controls.
- Workspace heading and case overview populated from actual form/history/receipt state. No fabricated charts or measurements.
- Independent columns for setup, investigation and autopsy; the center's panels no longer inherit empty vertical gaps from tall sidebars.
- Clearer panel hierarchy, compact inputs, segmented diff controls, recessed output and quieter metadata.
- Stacked tablet/mobile layout; archive and guide remain accessible when the rail is hidden.
- Offline system fonts, existing bundled fonts and small inline SVG navigation symbols. No new dependencies, external assets or paid services.

Validation: production build passed; the three existing design/helper tests passed; an isolated server-side React render confirmed the idle workspace, forms and navigation render without errors. The render check is under ignored `work/` and is not a browser screenshot or an interaction test. Native Chrome inspection was deferred when the helper detected the user's input in the target window. Desktop/mobile visual and interaction QA remain for the independent acceptance pass.

No backend, engine, verification or Copilot test files were changed in this design pass. The prior full acceptance result belongs to the earlier build; this refresh does not claim a new full-suite result. Refresh the running app to load its rebuilt assets.
