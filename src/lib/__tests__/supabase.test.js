import { describe, it, expect } from 'vitest'
import { toCamel, camelize } from '../supabase'

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
