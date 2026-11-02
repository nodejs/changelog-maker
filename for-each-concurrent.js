// Call `worker` for each item, in order, with at most `concurrency` in flight.
export async function forEachConcurrent (items, concurrency, worker) {
  const iterator = items.values()

  await Promise.all(Array.from({ length: concurrency }, async () => {
    for (const item of iterator) {
      await worker(item)
    }
  }))
}
