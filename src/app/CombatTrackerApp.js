import { CombatTrackerEventBinder } from "./CombatTrackerEventBinder.js";
import { BattleMapController } from "../controllers/BattleMapController.js";
import { CombatantFormController } from "../controllers/CombatantFormController.js";
import { EncounterDifficultyController } from "../controllers/EncounterDifficultyController.js";
import { QuickAccessController } from "../controllers/QuickAccessController.js";
import { RosterController } from "../controllers/RosterController.js";
import { ScreenController } from "../controllers/ScreenController.js";
import { SpellFormController } from "../controllers/SpellFormController.js";
import { TargetController } from "../controllers/TargetController.js";
import { TurnController } from "../controllers/TurnController.js";
import { WeaponFormController } from "../controllers/WeaponFormController.js";
import { createInitialState } from "../models.js";
import { CombatTrackerRenderer } from "../renderers/CombatTrackerRenderer.js";
import { CombatantFactory } from "../services/combatantFactory.js";
import { AttackLibraryWorkflow } from "../workflows/AttackLibraryWorkflow.js";
import { BattleMapWorkflow } from "../workflows/BattleMapWorkflow.js";
import { CreatureWorkflow } from "../workflows/CreatureWorkflow.js";
import { EncounterWorkflow } from "../workflows/EncounterWorkflow.js";
import { ListInteractionWorkflow } from "../workflows/ListInteractionWorkflow.js";

export class CombatTrackerApp {
  constructor({ elements, libraryRepository }) {
    this.elements = elements;
    this.state = createInitialState();

    this.formController = new CombatantFormController(elements);
    this.spellFormController = new SpellFormController(elements);
    this.weaponFormController = new WeaponFormController(elements);
    this.targetController = new TargetController();
    this.quickAccessController = new QuickAccessController(libraryRepository, elements);
    this.encounterDifficultyController = new EncounterDifficultyController(
      elements,
      () => this.quickAccessController.items.monster ?? [],
    );
    this.turnController = new TurnController();
    this.combatantFactory = new CombatantFactory();
    this.rosterController = new RosterController(this.combatantFactory);
    this.battleMapController = new BattleMapController(elements, this.targetController, () => this.render());
    this.renderer = new CombatTrackerRenderer(
      elements,
      this.formController,
      this.targetController,
      this.spellFormController,
      this.weaponFormController,
      this.battleMapController,
      this.turnController,
    );

    this.screenController = new ScreenController(elements);
    this.createWorkflows();
    this.eventBinder = new CombatTrackerEventBinder({
      elements,
      screenController: this.screenController,
      battleMapWorkflow: this.battleMapWorkflow,
      creatureWorkflow: this.creatureWorkflow,
      attackLibraryWorkflow: this.attackLibraryWorkflow,
      encounterWorkflow: this.encounterWorkflow,
      listInteractionWorkflow: this.listInteractionWorkflow,
      encounterDifficultyController: this.encounterDifficultyController,
    });
  }

  createWorkflows() {
    const getState = () => this.state;
    const render = () => this.render();

    this.encounterWorkflow = new EncounterWorkflow({
      elements: this.elements,
      formController: this.formController,
      rosterController: this.rosterController,
      targetController: this.targetController,
      turnController: this.turnController,
      getState,
      setState: (state) => {
        this.state = state;
      },
      render,
    });
    this.battleMapWorkflow = new BattleMapWorkflow({
      elements: this.elements,
      battleMapController: this.battleMapController,
      getState,
      render,
    });
    this.creatureWorkflow = new CreatureWorkflow({
      elements: this.elements,
      formController: this.formController,
      quickAccessController: this.quickAccessController,
      rosterController: this.rosterController,
      encounterWorkflow: this.encounterWorkflow,
      getState,
      render,
    });
    this.attackLibraryWorkflow = new AttackLibraryWorkflow({
      elements: this.elements,
      spellFormController: this.spellFormController,
      weaponFormController: this.weaponFormController,
      quickAccessController: this.quickAccessController,
      getState,
      render,
    });
    this.listInteractionWorkflow = new ListInteractionWorkflow({
      elements: this.elements,
      formController: this.formController,
      combatantFactory: this.combatantFactory,
      quickAccessController: this.quickAccessController,
      rosterController: this.rosterController,
      targetController: this.targetController,
      renderer: this.renderer,
      encounterWorkflow: this.encounterWorkflow,
      getState,
      render,
    });
  }

  async init() {
    this.bindEvents();
    this.screenController.showCurrent({ updatePath: false });
    this.formController.syncMonsterFields();
    this.render();
    await this.quickAccessController.load();
    this.render();
  }

  bindEvents() {
    this.eventBinder.bindAll();
  }

  render() {
    this.turnController.prepareForRender(this.state);
    this.renderer.render(this.state, this.quickAccessController.items);
    this.encounterDifficultyController.render();
  }
}
