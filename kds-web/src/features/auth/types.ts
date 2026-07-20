export type ApprovalStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED";
export type UserRole = "STORE_OWNER" | "ADMIN";
export type AccountType = "OWNER" | "EMPLOYEE";

export type AuthUser = {
  id: number;
  loginId: string;
  name: string;
  role: UserRole;
  accountType?: AccountType | null;
  approvalStatus: ApprovalStatus;
};

export type AuthStore = {
  id: number;
  storeId: string;
  storeName: string;
  phone: string | null;
  zipNo: string | null;
  roadAddress: string | null;
  jibunAddress: string | null;
  addressDetail: string | null;
  approvalStatus: ApprovalStatus;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  autoLogin: boolean;
  user: AuthUser;
  store: AuthStore;
};

export type CurrentUserResponse = {
  user: AuthUser;
  store: AuthStore;
};

export type RegisterResponse = {
  user: AuthUser;
  store: AuthStore;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type ChangePasswordResponse = {
  message: string;
};

export type RefreshResponse = {
  accessToken: string;
};

export type IdentifierAvailabilityResponse = {
  available: boolean;
  message: string;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  autoLogin: boolean;
  user: AuthUser;
  store: AuthStore;
};

export type LoginRequest = {
  loginId: string;
  password: string;
  autoLogin: boolean;
};

export type RegisterRequest = {
  name: string;
  loginId: string;
  password: string;
  storeName: string;
  storePhone: string;
  zipNo: string;
  roadAddress: string;
  jibunAddress: string;
  addressDetail: string;
};
