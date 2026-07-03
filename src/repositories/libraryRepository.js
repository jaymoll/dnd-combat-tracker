import { createLibraryEntry, deleteLibraryEntry, getLibrary, updateLibraryEntry } from "../api.js";

export class HttpLibraryRepository {
  getLibrary() {
    return getLibrary();
  }

  createEntry(type, entry) {
    return createLibraryEntry(type, entry);
  }

  updateEntry(type, id, entry) {
    return updateLibraryEntry(type, id, entry);
  }

  deleteEntry(type, id) {
    return deleteLibraryEntry(type, id);
  }
}
