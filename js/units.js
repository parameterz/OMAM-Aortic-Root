// Unit conversion and body-size indices. The page keeps height in cm and weight in kg internally
// and converts only what is displayed, so switching units back and forth never drifts.

export const CM_PER_IN = 2.54;
export const KG_PER_LB = 0.45359237;

export const toCm = (v, unit) => (unit === "in" ? v * CM_PER_IN : v);
export const fromCm = (cm, unit) => (unit === "in" ? cm / CM_PER_IN : cm);
export const toKg = (v, unit) => (unit === "lb" ? v * KG_PER_LB : v);
export const fromKg = (kg, unit) => (unit === "lb" ? kg / KG_PER_LB : kg);

/** Body mass index, kg/m². */
export const bmi = (cm, kg) => kg / Math.pow(cm / 100, 2);

/** Body surface area, m² (Du Bois and Du Bois 1916, as used in the paper). */
export const bsaDuBois = (cm, kg) => 0.007184 * Math.pow(kg, 0.425) * Math.pow(cm, 0.725);

/** 177.8 cm → "5 ft 10 in". */
export function feetInches(cm) {
  const total = Math.round(cm / CM_PER_IN);
  return `${Math.floor(total / 12)} ft ${total % 12} in`;
}
