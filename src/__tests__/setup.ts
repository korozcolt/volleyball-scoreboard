// Los stores usan localStorage y window; en Node se simulan con un almacenamiento en memoria.
const memory = new Map<string, string>()

Object.assign(globalThis, {
  localStorage: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => void memory.set(key, value),
    removeItem: (key: string) => void memory.delete(key),
    clear: () => memory.clear(),
  },
})
