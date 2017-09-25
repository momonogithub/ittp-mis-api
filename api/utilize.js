export const reConvertDecimal = data => Number((Math.ceil(data / 100)) / 100).toFixed(2)

export const commaNumber = number => {
  const parts = number.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}