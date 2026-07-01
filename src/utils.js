export const clampNumber = (value, min, max = Number.MAX_SAFE_INTEGER) => {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return min;
  return Math.min(Math.max(number, min), max);
};

export const parseInteger = (value, fallback = 0) => {
  const number = Number.parseInt(value, 10);
  return Number.isNaN(number) ? fallback : number;
};

export const rollInclusive = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });

export const formatModifier = (value) => (value >= 0 ? `+${value}` : String(value));
