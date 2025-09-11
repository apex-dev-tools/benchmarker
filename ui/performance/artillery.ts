/**
 * @copyright 2025 Certinia Inc. All rights reserved.
 */

process.env.PLAYWRIGHT_TRACING_OUTPUT_DIR =
  'autotests/ui/performance/errorLogs/traces';

const defaultConfigObject = {
  engines: {
    playwright: {
      defaultTimeout: 300,
      launchOptions: {
        args: [
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--mute-audio',
          '--no-sandbox',
          '--disable-dev-shm-usage',
        ],
      },
      trace: {
        enabled: true,
      },
    },
  },
  phases: [
    {
      duration: '5m',
      arrivalRate: 1,
      maxVusers: 1,
    },
  ],
};

/**
 * Generates a default configuration object for Artillery performance tests using the Playwright engine.
 *
 * @param config - An object containing additional or overriding configuration options.
 * @returns The merged configuration object with default settings and any overrides from the provided config.
 */
export function defaultConfig(config: PlainObject) {
  return deepMerge(defaultConfigObject, config);
}

type PlainObject = Record<string, unknown>;

/**
 * Deeply merges two plain objects. For each property, if both target and source values are plain objects,
 * they are recursively merged. If both are arrays, the source array replaces the target array.
 * Otherwise, the source value overwrites the target value.
 *
 * @template T - Type of the target object.
 * @template U - Type of the source object.
 * @param target - The target object to merge into.
 * @param source - The source object whose properties will be merged into the target.
 * @returns A new object containing the merged properties of target and source.
 */
export function deepMerge<T extends PlainObject, U extends PlainObject>(
  target: T,
  source: U
): T & U {
  const output: PlainObject = { ...target };

  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue;
    }

    const sourceVal = source[key];
    const targetVal = target[key];

    if (isPlainObject(sourceVal) && isPlainObject(targetVal)) {
      output[key] = deepMerge(targetVal, sourceVal);
    } else if (Array.isArray(sourceVal) && Array.isArray(targetVal)) {
      // Optional: customize merge strategy for arrays
      // output[key] = [...targetVal, ...sourceVal]; // merge arrays
      output[key] = sourceVal; // replace array with source array
    } else {
      output[key] = sourceVal;
    }
  }

  return output as T & U;
}

function isPlainObject(obj: unknown): obj is PlainObject {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}
