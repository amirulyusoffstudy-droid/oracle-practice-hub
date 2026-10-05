import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QuestionContent } from './QuestionContent'
import { optionUsesCodeStyle } from './questionFormatting'

afterEach(cleanup)

describe('QuestionContent', () => {
  it('separates a query, preserves its literal text, and creates readable SQL lines', () => {
    render(
      <QuestionContent stem={'Examine this SQL statement: SELECT customer_id FROM customers WHERE country_id = 10 Which clause is valid?'} />,
    )

    const block = screen.getByLabelText('SQL statement')
    expect(block.tagName).toBe('PRE')
    expect(block.textContent).toBe('SELECT customer_id\nFROM customers\nWHERE country_id = 10')
    expect(screen.getByRole('heading', { name: 'Which clause is valid?' })).toBeTruthy()
  })

  it('separates command sequences without changing statement order', () => {
    render(
      <QuestionContent stem={'Examine this sequence of statements issued in a new session: INSERT INTO books VALUES (1); SAVEPOINT a; ROLLBACK TO SAVEPOINT a; What remains?'} />,
    )

    expect(screen.getByLabelText('Oracle command').textContent).toBe(
      'INSERT INTO books VALUES (1);\nSAVEPOINT a;\nROLLBACK TO SAVEPOINT a;',
    )
  })

  it('highlights Oracle errors while leaving ordinary prose as a heading', () => {
    render(<QuestionContent stem={'A statement raises ORA-01536. What should the DBA check?'} />)

    const error = screen.getByText('ORA-01536')
    expect(error.tagName).toBe('CODE')
    expect(error.className).toBe('oracle-error')
    expect(screen.queryByLabelText('SQL statement')).toBeNull()
  })

  it('identifies SQL and command answer options conservatively', () => {
    expect(optionUsesCodeStyle('ORDER BY "Last Name"')).toBe(true)
    expect(optionUsesCodeStyle('SQL> ALTER SYSTEM SET DB_CACHE_SIZE=1024M')).toBe(true)
    expect(optionUsesCodeStyle('Grant a quota on USERS')).toBe(false)
    expect(optionUsesCodeStyle('The database opens normally.')).toBe(false)
  })
})
