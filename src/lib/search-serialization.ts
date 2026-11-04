import { defaultParseSearch, stringifySearchWith } from '@tanstack/react-router'

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string')
}

function stringifyValue(value: unknown): string {
  return isStringList(value) ? value.join(',') : JSON.stringify(value)
}

const stringifyEncoded = stringifySearchWith(stringifyValue, JSON.parse)

export function stringifySearch(search: Record<string, unknown>): string {
  return stringifyEncoded(search).replace(/%2C/gi, ',')
}

export const parseSearch = defaultParseSearch

export function splitList(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }
  if (typeof value === 'string') {
    return value.split(',').map((item) => item.trim())
  }
  return []
}
