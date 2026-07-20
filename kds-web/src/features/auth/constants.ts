import type { LoginRequest, RegisterRequest } from "./types";

export const REMEMBERED_LOGIN_ID_KEY = "deeporder.kds.rememberedLoginId";
export const AUTO_LOGIN_KEY = "deeporder.kds.autoLogin";
export const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{3,31}$/;

export const defaultLoginForm: LoginRequest = {
  loginId: "",
  password: "",
  autoLogin: false,
};

export const defaultRegisterForm: RegisterRequest = {
  name: "",
  loginId: "",
  password: "",
  storeName: "",
  storePhone: "",
  zipNo: "",
  roadAddress: "",
  jibunAddress: "",
  addressDetail: "",
};
