/**
 * Auth storage — re-exports from @/lib/auth so features/auth owns its storage boundary.
 * The underlying implementation stays in lib/auth.ts (used by KDS hooks too).
 */
export {
  loadStoredTokens,
  loadStoredAccessToken,
  saveStoredTokens,
  saveAccessToken,
  clearStoredTokens,
} from "@/lib/auth";
export type { TokenStorageMode, StoredTokens } from "@/lib/auth";
