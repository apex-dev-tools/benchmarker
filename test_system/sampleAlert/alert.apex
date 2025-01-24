/**
 * Copyright (c) 2025 Certinia Inc. All rights reserved.
 */

// Start collecting initial governor limits
GovernorLimits initialLimits = (new GovernorLimits()).getCurrentGovernorLimits();

// --- Place your code to be tested here ---
for(Integer i=0; i<150; i++) {
  insert new Account(Name='Test Account');
}

// End collecting final governor limits
GovernorLimits finalLimits = (new GovernorLimits()).getCurrentGovernorLimits();

// Calculate the difference between initial and final governor limits
GovernorLimits limitsDiff = (new GovernorLimits()).getLimitsDiff(initialLimits, finalLimits);

// Serialize and display the governor limits difference
System.assert(false, '-_' + JSON.serialize(limitsDiff) + '_-');
