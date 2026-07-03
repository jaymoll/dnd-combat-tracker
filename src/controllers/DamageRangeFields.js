import { clampNumber } from "../utils.js";

export class DamageRangeFields {
  constructor({ minInput, maxInput, bonusInput }) {
    this.minInput = minInput;
    this.maxInput = maxInput;
    this.bonusInput = bonusInput;
  }

  read() {
    const damageMin = clampNumber(this.minInput.value, 0);

    return {
      damageMin,
      damageMax: clampNumber(this.maxInput.value, damageMin),
      damageBonus: clampNumber(this.bonusInput.value, -99),
    };
  }

  reset() {
    this.minInput.value = "1";
    this.maxInput.value = "1";
    this.bonusInput.value = "0";
    this.maxInput.min = "1";
  }

  fill(attack) {
    this.minInput.value = attack.damageMin;
    this.maxInput.value = attack.damageMax;
    this.maxInput.min = attack.damageMin;
    this.bonusInput.value = attack.damageBonus;
  }

  syncMaxLimit() {
    const minDamage = clampNumber(this.minInput.value, 0);
    this.maxInput.min = minDamage;

    if (this.maxInput.value && Number(this.maxInput.value) < minDamage) {
      this.maxInput.value = minDamage;
    }
  }
}
