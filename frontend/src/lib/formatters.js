export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'N/A'
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return 'N/A'
  return `$${numericValue.toLocaleString()}`
}

export const formatDate = (value, localeOptions = {}) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...localeOptions,
  })
}
