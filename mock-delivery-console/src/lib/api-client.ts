import type {
  AdminUser,
  ApiConfig,
  CatalogData,
  DeleteAdminUserResponse,
  GeneratedOrder,
  Menu,
  Option,
  OptionGroup,
  OrderRecord,
  Store,
  UpdateAdminUserStoreInput,
} from "./types"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""
const DEEPORDER_API_BASE_URL =
  import.meta.env.VITE_DEEPORDER_API_URL ?? "http://127.0.0.1:8000"
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN ?? ""

type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown
  ) {
    super(message)
    this.name = "ApiError"
  }
}

function requireApiBaseUrl() {
  if (!API_BASE_URL) {
    throw new ApiError("VITE_API_BASE_URL is not configured", 0)
  }
}

function endpoint(path: string) {
  requireApiBaseUrl()
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`
}

function deeporderEndpoint(path: string) {
  return `${DEEPORDER_API_BASE_URL.replace(/\/$/, "")}${path}`
}

function encodeId(id: string) {
  return encodeURIComponent(id)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set("Accept", "application/json")

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(endpoint(path), {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const contentType = response.headers.get("content-type") ?? ""
  const hasJson = contentType.includes("application/json")
  const isEmptyResponse = response.status === 204 || response.status === 205
  const payload = isEmptyResponse
    ? undefined
    : hasJson
      ? await response.json()
      : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : typeof payload === "object" &&
            payload !== null &&
            "detail" in payload &&
            typeof payload.detail === "string"
          ? payload.detail
          : `API request failed with status ${response.status}`

    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

async function deeporderRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set("Accept", "application/json")
  headers.set("X-Admin-Token", ADMIN_TOKEN)

  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(deeporderEndpoint(path), {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const contentType = response.headers.get("content-type") ?? ""
  const hasJson = contentType.includes("application/json")
  const isEmptyResponse = response.status === 204 || response.status === 205
  const payload = isEmptyResponse
    ? undefined
    : hasJson
      ? await response.json()
      : await response.text()

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : typeof payload === "object" &&
            payload !== null &&
            "detail" in payload &&
            typeof payload.detail === "string"
          ? payload.detail
          : `API request failed with status ${response.status}`

    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}

async function requestVoid(path: string, options: RequestOptions = {}) {
  await request<unknown>(path, options)
}

// Store API
export function apiGetStores(): Promise<Store[]> {
  return request<Store[]>("/stores")
}

export function apiCreateStore(
  data: Omit<Store, "id" | "createdAt" | "updatedAt">
): Promise<Store> {
  return request<Store>("/stores", { method: "POST", body: data })
}

export function apiUpdateStore(
  id: string,
  data: Partial<Omit<Store, "id" | "createdAt" | "updatedAt">>
): Promise<Store> {
  return request<Store>(`/stores/${encodeId(id)}`, { method: "PATCH", body: data })
}

export function apiDeleteStore(id: string): Promise<void> {
  return requestVoid(`/stores/${encodeId(id)}`, { method: "DELETE" })
}

// Menu API
export function apiGetMenus(storeId: string): Promise<Menu[]> {
  return request<Menu[]>(`/stores/${encodeId(storeId)}/menus`)
}

export function apiCreateMenu(
  data: Omit<Menu, "id" | "createdAt" | "updatedAt">
): Promise<Menu> {
  return request<Menu>("/menus", { method: "POST", body: data })
}

export function apiUpdateMenu(
  id: string,
  data: Partial<Omit<Menu, "id" | "createdAt" | "updatedAt">>
): Promise<Menu> {
  return request<Menu>(`/menus/${encodeId(id)}`, { method: "PATCH", body: data })
}

export function apiDeleteMenu(id: string): Promise<void> {
  return requestVoid(`/menus/${encodeId(id)}`, { method: "DELETE" })
}

export function apiCloneMenu(id: string): Promise<Menu> {
  return request<Menu>(`/menus/${encodeId(id)}/clone`, { method: "POST" })
}

// OptionGroup API
export function apiGetOptionGroups(menuId: string): Promise<OptionGroup[]> {
  return request<OptionGroup[]>(`/menus/${encodeId(menuId)}/option-groups`)
}

export function apiCreateOptionGroup(
  data: Omit<OptionGroup, "id" | "createdAt" | "updatedAt">
): Promise<OptionGroup> {
  return request<OptionGroup>("/option-groups", { method: "POST", body: data })
}

export function apiUpdateOptionGroup(
  id: string,
  data: Partial<Omit<OptionGroup, "id" | "createdAt" | "updatedAt">>
): Promise<OptionGroup> {
  return request<OptionGroup>(`/option-groups/${encodeId(id)}`, {
    method: "PATCH",
    body: data,
  })
}

export function apiDeleteOptionGroup(id: string): Promise<void> {
  return requestVoid(`/option-groups/${encodeId(id)}`, { method: "DELETE" })
}

export function apiCloneOptionGroup(id: string): Promise<OptionGroup> {
  return request<OptionGroup>(`/option-groups/${encodeId(id)}/clone`, {
    method: "POST",
  })
}

export function apiDuplicateOptionGroup(
  optionGroupId: string,
  targetMenuId: string
): Promise<{ optionGroup: OptionGroup; options: Option[] }> {
  return request<{ optionGroup: OptionGroup; options: Option[] }>(
    `/option-groups/${encodeId(optionGroupId)}/duplicate`,
    { method: "POST", body: { targetMenuId } }
  )
}

export function apiDuplicateAllOptionGroups(
  sourceMenuId: string,
  targetMenuId: string
): Promise<{ optionGroups: OptionGroup[]; options: Option[] }> {
  return request<{ optionGroups: OptionGroup[]; options: Option[] }>(
    `/menus/${encodeId(sourceMenuId)}/option-groups/duplicate`,
    { method: "POST", body: { targetMenuId } }
  )
}

// Option API
export function apiGetOptions(optionGroupId: string): Promise<Option[]> {
  return request<Option[]>(`/option-groups/${encodeId(optionGroupId)}/options`)
}

export function apiCreateOption(
  data: Omit<Option, "id" | "createdAt" | "updatedAt">
): Promise<Option> {
  return request<Option>("/options", { method: "POST", body: data })
}

export function apiUpdateOption(
  id: string,
  data: Partial<Omit<Option, "id" | "createdAt" | "updatedAt">>
): Promise<Option> {
  return request<Option>(`/options/${encodeId(id)}`, { method: "PATCH", body: data })
}

export function apiDeleteOption(id: string): Promise<void> {
  return requestVoid(`/options/${encodeId(id)}`, { method: "DELETE" })
}

export function apiCloneOption(id: string): Promise<Option> {
  return request<Option>(`/options/${encodeId(id)}/clone`, { method: "POST" })
}

// Catalog API
export function apiExportCatalog(): Promise<CatalogData> {
  return request<CatalogData>("/catalog/export")
}

export function apiImportCatalog(
  data: CatalogData,
  mode: "merge" | "replace"
): Promise<{ imported: number; errors: string[] }> {
  return request<{ imported: number; errors: string[] }>(
    `/catalog/import?mode=${encodeURIComponent(mode)}`,
    { method: "POST", body: data }
  )
}

export function apiGetLinkableMenus(storeId: string): Promise<Menu[]> {
  return request<Menu[]>(`/stores/${encodeId(storeId)}/linkable-menus`)
}

export function apiGetTargetMenus(
  storeId: string,
  excludeMenuId?: string
): Promise<Menu[]> {
  const query = excludeMenuId
    ? `?excludeMenuId=${encodeURIComponent(excludeMenuId)}`
    : ""

  return request<Menu[]>(`/stores/${encodeId(storeId)}/target-menus${query}`)
}

// API configuration
export function apiGetApiConfigs(): Promise<ApiConfig[]> {
  return request<ApiConfig[]>("/api-configs")
}

export function apiCreateApiConfig(
  data: Omit<ApiConfig, "id" | "createdAt" | "updatedAt">
): Promise<ApiConfig> {
  return request<ApiConfig>("/api-configs", { method: "POST", body: data })
}

export function apiUpdateApiConfig(
  id: string,
  data: Partial<Omit<ApiConfig, "id" | "createdAt" | "updatedAt">>
): Promise<ApiConfig> {
  return request<ApiConfig>(`/api-configs/${encodeId(id)}`, {
    method: "PATCH",
    body: data,
  })
}

export function apiDeleteApiConfig(id: string): Promise<void> {
  return requestVoid(`/api-configs/${encodeId(id)}`, { method: "DELETE" })
}

export function apiGetActiveApiConfig(): Promise<ApiConfig | null> {
  return request<ApiConfig | null>("/api-configs/active")
}

// Order API
export function apiGenerateOrder(
  storeId: string,
  generatedBy = "fallback-generator"
): Promise<GeneratedOrder> {
  return request<GeneratedOrder>(`/stores/${encodeId(storeId)}/orders/generate`, {
    method: "POST",
    body: { generatedBy },
  })
}

export function apiSendOrder(order: GeneratedOrder): Promise<OrderRecord> {
  return request<OrderRecord>("/orders/send", { method: "POST", body: order })
}

export function apiGetOrderRecords(): Promise<OrderRecord[]> {
  return request<OrderRecord[]>("/order-records")
}

export function apiClearOrderRecords(): Promise<void> {
  return requestVoid("/order-records", { method: "DELETE" })
}

export function apiGetAdminUsers(
  status?: "PENDING_APPROVAL" | "APPROVED" | "REJECTED"
): Promise<AdminUser[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : ""
  return deeporderRequest<AdminUser[]>(`/api/admin/users${query}`)
}

export function apiUpdateUserApproval(
  userId: number,
  approvalStatus: "APPROVED" | "REJECTED"
): Promise<AdminUser> {
  return deeporderRequest<AdminUser>(`/api/admin/users/${userId}/approval`, {
    method: "PATCH",
    body: { approvalStatus },
  })
}

export function apiUpdateAdminUserStore(
  userId: number,
  data: UpdateAdminUserStoreInput
): Promise<AdminUser> {
  return deeporderRequest<AdminUser>(`/api/admin/users/${userId}/store`, {
    method: "PATCH",
    body: data,
  })
}

export function apiDeleteAdminUser(userId: number): Promise<DeleteAdminUserResponse> {
  return deeporderRequest<DeleteAdminUserResponse>(`/api/admin/users/${userId}`, {
    method: "DELETE",
  })
}
