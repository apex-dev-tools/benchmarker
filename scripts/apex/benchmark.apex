GovernorLimits initialLimits;
GovernorLimits limits;

void benchmark(String name) {}

void describe(String action) {}

void start() {
	initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();
}

void stop() {
	limits = (new GovernorLimits()).getLimitsDiff(initialLimits, (new GovernorLimits()).getCurrentGovernorLimits());
	initialLimits = null;
}

void done() {
	System.assert(false, '-_' + JSON.serialize(limits) + '_-');
}
