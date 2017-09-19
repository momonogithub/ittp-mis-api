export const reConvertDecimal = data => (Math.ceil(data / 100)) / 100

export const commaNumber = number => {
  const parts = number.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}