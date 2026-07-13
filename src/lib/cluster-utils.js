function calculateClusterMetrics({ cellCount, cellValue, filledCells = 0 }) {
  const brutLiquidity = cellCount * cellValue
  const systemShare = brutLiquidity * 0.16
  const netLiquidity = brutLiquidity - systemShare
  const remainingCells = Math.max(cellCount - filledCells, 0)
  const filledValue = filledCells * cellValue
  const remainingValue = remainingCells * cellValue
  const progress = cellCount > 0 ? Math.min((filledCells / cellCount) * 100, 100) : 0
  const isClosed = remainingCells === 0

  return {
    brutLiquidity,
    systemShare,
    netLiquidity,
    remainingCells,
    filledValue,
    remainingValue,
    progress,
    isClosed,
  }
}

function formatCurrency(value) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
}

module.exports = {
  calculateClusterMetrics,
  formatCurrency,
}
