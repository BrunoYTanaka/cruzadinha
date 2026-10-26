export const TOO_MANY_WITH_BODY = { withRetryAfterBody: true }

export function invalidFields(issues: { path: PropertyKey[] }[]): string[] {
  return [...new Set(issues.map((issue) => String(issue.path[0] ?? 'body')))]
}
