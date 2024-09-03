// Start collecting initial governor limits
GovernorLimits initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();

// --- Place your code to be tested here ---
class MyQueueable implements Queueable {
    public void execute(QueueableContext ctx) {
        
    }
}
System.enqueueJob(new MyQueueable());

// End collecting final governor limits
GovernorLimits finalLimits = (new GovernorLimits()).getCurrentGovernorLimits();

// Calculate the difference between initial and final governor limits
GovernorLimits limitsDiff = (new GovernorLimits()).getLimitsDiff(initialLimits, finalLimits);

// Serialize and display the governor limits difference
System.assert(false, '-_' + JSON.serialize(limitsDiff) + '_-');
