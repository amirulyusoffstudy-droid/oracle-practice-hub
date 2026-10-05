export interface StructuredStem {
  intro: string
  leadIn: string
  code: string
  prompt: string
  label: string
}

const blockMarkers = [
  /Examine this SQL statement:/i,
  /You execute this query:/i,
  /You execute (?:this|the) command:/i,
  /You then execute this command:/i,
  /and then execute this command:/i,
  /Examine this sequence of statements issued in a new session:/i,
  /Examine this command[^:]*:/i,
  /You execute:/i,
]

const promptBoundary = /\s+(?=(?:Which|What|Identify|How)\b)/i
const codeOptionPattern = /^(?:SQL>\s*)?(?:SELECT|INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|GRANT|REVOKE|ORDER\s+BY|CONNECT|STARTUP|SHUTDOWN|RMAN>)/

export function parseStructuredStem(stem: string): StructuredStem | null {
  for (const markerPattern of blockMarkers) {
    const marker = markerPattern.exec(stem)
    if (!marker || marker.index === undefined) continue

    const contentStart = marker.index + marker[0].length
    const remainder = stem.slice(contentStart).trim()
    const boundary = remainder.search(promptBoundary)
    if (boundary < 0) continue

    const code = remainder.slice(0, boundary).trim()
    const prompt = remainder.slice(boundary).trim()
    if (!code || !prompt) continue

    return {
      intro: stem.slice(0, marker.index).trim(),
      leadIn: marker[0],
      code,
      prompt,
      label: /SQL|query/i.test(marker[0]) ? 'SQL statement' : 'Oracle command',
    }
  }

  return null
}

export function formatCode(value: string): string {
  return value
    .replace(/\s+/g, ' ')
    .replace(/;\s+(?=(?:SELECT|INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|GRANT|REVOKE|SAVEPOINT|ROLLBACK)\b)/gi, ';\n')
    .replace(/\s+(UNION(?:\s+ALL)?)\s+/gi, '\n$1\n')
    .replace(/\s+(FROM|WHERE|GROUP BY|HAVING|ORDER BY|CONNECT BY|START WITH)\s+/gi, '\n$1 ')
    .trim()
}

export function optionUsesCodeStyle(value: string): boolean {
  return codeOptionPattern.test(value.trim())
}
