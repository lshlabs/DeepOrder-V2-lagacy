import type { AccountType } from "@/features/auth";

export type Staff = {
  id: number;
  loginId: string;
  name: string;
  accountType: AccountType;
  positionLabel: string | null;
  active: boolean;
};

export type StaffListResponse = {
  staff: Staff[];
};

export type CreateStaffRequest = {
  name: string;
  loginId: string;
  positionLabel?: string | null;
};

export type UpdateStaffRequest = {
  name: string;
  loginId: string;
  positionLabel?: string | null;
};

export type UpdateStaffActiveRequest = {
  active: boolean;
};

export type StaffWithTemporaryPin = Staff & {
  temporaryPin: string;
};

export type RegenerateStaffPinResponse = {
  id: number;
  temporaryPin: string;
};
