// Turn any failed API call into one readable sentence for the user.
export const apiError = (err, fallback = "Something went wrong. Please try again.") => {
  if (err.code === "ECONNABORTED") return "The server is taking too long to respond. Please try again in a moment.";
  if (!err.response) return "Can't reach the server. Check your connection and try again.";
  const { status, data } = err.response;
  const detail = data?.detail;
  if (status === 429) return typeof detail === "string" && detail.includes("wait") ? detail : "Too many attempts. Please wait a minute and try again.";
  if (typeof detail === "string") return detail;
  // 422 validation errors arrive as a list of { msg, loc }
  if (Array.isArray(detail) && detail.length) {
    return detail.map((d) => String(d.msg || "").replace(/^Value error, /, "")).filter(Boolean).join(". ");
  }
  return fallback;
};
