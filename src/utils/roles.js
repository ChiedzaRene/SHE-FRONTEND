// Operations and directors oversee every site but don't change records (the server refuses it too)
export const READ_ONLY_ROLES = ["operations", "director"];

export const isReadOnly = (role) => READ_ONLY_ROLES.includes(role);

// SHE officers work as part of the SHE team and see what it sees
export const isSheStaff = (role) => role === "she_team" || role === "she_officer";

export const ROLE_LABELS = {
  super_admin: "Super admin",
  admin: "Admin",
  she_team: "SHE team",
  she_officer: "SHE officer",
  regional_manager: "Regional manager",
  site_manager: "Site manager",
  operations: "Operations",
  director: "Director",
};
