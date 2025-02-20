/**
 * Copyright (c) 2024 Certinia Inc. All rights reserved.
 */

// Start collecting initial governor limits
GovernorLimits initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();

// --- Place your code to be tested here ---
List<String> str = new List<String>();
for(Integer i=0; i<10000; i++) {
    str.add('abc');
}

// End collecting final governor limits
GovernorLimits finalLimits = (new GovernorLimits()).getCurrentGovernorLimits();

// Calculate the difference between initial and final governor limits
GovernorLimits limitsDiff = (new GovernorLimits()).getLimitsDiff(initialLimits, finalLimits);

// Serialize and display the governor limits difference
System.assert(false, '-_' + JSON.serialize(limitsDiff) + '_-');
