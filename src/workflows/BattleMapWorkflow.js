export class BattleMapWorkflow {
  constructor({ elements, battleMapController, getState, render }) {
    this.elements = elements;
    this.battleMapController = battleMapController;
    this.getState = getState;
    this.render = render;
  }

  changeGrid() {
    if (!this.battleMapController.setGridType(this.getState(), this.elements.battleMapGridType.value)) return;

    this.render();
  }

  resize() {
    const didResize = this.battleMapController.setGridSize(
      this.getState(),
      this.elements.battleMapWidth.value,
      this.elements.battleMapHeight.value,
    );
    if (!didResize) return;

    this.render();
  }

  zoom() {
    if (!this.battleMapController.setZoom(this.getState(), this.elements.battleMapZoom.value)) return;

    this.render();
  }

  resetPositions() {
    this.battleMapController.resetPositions(this.getState());
    this.render();
  }

  startDrag(event) {
    this.battleMapController.startDrag(event, this.getState());
  }

  previewAreaTarget(event) {
    this.battleMapController.previewAreaTarget(event, this.getState());
  }
}
