export class ScopedEnvironment<K, V> {
  private envs: Map<K, V>[];

  constructor() {
    this.envs = [];
  }

  public enterNewScope(): void {
    this.envs.push(new Map<K, V>());
  }

  public toString(): string {
    let s = "SCOPES<[";
    for (let i = this.envs.length - 1; i >= 0; i--) {
      const m = [ ...this.envs[i].entries() ].map((([K,V]) => `${K}:${V}`)).join(",")
      s += `#${i}={${m}}, `
    }
    s += "]>"
    return s;
  }

  public exitLastScope(): void {
    if (this.envs.pop() === undefined) {
      throw `Invalid scope exit: empty environment`;
    }
  }

  public add(key: K, value: V): void {
    if (this.envs.length === 0) {
      throw `Invalid env add: no available scopes`;
    }

    this.envs.at(-1)!.set(key, value);
  }

  public get(key: K): V | undefined {
    if (this.envs.length === 0) {
      throw `Invalid env get: no available scopes`;
    }

    for (let i = this.envs.length - 1; i >= 0; i--) {
      if (this.envs[i].has(key)) {
        return this.envs[i].get(key)!;
      }
    }

    return undefined;
  }
}
