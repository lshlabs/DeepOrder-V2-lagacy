import * as httpApi from "./api-client"
const api = httpApi

export const apiGetStores = api.apiGetStores
export const apiCreateStore = api.apiCreateStore
export const apiUpdateStore = api.apiUpdateStore
export const apiDeleteStore = api.apiDeleteStore

export const apiGetMenus = api.apiGetMenus
export const apiCreateMenu = api.apiCreateMenu
export const apiUpdateMenu = api.apiUpdateMenu
export const apiDeleteMenu = api.apiDeleteMenu
export const apiCloneMenu = api.apiCloneMenu

export const apiGetOptionGroups = api.apiGetOptionGroups
export const apiCreateOptionGroup = api.apiCreateOptionGroup
export const apiUpdateOptionGroup = api.apiUpdateOptionGroup
export const apiDeleteOptionGroup = api.apiDeleteOptionGroup
export const apiCloneOptionGroup = api.apiCloneOptionGroup
export const apiDuplicateOptionGroup = api.apiDuplicateOptionGroup
export const apiDuplicateAllOptionGroups = api.apiDuplicateAllOptionGroups

export const apiGetOptions = api.apiGetOptions
export const apiCreateOption = api.apiCreateOption
export const apiUpdateOption = api.apiUpdateOption
export const apiDeleteOption = api.apiDeleteOption
export const apiCloneOption = api.apiCloneOption

export const apiExportCatalog = api.apiExportCatalog
export const apiImportCatalog = api.apiImportCatalog
export const apiGetLinkableMenus = api.apiGetLinkableMenus
export const apiGetTargetMenus = api.apiGetTargetMenus

export const apiGetApiConfigs = api.apiGetApiConfigs
export const apiCreateApiConfig = api.apiCreateApiConfig
export const apiUpdateApiConfig = api.apiUpdateApiConfig
export const apiDeleteApiConfig = api.apiDeleteApiConfig
export const apiGetActiveApiConfig = api.apiGetActiveApiConfig

export const apiGenerateOrder = api.apiGenerateOrder
export const apiSendOrder = api.apiSendOrder
export const apiGetOrderRecords = api.apiGetOrderRecords
export const apiClearOrderRecords = api.apiClearOrderRecords
export const apiGetAdminUsers = api.apiGetAdminUsers
export const apiUpdateUserApproval = api.apiUpdateUserApproval
export const apiUpdateAdminUserStore = api.apiUpdateAdminUserStore
export const apiDeleteAdminUser = api.apiDeleteAdminUser

export { ApiError } from "./api-client"
