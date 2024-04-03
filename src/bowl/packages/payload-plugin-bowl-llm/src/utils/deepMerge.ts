/**
 * Simple object check.
 * @param item
 * @returns {boolean}
 */
export function isObject<T>(item: unknown): item is T {
  return item ? typeof item === 'object' && !Array.isArray(item) : false;
}

/**
 * type safe object keys.
 * @param item
 * @returns keyof T[]
 */
export function objectKeys<T extends {}>(item: T): (keyof T)[] {
  return Object.keys(item) as (keyof T)[];
}

/**
 * Deep merge two objects.
 * @param target
 * @param ...sources
 */
export function deepMerge<T, R = T>(target: Partial<T>, source: Partial<R>): T & R {
  const output = { ...target } as Partial<T & R>;
  if (isObject(target) && isObject(source)) {
    objectKeys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key as unknown as keyof T] as Partial<unknown>, source[key] as Partial<unknown>) as (T & R)[typeof key];
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output as T & R;
}
