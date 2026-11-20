/** Small, serializable PRNG. The unsigned 32-bit state makes runs reproducible. */
export class DeterministicRandom {
  public constructor(private state: number) {
    this.state >>>= 0;
  }

  public next(): number {
    let value = (this.state += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    this.state = value >>> 0;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  public integer(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new Error("maxExclusive must be positive");
    return Math.floor(this.next() * maxExclusive);
  }

  public getState(): number { return this.state >>> 0; }
}
