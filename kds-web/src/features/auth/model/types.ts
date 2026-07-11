/**
 * Auth domain types — re-exports from global @/types for colocation.
 * Components inside features/auth import from here.
 */
export type {
  AuthUser,
  AuthStore,
  AuthSession,
  AuthResponse,
  RegisterResponse,
  LoginRequest,
  RegisterRequest,
  CurrentUserResponse,
  ApprovalStatus,
} from "@/types";
