/**
 * Auth API — thin re-exports from @/lib/api so the rest of features/auth
 * only imports from this boundary instead of reaching into lib/ directly.
 */
export {
  ApiError,
  API_ORIGIN,
  apiLogin,
  apiRegister,
  apiCheckIdentifier,
  apiRefresh,
  apiLogout,
  apiGetCurrentUser,
  apiGetCurrentSupportConversation,
  apiCloseSupportConversation,
} from "@/lib/api";
