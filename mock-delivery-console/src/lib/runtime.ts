export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""

export function getFriendlyError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }
  return fallback
}
