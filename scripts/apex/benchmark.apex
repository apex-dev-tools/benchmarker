public class Benchmark {
	private GovernorLimits initialLimits;
	private GovernorLimits limits;

	public void begin() {}

	public void start() {
		initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();
	}

	public void start(String action) {
		this.start();
	}

	public void stop() {
		limits = (new GovernorLimits()).getLimitsDiff(initialLimits, (new GovernorLimits()).getCurrentGovernorLimits());
		initialLimits = null;
	}

	public void end() {
		System.assert(false, '-_' + JSON.serialize(limits) + '_-');
	}
}

Benchmark benchmark = new Benchmark();
