import { CombatTrackerApp } from "./src/app/CombatTrackerApp.js";
import { elements } from "./src/dom.js";
import { HttpLibraryRepository } from "./src/repositories/libraryRepository.js";

const app = new CombatTrackerApp({
  elements,
  libraryRepository: new HttpLibraryRepository(),
});

app.init();
