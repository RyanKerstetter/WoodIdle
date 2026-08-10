

export function formatString(template: string, context: Record<string, string>): string {
  // Matches ${key} instead of {{key}}
  return template.replace(/\$\{(\w+)\}/g, (_, key: string) => {
    const value = context[key];
    return value !== undefined && value !== null ? String(value) : '';
  });
}