const { proxyActivities } = require('@temporalio/workflow');
const { investigateActivity } = proxyActivities({
  startToCloseTimeout: '24 hours', heartbeatTimeout: '15 seconds',
  retry: { initialInterval: '1 second', maximumInterval: '5 seconds', maximumAttempts: 3 }
});
// All filesystem/process/model work lives in the Activity, never workflow replay.
exports.durableInvestigation = async function durableInvestigation(config, id) {
  return investigateActivity(config, id);
};
