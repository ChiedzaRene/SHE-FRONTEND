const fieldName = (loc) => {
  const key = Array.isArray(loc) ? loc[loc.length - 1] : "";
  if (typeof key !== "string" || key === "body") return "";
  const label = key.replace(/_id$/, "").replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const describeFieldError = (d) => {
  const field = fieldName(d.loc);
  let msg = String(d.msg || "").replace(/^Value error, /, "");
  if (/should match pattern/i.test(msg)) msg = "isn't in the right format";
  else if (/at least (\d+) character/i.test(msg)) msg = `must be at least ${msg.match(/at least (\d+)/i)[1]} characters`;
  else if (/at most (\d+) character/i.test(msg)) msg = `must be at most ${msg.match(/at most (\d+)/i)[1]} characters`;
  else if (/field required/i.test(msg)) msg = "is required";
  else if (field) msg = msg.charAt(0).toLowerCase() + msg.slice(1);
  return field ? `${field} ${msg}` : msg;
};

// Turn any failed API call into one readable sentence for the user.
export const apiError = (err, fallback = "Something went wrong. Please try again.") => {
  if (err.code === "ECONNABORTED") return "The server is taking too long to respond. Please try again in a moment.";
  if (!err.response) return "Can't reach the server. Check your connection and try again.";
  const { status, data } = err.response;
  const detail = data?.detail;
  if (status === 429) return typeof detail === "string" && detail.includes("wait") ? detail : "Too many attempts. Please wait a minute and try again.";
  if (typeof detail === "string") return detail;
  // 422 validation errors arrive as a list of { msg, loc }: name the field and say what's wrong in plain words
  if (Array.isArray(detail) && detail.length) {
    return detail.map(describeFieldError).filter(Boolean).join(". ");
  }
  return fallback;
};
