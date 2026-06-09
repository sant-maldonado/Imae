import { describe, it, expect } from 'vitest'
import { toCamel, camelize, toSnake, snakeize } from '../supabase'

describe('toCamel', () => {
  it('converts snake_case to camelCase', () => {
    expect(toCamel('snake_case')).toBe('snakeCase')
  })

  it('converts multiple underscores', () => {
    expect(toCamel('avatar_url_pequena')).toBe('avatarUrlPequena')
  })

  it('leaves already camelCase unchanged', () => {
    expect(toCamel('camelCase')).toBe('camelCase')
  })

  it('handles empty string', () => {
    expect(toCamel('')).toBe('')
  })
})

describe('camelize', () => {
  it('converts object keys from snake_case to camelCase', () => {
    const input = { user_id: 1, full_name: 'Test' }
    const expected = { userId: 1, fullName: 'Test' }
    expect(camelize(input)).toEqual(expected)
  })

  it('handles arrays of objects', () => {
    const input = [{ team_id: 1 }, { team_id: 2 }]
    const expected = [{ teamId: 1 }, { teamId: 2 }]
    expect(camelize(input)).toEqual(expected)
  })

  it('handles nested objects', () => {
    const input = { user: { profile_pic: 'a.jpg' } }
    const expected = { user: { profilePic: 'a.jpg' } }
    expect(camelize(input)).toEqual(expected)
  })

  it('returns primitives as-is', () => {
    expect(camelize('hello')).toBe('hello')
    expect(camelize(42)).toBe(42)
    expect(camelize(null)).toBe(null)
  })

  it('returns arrays as-is for non-object items', () => {
    expect(camelize([1, 2, 3])).toEqual([1, 2, 3])
  })

  it('handles undefined', () => {
    expect(camelize(undefined)).toBe(undefined)
  })
})

describe('toSnake', () => {
  it('converts camelCase to snake_case', () => {
    expect(toSnake('camelCase')).toBe('camel_case')
  })

  it('handles consecutive uppercase', () => {
    expect(toSnake('avatarURL')).toBe('avatar_url')
  })

  it('handles empty string', () => {
    expect(toSnake('')).toBe('')
  })
})

describe('snakeize', () => {
  it('converts object keys from camelCase to snake_case', () => {
    const input = { userId: 1, fullName: 'Test' }
    const expected = { user_id: 1, full_name: 'Test' }
    expect(snakeize(input)).toEqual(expected)
  })

  it('handles arrays of objects', () => {
    const input = [{ teamId: 1 }, { teamId: 2 }]
    const expected = [{ team_id: 1 }, { team_id: 2 }]
    expect(snakeize(input)).toEqual(expected)
  })

  it('handles nested objects', () => {
    const input = { user: { profilePic: 'a.jpg' } }
    const expected = { user: { profile_pic: 'a.jpg' } }
    expect(snakeize(input)).toEqual(expected)
  })

  it('returns primitives as-is', () => {
    expect(snakeize('hello')).toBe('hello')
    expect(snakeize(42)).toBe(42)
    expect(snakeize(null)).toBe(null)
  })

  it('handles undefined', () => {
    expect(snakeize(undefined)).toBe(undefined)
  })
})
