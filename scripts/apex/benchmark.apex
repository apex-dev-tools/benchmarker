public class Benchmark {
	private String name;
	private String action;
	private GovernorLimits initialLimits;
	private GovernorLimits limits;

	public void setName(String name) {
		this.name = name;
	}

	public void setAction(String action) {
		this.action = action;
	}

	public void begin() {}

	public void start() {
		initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();
	}

	public void start(String action) {
		this.action = action;
		this.start();
	}

	public void stop() {
		limits = (new GovernorLimits()).getLimitsDiff(initialLimits, (new GovernorLimits()).getCurrentGovernorLimits());
		initialLimits = null;
	}

	public void end() {
		System.assert(false, '-_' + JSON.serialize(this) + '_-');
	}
}

Benchmark benchmark = new Benchmark();
