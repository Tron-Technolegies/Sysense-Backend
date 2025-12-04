export function generateRegex(value) {
  const expression = new RegExp(value, "i");
  return expression;
}
