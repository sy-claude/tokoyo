// エンティティIDの発行（生成順の整数、1から。09 4.4）。

/** @typedef {{next:number}} IdGen */

/** @returns {IdGen} */
export function createIdGen() {
  return { next: 1 };
}

/** @param {IdGen} gen */
export function nextId(gen) {
  const id = gen.next;
  gen.next += 1;
  return id;
}
