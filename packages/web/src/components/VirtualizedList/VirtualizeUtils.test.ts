import { describe, expect, test } from 'vitest'

import { ListMetricsAggregator } from './ListMetricsAggregator'
import type { CellMetricProps, CellRange } from './types'
import {
  computeWindowedRenderLimits,
  elementsThatOverlapOffsets,
  keyExtractor,
  newRangeCount,
} from './VirtualizeUtils'

type Item = { key: string }

// `count` cells of `length` px each, one after the other, from `getItemLayout`.
const uniformList = (count: number, length: number): CellMetricProps<Item, Item[]> => ({
  data: Array.from({ length: count }, (_, index) => ({ key: String(index) })),
  getItemCount: (data) => data.length,
  getItem: (data, index) => data[index] as Item,
  getItemLayout: (_data, index) => ({ index, length, offset: index * length }),
})

const metrics = new ListMetricsAggregator()

// A 500 px viewport.
const scroll = (offset: number, velocity = 0) => ({ offset, velocity, visibleLength: 500 })

describe('newRangeCount', () => {
  test.each<[string, CellRange, CellRange, number]>([
    ['a subset', { first: 1, last: 4 }, { first: 2, last: 3 }, 0],
    ['the same range', { first: 1, last: 4 }, { first: 1, last: 4 }, 0],
    ['a superset', { first: 2, last: 3 }, { first: 1, last: 4 }, 2],
    ['an overlap ahead', { first: 1, last: 4 }, { first: 3, last: 6 }, 2],
    ['a disjoint range ahead', { first: 0, last: 1 }, { first: 2, last: 3 }, 2],
    ['a disjoint range behind', { first: 4, last: 5 }, { first: 1, last: 2 }, 2],
    ['an empty previous range', { first: 0, last: -1 }, { first: 0, last: 9 }, 10],
  ])('%s', (_name, prev, next, expected) => {
    expect(newRangeCount(prev, next)).toBe(expected)
  })
})

describe('elementsThatOverlapOffsets', () => {
  test('finds the first cell that holds each offset', () => {
    const props = uniformList(10, 100)
    expect(elementsThatOverlapOffsets([0, 100, 150, 1000], props, metrics)).toEqual([0, 0, 1, 9])
  })

  test('an offset after the last cell finds nothing', () => {
    const result = elementsThatOverlapOffsets([1001, 50], uniformList(10, 100), metrics)
    expect(result[0]).toBeUndefined()
    expect(result[1]).toBe(0)
  })

  test('scales the cells with the zoom', () => {
    const props = uniformList(10, 100)
    expect(elementsThatOverlapOffsets([150, 250], props, metrics, 2)).toEqual([0, 1])
  })

  test('finds nothing in an empty list', () => {
    expect(elementsThatOverlapOffsets([0], uniformList(0, 100), metrics)).toEqual([])
  })
})

describe('computeWindowedRenderLimits', () => {
  test('an empty list has no cell', () => {
    expect(
      computeWindowedRenderLimits(
        uniformList(0, 50),
        10,
        21,
        { first: 0, last: -1 },
        metrics,
        scroll(0),
      ),
    ).toEqual({ first: 0, last: -1 })
  })

  test('each call adds at most maxToRenderPerBatch new cells, until the window is full', () => {
    const props = uniformList(100, 50)
    let window: CellRange = { first: 0, last: 9 }
    const lasts: number[] = []
    for (let call = 0; call < 10; call++) {
      window = computeWindowedRenderLimits(props, 10, 21, window, metrics, scroll(0))
      lasts.push(window.last)
    }
    expect(window.first).toBe(0)
    expect(lasts).toEqual([19, 29, 39, 49, 59, 69, 79, 89, 99, 99])
  })

  test('the window shrinks to the overscan area around the viewport', () => {
    // windowSize 3 gives 500 px of overscan on each side of the 500 px viewport at 2500 px.
    const props = uniformList(100, 50)
    expect(
      computeWindowedRenderLimits(props, 10, 3, { first: 0, last: 99 }, metrics, scroll(2500)),
    ).toEqual({ first: 39, last: 69 })
  })

  test('with no scroll, a batch grows on both sides', () => {
    const props = uniformList(100, 50)
    expect(
      computeWindowedRenderLimits(props, 4, 3, { first: 49, last: 59 }, metrics, scroll(2500)),
    ).toEqual({ first: 47, last: 61 })
  })

  test('a scroll toward the end fills after the viewport first', () => {
    const props = uniformList(100, 50)
    expect(
      computeWindowedRenderLimits(props, 4, 3, { first: 49, last: 59 }, metrics, scroll(2500, 5)),
    ).toEqual({ first: 49, last: 63 })
  })

  test('a scroll toward the start fills before the viewport first', () => {
    const props = uniformList(100, 50)
    expect(
      computeWindowedRenderLimits(props, 4, 3, { first: 49, last: 59 }, metrics, scroll(2500, -5)),
    ).toEqual({ first: 45, last: 59 })
  })

  test('a list that ends before the overscan area renders its last batch', () => {
    const props = uniformList(10, 50)
    expect(
      computeWindowedRenderLimits(props, 4, 3, { first: 0, last: 9 }, metrics, scroll(5000)),
    ).toEqual({ first: 5, last: 9 })
  })
})

describe('keyExtractor', () => {
  test('reads key, then id, then the index', () => {
    expect(keyExtractor({ key: 'a', id: 'b' }, 3)).toBe('a')
    expect(keyExtractor({ id: 7 }, 3)).toBe('7')
    expect(keyExtractor({ name: 'c' }, 3)).toBe('3')
    expect(keyExtractor('text', 3)).toBe('3')
    expect(keyExtractor(null, 3)).toBe('3')
  })
})
