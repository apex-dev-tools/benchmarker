GovernorLimits limitsbench_initial;
GovernorLimits limitsbench_diff;

void benchmark(String name) {}

void describe(String action) {}

void start() {
	limitsbench_initial = (new GovernorLimits()).getCurrentGovernorLimits();
}

void stop() {
	limitsbench_diff = (new GovernorLimits()).getLimitsDiff(limitsbench_initial, (new GovernorLimits()).getCurrentGovernorLimits());
}

void done() {
	System.assert(false, '-_' + JSON.serialize(limitsbench_diff) + '_-');
}
