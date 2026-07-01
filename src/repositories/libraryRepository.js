import { createLibraryEntry, deleteLibraryEntry, getLibrary, updateLibraryEntry } from "../api.js";

export class LibraryRepository {
  async getLibrary() {
    throw new Error("LibraryRepository.getLibrary must be implemented");
  }

  async createEntry(type, entry) {
    throw new Error("LibraryRepository.createEntry must be implemented");
  }

  async updateEntry(type, id, entry) {
    throw new Error("LibraryRepository.updateEntry must be implemented");
  }

  async deleteEntry(type, id) {
    throw new Error("LibraryRepository.deleteEntry must be implemented");
  }
}

export class HttpLibraryRepository extends LibraryRepository {
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
