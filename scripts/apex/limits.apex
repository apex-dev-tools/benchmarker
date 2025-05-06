public class GovernorLimits {
	private Integer duration, cpuTime, dmlRows, dmlStatements, heapSize, queryRows, soqlQueries, queueableJobs, futureCalls;

	public GovernorLimits getCurrentGovernorLimits() {
		this.duration = (Integer)Datetime.now().getTime();
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
		this.duration = govLim2.duration - govLim1.duration;
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
