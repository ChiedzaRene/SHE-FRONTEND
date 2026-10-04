// Turn any failed API call into one readable sentence for the user.
export const apiError = (err, fallback = "Something went wrong. Please try again.") => {
  if (!err.response) return "Can't reach the server. Check your connection and try again.";
  const { status, data } = err.response;
  if (status === 429) return "Too many attempts. Please wait a minute and try again.";
  const detail = data?.detail;
  if (typeof detail === "string") return detail;
  // 422 validation errors arrive as a list of { msg, loc }
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => String(d.msg || "").replace(/^Value error, /, "")).filter(Boolean).join(". ");
  }
  return fallback;
};
