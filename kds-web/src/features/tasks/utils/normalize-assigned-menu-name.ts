export function normalizeAssignedMenuName(value: string) {
  return value.trim().toLowerCase().split(/\s+/).join(" ");
}
