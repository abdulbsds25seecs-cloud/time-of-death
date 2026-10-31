# Live Sentry verification

Verified on October 31, 2026 through the user's Chrome Sentry session, project `node`.

The live Explore → Traces → Span Samples view displayed four spans:

- Time of Death live tracing verification: 414.06 ms
- Synthetic evidence collection: 256.02 ms
- Synthetic validation: 156.59 ms
- Sentry setup check: 1.30 ms

Evidence: `sentry-live-traces.png`. The SDK transport returned HTTP 200 with no retry-after or rate-limit header. The initially empty dashboard populated after indexing and refresh; no app instrumentation change was required for this verification.

This confirms live ingestion and dashboard visibility of controlled synthetic setup spans. It does not establish a completed real-model investigation/autopsy trace or correctness of investigation results. Those remain separate checks. The project DSN is stored only in the ignored local environment file and is not included here.
