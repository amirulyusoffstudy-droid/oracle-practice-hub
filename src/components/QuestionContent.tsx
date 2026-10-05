import type { ReactNode } from 'react'
import { formatCode, parseStructuredStem } from './questionFormatting'

interface QuestionContentProps {
  stem: string
  headingLevel?: 'h1' | 'h3'
  headingId?: string | null
  compact?: boolean
}

function renderInlineErrors(value: string): ReactNode[] {
  return value.split(/(ORA-\d{5})/gi).map((part, index) =>
    /^ORA-\d{5}$/i.test(part)
      ? <code className="oracle-error" key={`${part}-${index}`}>{part}</code>
      : part,
  )
}

export function QuestionContent({
  stem,
  headingLevel = 'h1',
  headingId = 'question-title',
  compact = false,
}: QuestionContentProps) {
  const structured = parseStructuredStem(stem)
  const Heading = headingLevel

  if (!structured) {
    return <Heading id={headingId ?? undefined}>{renderInlineErrors(stem)}</Heading>
  }

  return (
    <div className={`structured-question${compact ? ' structured-question-compact' : ''}`}>
      {structured.intro && <p className="question-context">{renderInlineErrors(structured.intro)}</p>}
      <p className="code-lead-in">{structured.leadIn}</p>
      <pre aria-label={structured.label} className="question-code-block">
        <code>{formatCode(structured.code)}</code>
      </pre>
      <Heading id={headingId ?? undefined}>{renderInlineErrors(structured.prompt)}</Heading>
    </div>
  )
}
