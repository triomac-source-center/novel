const SYSTEM_SHARE_RATE = 0.16

function calculateClusterMetrics({ cellCount, cellValue, filledCells = 0, currentLayer = 1, maxLayers = 1, layerStep = 0 }) {
  const safeCellCount = Math.max(Number(cellCount) || 0, 0)
  const safeCellValue = Math.max(Number(cellValue) || 0, 0)
  const safeLayer = Math.max(Number(currentLayer) || 1, 1)
  const safeMaxLayers = Math.max(Number(maxLayers) || 1, 1)
  const safeLayerStep = Math.max(Number(layerStep) || 0, 0)
  const safeFilledCells = Math.min(Math.max(Number(filledCells) || 0, 0), safeCellCount)
  const currentCellPrice = safeCellValue + (safeLayer - 1) * safeLayerStep
  // Gross/system/net liquidity reflect the CURRENT layer's price, not the frozen layer-1 base —
  // entry per cell rises every layer, so the cluster's total value and the system's cut do too.
  const brutLiquidity = safeCellCount * currentCellPrice
  const systemShare = brutLiquidity * SYSTEM_SHARE_RATE
  const netLiquidity = brutLiquidity - systemShare
  const remainingCells = Math.max(safeCellCount - safeFilledCells, 0)
  const filledValue = safeFilledCells * currentCellPrice
  const remainingValue = remainingCells * currentCellPrice
  const progress = safeCellCount > 0 ? Math.min((safeFilledCells / safeCellCount) * 100, 100) : 0
  const layerComplete = remainingCells === 0
  const isClosed = layerComplete && safeLayer >= safeMaxLayers
  return { brutLiquidity, systemShare, netLiquidity, currentCellPrice, remainingCells, filledValue, remainingValue, progress, layerComplete, isClosed, currentLayer: safeLayer, maxLayers: safeMaxLayers, layerStep: safeLayerStep }
}

function formatCurrency(value) {
  // Cluster prices/liquidity move in cents (layer step increments, per-cell fractions), so always
  // show 2 decimals instead of rounding down to whole dollars.
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) || 0)
}

module.exports = { SYSTEM_SHARE_RATE, calculateClusterMetrics, formatCurrency }
