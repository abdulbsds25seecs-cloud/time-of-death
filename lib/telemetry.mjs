// Optional, metadata-only tracing. No SDK import or network traffic without a DSN.
let sdk;
const allowed = new Set(['checks', 'revisions', 'status', 'exit_code', 'model', 'tokens', 'duration_ms', 'resumed_checks', 'gen_ai.request.model', 'gen_ai.operation.name', 'gen_ai.usage.output_tokens', 'sentry.op', 'sentry.origin']);
export async function initTelemetry(options = {}) {
  const dsn = options.dsn ?? process.env.SENTRY_DSN;
  if (!dsn) { sdk=undefined; return false; }
  sdk = await import('@sentry/node');
  sdk.init({ dsn, defaultIntegrations: false, sendDefaultPii: false, tracesSampleRate: 1,
    environment: 'local', release: 'time-of-death@1.0.0', ...options, serverName:'time-of-death-local', traceLifecycle:'static',
    beforeSend: () => null,
    beforeSendTransaction(event) {
      // Keep only explicitly allowlisted scalar measurements; never paths, commands or logs.
      delete event.request; delete event.user; delete event.breadcrumbs; delete event.extra; delete event.server_name;
      if (event.contexts) {
        const trace=event.contexts.trace;
        if(trace?.data)trace.data=Object.fromEntries(Object.entries(trace.data).filter(([key])=>allowed.has(key)));
        event.contexts = { trace };
      }
      for (const span of event.spans || []) {
        span.data = Object.fromEntries(Object.entries(span.data || {}).filter(([k]) => allowed.has(k)));
      }
      return event;
    }
  });
  return true;
}
export async function traced(name, operation, attrs, work) {
  if (!sdk) return work();
  const attributes = Object.fromEntries(Object.entries(attrs || {}).filter(([key,value]) => allowed.has(key) && ['string','number','boolean'].includes(typeof value)));
  return sdk.startSpan({ name, op: operation, attributes }, async span => {
    try { const result = await work();
      if(Number.isFinite(result?.tokens))span.setAttribute('gen_ai.usage.output_tokens',result.tokens);
      if(Number.isFinite(result?.durationMs))span.setAttribute('duration_ms',result.durationMs);
      if(Number.isFinite(result?.code))span.setAttribute('exit_code',result.code);
      if(Number.isFinite(result?.result?.checks))span.setAttribute('checks',result.result.checks);
      span.setStatus({ code: 1 }); return result; }
    catch (error) { span.setStatus({ code: 2, message: 'operation_failed' }); throw error; }
  });
}
export async function flushTelemetry() { if (sdk) await sdk.flush(2000); }
