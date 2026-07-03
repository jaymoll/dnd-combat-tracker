import { escapeHtml } from "../utils.js";

export class AssignmentListController {
  constructor({ listElement, emptyElement, keyFields }) {
    this.listElement = listElement;
    this.emptyElement = emptyElement;
    this.keyFields = keyFields;
    this.availableItems = [];
  }

  setAvailableItems(items) {
    this.availableItems = items ?? [];
    this.render();
  }

  getSelectedItems() {
    return Array.from(this.listElement.querySelectorAll("input[type='checkbox']:checked"))
      .map((input) => this.availableItems[Number(input.value)])
      .filter(Boolean);
  }

  render(selectedItems = this.getSelectedItems()) {
    const selectedKeys = new Set(selectedItems.map((item) => this.getKey(item)));

    this.emptyElement.hidden = this.availableItems.length > 0;
    this.listElement.innerHTML = this.availableItems
      .map((item, index) => this.renderChoice(item, index, selectedKeys))
      .join("");
  }

  renderChoice(item, index, selectedKeys) {
    return `<label class="spell-choice">
      <input type="checkbox" value="${index}" ${selectedKeys.has(this.getKey(item)) ? "checked" : ""} />
      <span>${escapeHtml(item.name)}</span>
    </label>`;
  }

  setDisabled(disabled) {
    this.listElement.querySelectorAll("input").forEach((input) => {
      input.disabled = disabled;
    });
  }

  getKey(item) {
    return this.keyFields.map((field) => item[field]).join("|");
  }
}
