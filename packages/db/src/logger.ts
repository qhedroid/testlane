type LogPayload = Record<string, unknown>

export const logger = {
  info(message: string, payload?: LogPayload): void {
    if (payload) {
      console.log(`[relay] ${message}`, payload)
    } else {
      console.log(`[relay] ${message}`)
    }
  },
  error(message: string, payload?: LogPayload): void {
    if (payload) {
      console.error(`[relay] ${message}`, payload)
    } else {
      console.error(`[relay] ${message}`)
    }
  },
}
