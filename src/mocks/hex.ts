export function deterministicHex(seed: string, length: number): string {
  let state = 2166136261
  let output = ''
  while (output.length < length) {
    for (const char of seed + output.length) {
      state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0
    }
    output += state.toString(16).padStart(8, '0')
  }
  return output.slice(0, length)
}
