export type MenuType = "MAIN" | "SET" | "SIDE" | "DRINK"
export type SelectionType = "RADIO" | "CHECKBOX"
export type OptionEffect = "NONE" | "ADD" | "EXCLUDE" | "REPLACE" | "NOTE"

export interface Store {
  id: string
  name: string
  address?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Menu {
  id: string
  storeId: string
  name: string
  type: MenuType
  basePrice: number
  allergens: string[]
  isAvailable: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface OptionGroup {
  id: string
  menuId: string
  name: string
  selectionType: SelectionType
  isRequired: boolean
  minSelect: number
  maxSelect: number
  sortOrder: number
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

export interface Option {
  id: string
  optionGroupId: string
  name: string
  effect: OptionEffect
  additionalPrice: number
  linkedMenuId: string | null
  isDefaultSelected: boolean
  sortOrder: number
  isAvailable: boolean
  createdAt: string
  updatedAt: string
}

export interface CatalogData {
  stores: Store[]
  menus: Menu[]
  optionGroups: OptionGroup[]
  options: Option[]
}

// API configuration for the AI order-generation endpoint
export interface ApiConfig {
  id: string
  name: string
  provider: string
  endpoint: string
  model: string
  apiKey: string
  temperature: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// A single selected option inside a generated order item
export interface GeneratedOrderOption {
  groupName: string
  optionName: string
  effect: OptionEffect
  additionalPrice: number
}

// A single menu line inside a generated order
export interface GeneratedOrderItem {
  menuId: string
  menuName: string
  type: MenuType
  basePrice: number
  quantity: number
  selectedOptions: GeneratedOrderOption[]
  itemTotal: number
}

// The full generated order combination (JSON payload)
export interface GeneratedOrder {
  orderId: string
  orderNumber: string
  storeId: string
  storeName: string
  createdAt: string
  generatedBy: string
  items: GeneratedOrderItem[]
  totalPrice: number
}

export type OrderRecordStatus = "success" | "error"

// A record of a transmitted order
export interface OrderRecord {
  id: string
  createdAt: string
  status: OrderRecordStatus
  httpStatus: number
  storeName: string
  payload: string
  message: string
}

export type ApprovalStatus = "PENDING_APPROVAL" | "APPROVED" | "REJECTED"
export type UserRole = "STORE_OWNER" | "ADMIN"

export interface AdminStore {
  id: number
  storeId: string
  storeName: string
  phone: string | null
  zipNo: string | null
  roadAddress: string | null
  jibunAddress: string | null
  addressDetail: string | null
  approvalStatus: ApprovalStatus
}

export interface AdminUser {
  id: number
  loginId: string
  name: string
  role: UserRole
  approvalStatus: ApprovalStatus
  createdAt: string
  store: AdminStore
}

export interface UpdateAdminUserStoreInput {
  storeId: string
  storeName: string
}

export interface DeleteAdminUserResponse {
  id: number
  deletedStoreId: string
}
