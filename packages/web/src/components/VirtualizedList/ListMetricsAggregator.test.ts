import { describe, expect, test } from 'vitest'

import { ListMetricsAggregator } from './ListMetricsAggregator'
import type { CellMetricProps, ListOrientation } from './types'

type Item = { key: string }

const vertical: ListOrientation = { horizontal: false, rtl: false }
const horizontalRtl: ListOrientation = { horizontal: true, rtl: true }

const listOf = (
  keys: string[],
  extra: Partial<CellMetricProps<Item, Item[]>> = {},
): CellMetricProps<Item, Item[]> => ({
  data: keys.map((key) => ({ key })),
  getItemCount: (data) => data.length,
  getItem: (data, index) => data[index] as Item,
  ...extra,
})

const tenItems = listOf(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])

const row = (y: number, height: number) => ({ x: 0, y, width: 300, height })

const measure = (
  metrics: ListMetricsAggregator,
  cellIndex: number,
  layout: { x: number; y: number; width: number; height: number },
  orientation = vertical,
) => metrics.notifyCellLayout({ cellIndex, cellKey: String(cellIndex), orientation, layout })

describe('ListMetricsAggregator', () => {
  test('a cell layout reports a change only when the offset or the length changes', () => {
    const metrics = new ListMetricsAggregator()
    expect(measure(metrics, 0, row(0, 100))).toBe(true)
    expect(measure(metrics, 0, row(0, 100))).toBe(false)
    expect(measure(metrics, 0, row(10, 100))).toBe(true)
    expect(measure(metrics, 0, row(10, 120))).toBe(true)
  })

  test('the average length follows each measure', () => {
    const metrics = new ListMetricsAggregator()
    measure(metrics, 0, row(0, 100))
    measure(metrics, 1, row(100, 300))
    expect(metrics.getAverageCellLength()).toBe(200)
    measure(metrics, 0, row(0, 200))
    expect(metrics.getAverageCellLength()).toBe(250)
    expect(metrics.getHighestMeasuredCellIndex()).toBe(1)
  })

  test('a measured cell gives its exact metrics', () => {
    const metrics = new ListMetricsAggregator()
    measure(metrics, 2, row(200, 100))
    expect(metrics.getCellMetrics(2, tenItems)).toEqual({
      index: 2,
      length: 100,
      offset: 200,
      isMounted: true,
    })
    expect(metrics.getCellMetrics(3, tenItems)).toBeUndefined()
  })

  test('getItemLayout gives the metrics of a cell with no measure', () => {
    const metrics = new ListMetricsAggregator()
    const props = listOf(['a', 'b', 'c'], {
      getItemLayout: (_data, index) => ({ index, length: 40, offset: index * 40 }),
    })
    expect(metrics.getCellMetrics(2, props)).toEqual({
      index: 2,
      length: 40,
      offset: 80,
      isMounted: true,
    })
  })

  test('an estimate starts after the last measured cell, so a header counts', () => {
    const metrics = new ListMetricsAggregator()
    // A 50 px header comes before the first cell.
    measure(metrics, 0, row(50, 100))
    measure(metrics, 1, row(150, 100))
    expect(metrics.getCellMetricsApprox(4, tenItems)).toEqual({
      index: 4,
      length: 100,
      offset: 450,
      isMounted: false,
    })
  })

  test('with no measured cell, the estimate is 0', () => {
    const metrics = new ListMetricsAggregator()
    expect(metrics.getCellMetricsApprox(5, tenItems)).toEqual({
      index: 5,
      length: 0,
      offset: 0,
      isMounted: false,
    })
  })

  test('a row that moved gets an estimate, not the measure of its old index', () => {
    const metrics = new ListMetricsAggregator()
    measure(metrics, 0, row(0, 100))
    metrics.notifyCellLayout({
      cellIndex: 3,
      cellKey: 'd',
      orientation: vertical,
      layout: row(300, 100),
    })
    // The item with the key `d` is at index 1 now.
    const moved = listOf(['0', 'd', '2', '3'])
    expect(metrics.getCellMetrics(1, moved)).toBeUndefined()
    expect(metrics.getCellMetricsApprox(1, moved)).toEqual({
      index: 1,
      length: 100,
      offset: 100,
      isMounted: false,
    })
  })

  test('the keyExtractor of the props finds the measure', () => {
    const metrics = new ListMetricsAggregator()
    metrics.notifyCellLayout({
      cellIndex: 0,
      cellKey: 'id-a',
      orientation: vertical,
      layout: row(0, 60),
    })
    const props = listOf(['a'], { keyExtractor: (item) => `id-${item.key}` })
    expect(metrics.getCellMetrics(0, props)?.length).toBe(60)
  })

  test('an index out of range throws', () => {
    const metrics = new ListMetricsAggregator()
    expect(() => metrics.getCellMetrics(10, tenItems)).toThrow(
      'Tried to get metrics for out of range cell index 10',
    )
    expect(() => metrics.getCellMetricsApprox(-1, tenItems)).toThrow(
      'Tried to get metrics for out of range cell index -1',
    )
  })

  test('a fractional index gives a point inside the cell', () => {
    const metrics = new ListMetricsAggregator()
    measure(metrics, 1, row(100, 100))
    expect(metrics.getCellOffsetApprox(1, tenItems)).toBe(100)
    expect(metrics.getCellOffsetApprox(1.5, tenItems)).toBe(150)
  })

  test('an unmounted cell keeps its metrics, and the next same layout mounts it again', () => {
    const metrics = new ListMetricsAggregator()
    measure(metrics, 0, row(0, 100))
    metrics.notifyCellUnmounted('0')
    expect(metrics.getCellMetrics(0, tenItems)?.isMounted).toBe(false)
    expect(measure(metrics, 0, row(0, 100))).toBe(false)
    expect(metrics.getCellMetrics(0, tenItems)?.isMounted).toBe(true)
  })

  test('the content length is 0 until the content has a layout', () => {
    const metrics = new ListMetricsAggregator()
    expect(metrics.hasContentLength()).toBe(false)
    expect(metrics.getContentLength()).toBe(0)
    metrics.notifyListContentLayout({ orientation: vertical, layout: { width: 300, height: 900 } })
    expect(metrics.hasContentLength()).toBe(true)
    expect(metrics.getContentLength()).toBe(900)
  })

  test('a horizontal right-to-left list counts offsets from the right', () => {
    const metrics = new ListMetricsAggregator()
    metrics.notifyListContentLayout({
      orientation: horizontalRtl,
      layout: { width: 1000, height: 50 },
    })
    measure(metrics, 0, { x: 900, y: 0, width: 100, height: 50 }, horizontalRtl)
    expect(metrics.getCellMetrics(0, tenItems)).toEqual({
      index: 0,
      length: 100,
      offset: 0,
      isMounted: true,
    })
    expect(metrics.cartesianOffset(100)).toBe(900)
    expect(metrics.flowRelativeOffset({ x: 0, y: 0, width: 100, height: 50 }, 500)).toBe(400)
  })

  test('a right-to-left offset with no content length throws', () => {
    const metrics = new ListMetricsAggregator()
    expect(() =>
      measure(metrics, 0, { x: 0, y: 0, width: 100, height: 50 }, horizontalRtl),
    ).toThrow(
      'ListMetricsAggregator must be notified of list content layout before resolving offsets',
    )
  })

  test('a change of axis drops every measure', () => {
    const metrics = new ListMetricsAggregator()
    measure(metrics, 0, row(0, 100))
    metrics.notifyListContentLayout({ orientation: vertical, layout: { width: 300, height: 900 } })
    metrics.notifyListContentLayout({
      orientation: { horizontal: true, rtl: false },
      layout: { width: 300, height: 900 },
    })
    expect(metrics.getAverageCellLength()).toBe(0)
    expect(metrics.getCellMetrics(0, tenItems)).toBeUndefined()
    expect(metrics.getContentLength()).toBe(300)
  })
})
