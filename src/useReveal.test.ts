import { describe, expect, it } from 'vitest'
import { createRevealScheduler } from './useReveal'

function setup(perStep = 2) {
  const tasks: (() => void)[] = []
  const scheduler = createRevealScheduler((run) => tasks.push(run), perStep)
  const revealed: string[] = []
  const settle = new Map<string, () => void>()
  const add = (name: string, priority: number) =>
    settle.set(name, scheduler.enqueue(priority, () => revealed.push(name)))
  const flush = () => {
    while (tasks.length) tasks.shift()!()
  }
  return { scheduler, revealed, settle, add, flush, tasks }
}

describe('createRevealScheduler', () => {
  it('reveals by priority, a step at a time', () => {
    const { revealed, settle, add, flush } = setup()
    add('b2', 2)
    add('a1', 1)
    add('b1', 1)
    add('a2', 2)
    flush()
    expect(revealed).toEqual(['a1', 'b1'])
    settle.get('a1')!()
    flush()
    expect(revealed).toEqual(['a1', 'b1'])
    settle.get('b1')!()
    flush()
    expect(revealed).toEqual(['a1', 'b1', 'b2', 'a2'])
  })

  it('skips chunks that unmount before their turn', () => {
    const { revealed, settle, add, flush } = setup(1)
    add('a', 1)
    add('b', 2)
    add('c', 3)
    flush()
    settle.get('b')!()
    settle.get('a')!()
    flush()
    expect(revealed).toEqual(['a', 'c'])
  })

  it('moves on when an in-flight chunk unmounts', () => {
    const { revealed, settle, add, flush } = setup(1)
    add('a', 1)
    add('b', 1)
    flush()
    expect(revealed).toEqual(['a'])
    settle.get('a')!()
    flush()
    expect(revealed).toEqual(['a', 'b'])
  })

  it('waits while paused', () => {
    const { scheduler, revealed, add, flush } = setup()
    scheduler.setPaused(true)
    add('a', 1)
    flush()
    expect(revealed).toEqual([])
    scheduler.setPaused(false)
    flush()
    expect(revealed).toEqual(['a'])
  })
})
