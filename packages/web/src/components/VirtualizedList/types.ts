export type CellMetrics = {
  index: number
  // Along the scroll axis.
  length: number
  // From the start of the list, along the scroll axis.
  offset: number
  // False after the cell unmounts. A metric from `getItemLayout` is exact, so it's true too.
  isMounted: boolean
}

export type ListOrientation = { horizontal: boolean; rtl: boolean }

// The props that the cell metrics read.
export type CellMetricProps<ItemT, DataT> = {
  data: DataT
  getItemCount: (data: DataT) => number
  getItem: (data: DataT, index: number) => ItemT
  getItemLayout?:
    ((data: DataT, index: number) => { length: number; offset: number; index: number }) | undefined
  keyExtractor?: ((item: ItemT, index: number) => string) | null | undefined
}

// An inclusive range, so `{ first: 0, last: -1 }` holds no cell.
export type CellRange = { first: number; last: number }

export type CellMetricsSource = {
  getCellMetricsApprox<ItemT, DataT>(
    index: number,
    props: CellMetricProps<ItemT, DataT>,
  ): CellMetrics
}
