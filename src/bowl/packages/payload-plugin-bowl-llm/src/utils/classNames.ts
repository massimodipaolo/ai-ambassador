
export function classNames(styles?: Record<string, string>, ...names: string[]): string {
  return names.map(x => styles ? styles[x] : undefined).filter(Boolean).join(' ');
}
