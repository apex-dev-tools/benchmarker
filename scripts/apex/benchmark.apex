public class Benchmark {
	private GovernorLimits initialLimits;
	private GovernorLimits limitsDiff;
	private String testName;
	private String testAction;

	void setName(String name) {
		testName = name;
	}

	void setAction(String action) {
		testAction = action;
	}

	void start() {
		initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();
	}

	void stop() {
		limitsDiff = (new GovernorLimits()).getLimitsDiff(initialLimits, (new GovernorLimits()).getCurrentGovernorLimits());
	}

	void end() {
		System.assert(false, '-_' + JSON.serialize(limitsDiff) + '_-');
	}
}

Benchmark benchmark = new Benchmark();
