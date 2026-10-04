// Hand a file the browser fetched (with our auth header) to the user as a download.
export const saveBlobResponse = (res, fallbackName) => {
  const disposition = res.headers["content-disposition"] || "";
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const url = URL.createObjectURL(res.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = match ? match[1] : fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
