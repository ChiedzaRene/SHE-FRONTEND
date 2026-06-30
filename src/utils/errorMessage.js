const normalizeValidationDetail = (detail) => {
  if (!detail) return "";

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => normalizeValidationDetail(item))
      .filter(Boolean)
      .join("; ");
  }

  if (typeof detail === "object") {
    if (typeof detail.msg === "string") return detail.msg;
    if (typeof detail.message === "string") return detail.message;
    if (typeof detail.detail === "string") return detail.detail;
    return Object.values(detail)
      .map((value) => normalizeValidationDetail(value))
      .filter(Boolean)
      .join("; ");
  }

  return String(detail);
};

export const getErrorMessage = (error, fallback = "Something went wrong.") => {
  const data = error?.response?.data;

  return (
    normalizeValidationDetail(data?.detail) ||
    normalizeValidationDetail(data) ||
    error?.message ||
    fallback
  );
};