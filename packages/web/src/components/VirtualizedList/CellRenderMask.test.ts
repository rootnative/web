import { describe, expect, test } from 'vitest'

import { CellRenderMask } from './CellRenderMask'

const spacer = (first: number, last: number) => ({ first, last, isSpacer: true })
const cells = (first: number, last: number) => ({ first, last, isSpacer: false })

describe('CellRenderMask', () => {
  test('a new mask is one spacer over every cell', () => {
    const mask = new CellRenderMask(10)
    expect(mask.numCells()).toBe(10)
    expect(mask.enumerateRegions()).toEqual([spacer(0, 9)])
  })

  test('a mask of no cells has no region', () => {
    expect(new CellRenderMask(0).enumerateRegions()).toEqual([])
  })

  test('a negative cell count throws', () => {
    expect(() => new CellRenderMask(-1)).toThrow(
      'CellRenderMask must contain a non-negative number of cells',
    )
  })

  test('cells at the start split the spacer', () => {
    const mask = new CellRenderMask(10)
    mask.addCells({ first: 0, last: 4 })
    expect(mask.enumerateRegions()).toEqual([cells(0, 4), spacer(5, 9)])
  })

  test('cells in the middle leave a spacer on each side', () => {
    const mask = new CellRenderMask(10)
    mask.addCells({ first: 3, last: 5 })
    expect(mask.enumerateRegions()).toEqual([spacer(0, 2), cells(3, 5), spacer(6, 9)])
  })

  test('cells at the end split the spacer', () => {
    const mask = new CellRenderMask(10)
    mask.addCells({ first: 7, last: 9 })
    expect(mask.enumerateRegions()).toEqual([spacer(0, 6), cells(7, 9)])
  })

  test('cells that overlap a rendered region join it', () => {
    const mask = new CellRenderMask(10)
    mask.addCells({ first: 2, last: 4 })
    mask.addCells({ first: 3, last: 6 })
    expect(mask.enumerateRegions()).toEqual([spacer(0, 1), cells(2, 6), spacer(7, 9)])
  })

  test('cells that bridge two rendered regions join both', () => {
    const mask = new CellRenderMask(10)
    mask.addCells({ first: 1, last: 2 })
    mask.addCells({ first: 6, last: 7 })
    mask.addCells({ first: 2, last: 6 })
    expect(mask.enumerateRegions()).toEqual([spacer(0, 0), cells(1, 7), spacer(8, 9)])
  })

  test('cells next to a rendered region stay a region of their own', () => {
    const mask = new CellRenderMask(10)
    mask.addCells({ first: 2, last: 4 })
    mask.addCells({ first: 5, last: 6 })
    expect(mask.enumerateRegions()).toEqual([spacer(0, 1), cells(2, 4), cells(5, 6), spacer(7, 9)])
  })

  test('cells that are rendered already change nothing', () => {
    const mask = new CellRenderMask(10)
    mask.addCells({ first: 2, last: 6 })
    mask.addCells({ first: 3, last: 5 })
    expect(mask.enumerateRegions()).toEqual([spacer(0, 1), cells(2, 6), spacer(7, 9)])
  })

  test('an empty range changes nothing', () => {
    const mask = new CellRenderMask(10)
    mask.addCells({ first: 3, last: 2 })
    expect(mask.enumerateRegions()).toEqual([spacer(0, 9)])
  })

  test('every cell gives one rendered region', () => {
    const mask = new CellRenderMask(10)
    mask.addCells({ first: 0, last: 9 })
    expect(mask.enumerateRegions()).toEqual([cells(0, 9)])
  })

  test.each([
    { first: -1, last: 2 },
    { first: 2, last: 10 },
    { first: 10, last: 10 },
    { first: 5, last: 3 },
  ])('the range %o throws', (range) => {
    const mask = new CellRenderMask(10)
    expect(() => mask.addCells(range)).toThrow(
      'CellRenderMask.addCells called with invalid cell range',
    )
  })

  test('equals compares the cell count and the regions', () => {
    const a = new CellRenderMask(10)
    const b = new CellRenderMask(10)
    a.addCells({ first: 2, last: 4 })
    expect(a.equals(b)).toBe(false)
    b.addCells({ first: 2, last: 4 })
    expect(a.equals(b)).toBe(true)
    expect(new CellRenderMask(10).equals(new CellRenderMask(11))).toBe(false)
  })
})
