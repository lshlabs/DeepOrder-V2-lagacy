export type AssignedMenu = {
  id: number;
  menuName: string;
  normalizedMenuName: string;
  sortOrder: number;
};

export type AssignedMenuListResponse = {
  menus: AssignedMenu[];
};

export type CreateAssignedMenuRequest = {
  menuName: string;
  sortOrder?: number;
};

export type UpdateAssignedMenuRequest = {
  menuName: string;
  sortOrder?: number;
};
