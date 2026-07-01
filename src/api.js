export const libraryApiPath = "/api/library";

export const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
};

export const getLibrary = () => requestJson(libraryApiPath);

export const createLibraryEntry = (type, entry) =>
  requestJson(`${libraryApiPath}/${type}`, {
    method: "POST",
    body: JSON.stringify(entry),
  });

export const updateLibraryEntry = (type, id, entry) =>
  requestJson(`${libraryApiPath}/${type}/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(entry),
  });

export const deleteLibraryEntry = (type, id) =>
  requestJson(`${libraryApiPath}/${type}/${encodeURIComponent(id)}`, { method: "DELETE" });
