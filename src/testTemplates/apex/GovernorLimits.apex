/*
 * Copyright (c) 2020 FinancialForce.com, inc. All rights reserved.
 */

 // This is injected in Anonynmous Apex scripts as a helper so static can't be used

public class GovernorLimits {
	private Integer timer, cpuTime, dmlRows, dmlStatements, heapSize, queryRows, soqlQueries, queueableJobs, futureCalls;

	public GovernorLimits getCurrentGovernorLimits() {
		this.timer = (Integer)Datetime.now().getTime();
		this.cpuTime = Limits.getCpuTime();
		this.dmlRows = Limits.getDMLRows();
		this.dmlStatements = Limits.getDMLStatements();
		this.heapSize = Limits.getHeapSize();
		this.queryRows = Limits.getQueryRows();
		this.soqlQueries = Limits.getQueries();
		this.queueableJobs = Limits.getQueueableJobs();
		this.futureCalls = Limits.getFutureCalls();
		return this;
	}

	public GovernorLimits getLimitsDiff(GovernorLimits govLim1, GovernorLimits govLim2) {
		this.timer = govLim2.timer - govLim1.timer;
		this.cpuTime = govLim2.cpuTime - govLim1.cpuTime;
		this.dmlRows = govLim2.dmlRows - govLim1.dmlRows;
		this.dmlStatements = govLim2.dmlStatements - govLim1.dmlStatements;
		this.heapSize = govLim2.heapSize - govLim1.heapSize;
		this.queryRows = govLim2.queryRows - govLim1.queryRows;
		this.soqlQueries = govLim2.soqlQueries - govLim1.soqlQueries;
		this.queueableJobs = govLim2.queueableJobs - govLim1.queueableJobs;
		this.futureCalls = govLim2.futureCalls - govLim1.futureCalls;
		return this;
	}
}

/*
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
	// TODO pass name and action in json
	limitsDiff = (new GovernorLimits()).getLimitsDiff(initialLimits, (new GovernorLimits()).getCurrentGovernorLimits());
	System.assert(false, '-_' + JSON.serialize(limitsDiff) + '_-');
}
*/
