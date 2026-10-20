// The page each role lands on after signing in (and is sent back to from pages it can't open)
export const homeFor = (role) => {
  switch (role) {
    case "admin":
    case "super_admin":
      return "/admin";
    case "she_team":
    case "operations":
    case "director":
      return "/she-dashboard";
    case "site_manager":
      return "/site-dashboard";
    case "regional_manager":
      return "/inspections";
    default:
      return "/login";
  }
};
