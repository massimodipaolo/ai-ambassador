import { Json } from '@websolutespa/bom-core';

export function getPathValue(pathOrPaths: string | string[], object: unknown): Json | undefined {
  if (typeof object === 'undefined') {
    return undefined;
  }
  const paths = Array.isArray(pathOrPaths) ? pathOrPaths : pathOrPaths.split('.');
  if (paths.length === 1) {
    return object ? object[paths[0] as keyof typeof object] : undefined;
  } else {
    const path = paths.shift();
    return getPathValue(paths, object ? object[path as keyof typeof object] : undefined);
  }
}
