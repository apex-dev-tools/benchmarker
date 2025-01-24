# Alerts




Alerts are stored in a database to track performance degradation. The `STORE_ALERTS` in the environment file must be `true` for alerts to be stored in the database.




## Alerts are stored in two ways




### 1. Reading OffsetThresholds from JSON:
There is a default ranges offset threshold, in which different ranges are defined with their `start_range`, `end_range`, and `offset_threshold`. If you do not want to use the default ranges offset thresholds, create your own JSON file with different ranges and give its path via the env file `CUSTOM_RANGES_PATH` variable.




* sample json file




    ```sh
    {
     "dml_ranges":[
        {
        "start_range" : 0,
        "end_range" : 50,
        "offset_threshold" : 5
        }
    ],
    "soql_ranges":[
        {
        "start_range" : 0,
        "end_range" : 50,
        "offset_threshold" : 10
        }
    ],
    "cpu_ranges":[
        {
        "start_range" : 0,
        "end_range" : 2000,
        "offset_threshold" : 3000
        }
       
    ],
    "heap_ranges":[
        {
        "start_range" : 0,
        "end_range" : 2000000,
        "offset_threshold" : 2000000
        }
    ],
    "dmlRows_ranges":[
        {
        "start_range" : 0,
        "end_range" : 2000,
        "offset_threshold" : 2000
        }
    ],
    "queryRows_ranges":[
        {
        "start_range" : 0,
        "end_range" : 20000,
        "offset_threshold" : 5000
        }
    ]
    }
    ```


#### How this works:
If current test run limits are greater than the average limits of the previous 10 days and the offset threshold sum, then the alert will be stored.


##### For Example:


 * The measured average in the last 10 days was 1500, within our monitoring range.
 * Offset threshold is 3000, applied to a CPU Time 10 day average in the range of 0 - 2000
 * You will get an alert on any value 4500+, saying it has degraded by 3000+ above the average


```sh
 Note: If the average does not match any of the ranges, the 10-day average becomes the threshold. To avoid issues, ensure you have ranges that cover the zero governor limits.


 ```


### 2. Giving Custom Thresholds at the test level:
Another way is to give thresholds at the test level. Along with custom thresholds, you can also pass whether you want to store alerts for a particular test using the alertInfo class. For reference, you can see the `test_system/sampleAlert/sampleAlert.test.ts`.




#### How this works:
If current test run limits exceed the custom thresholds defined, the alert will be stored in that case.


##### For Example:


 * Threshold at test level for CPU was 4000
 * You will get an alert on any value 4000+, saying it has degraded by 'XX' above the average


 ```sh
 Note - If the test level threshold is misconfigured below the average, you get an alert with a value of 0. But that will be filtered out later, so no alert will be stored in that case.
 ```




## Alerts for newly created tests


When a new test is added, at that time its previous test run values will not be present in the database. So, alerts will be calculated only if at least 5 test runs are present in the database. Before that, alerts will not be calculated.





