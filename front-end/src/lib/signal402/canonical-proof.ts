import { keccak256, type Hex } from "viem";

import type { Signal402Report } from "./report-contract";

export type JcsValue =
  | null
  | boolean
  | number
  | string
  | JcsValue[]
  | { [key: string]: JcsValue };

const encoder = new TextEncoder();
const MARKET_ID_DOMAIN = "signal402:market-id:v1\n";
const CONTENT_DOMAIN = "signal402:content:v1\n";

function assertUnicode(value: string, path: string) {
  for (let index = 0; index < value.length; index += 1) {
    const first = value.charCodeAt(index);
    let codePoint = first;

    if (first >= 0xd800 && first <= 0xdbff) {
      const second = value.charCodeAt(index + 1);
      if (!Number.isInteger(second) || second < 0xdc00 || second > 0xdfff) {
        throw new TypeError(`Unpaired high surrogate at ${path}`);
      }
      codePoint = 0x10000 + ((first - 0xd800) << 10) + (second - 0xdc00);
      index += 1;
    } else if (first >= 0xdc00 && first <= 0xdfff) {
      throw new TypeError(`Unpaired low surrogate at ${path}`);
    }

    if (
      (codePoint >= 0xfdd0 && codePoint <= 0xfdef) ||
      (codePoint & 0xffff) === 0xfffe ||
      (codePoint & 0xffff) === 0xffff
    ) {
      throw new TypeError(`Unicode noncharacter at ${path}`);
    }
  }
}

function serializeJcs(
  value: unknown,
  path: string,
  ancestors: WeakSet<object>,
): string {
  if (value === null || typeof value === "boolean") {
    return JSON.stringify(value);
  }

  if (typeof value === "string") {
    assertUnicode(value, path);
    return JSON.stringify(value);
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError(`Non-finite number at ${path}`);
    }
    return JSON.stringify(value);
  }

  if (typeof value !== "object") {
    throw new TypeError(`Non-JSON value at ${path}`);
  }

  if (ancestors.has(value)) {
    throw new TypeError(`Cyclic value at ${path}`);
  }
  ancestors.add(value);

  try {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index)) {
          throw new TypeError(`Sparse array at ${path}[${index}]`);
        }
      }
      const expectedKeys = new Set([
        "length",
        ...value.map((_entry, index) => String(index)),
      ]);
      const ownKeys = Reflect.ownKeys(value);
      if (
        ownKeys.length !== expectedKeys.size ||
        ownKeys.some((key) => typeof key !== "string" || !expectedKeys.has(key))
      ) {
        throw new TypeError(`Non-JSON array property at ${path}`);
      }
      return `[${value.map((entry, index) => serializeJcs(entry, `${path}[${index}]`, ancestors)).join(",")}]`;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`Non-plain object at ${path}`);
    }

    const keys = Object.keys(value);
    const ownKeys = Reflect.ownKeys(value);
    if (
      ownKeys.length !== keys.length ||
      ownKeys.some((key) => typeof key !== "string")
    ) {
      throw new TypeError(`Non-enumerable or symbol property at ${path}`);
    }

    const serialized = keys.sort().map((key) => {
      assertUnicode(key, `${path} key`);
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor)) {
        throw new TypeError(`Accessor property at ${path}.${key}`);
      }
      return `${JSON.stringify(key)}:${serializeJcs(descriptor.value, `${path}.${key}`, ancestors)}`;
    });
    return `{${serialized.join(",")}}`;
  } finally {
    ancestors.delete(value);
  }
}

export function canonicalizeJcs(value: JcsValue): string {
  return serializeJcs(value, "$", new WeakSet());
}

export function canonicalizeJcsBytes(value: JcsValue): Uint8Array {
  return encoder.encode(canonicalizeJcs(value));
}

export function parseUniqueJson(input: string | Uint8Array): JcsValue {
  let source: string;
  try {
    source =
      typeof input === "string"
        ? input
        : new TextDecoder("utf-8", { fatal: true }).decode(input);
  } catch {
    throw new SyntaxError("JSON input must be valid UTF-8");
  }

  let cursor = 0;
  const skipWhitespace = () => {
    while (
      cursor < source.length &&
      /[\u0009\u000a\u000d\u0020]/.test(source[cursor])
    )
      cursor += 1;
  };

  const parseString = (path: string) => {
    const start = cursor;
    cursor += 1;
    while (cursor < source.length) {
      const code = source.charCodeAt(cursor);
      if (code === 0x22) {
        cursor += 1;
        const parsed = JSON.parse(source.slice(start, cursor)) as string;
        assertUnicode(parsed, path);
        return parsed;
      }
      if (code <= 0x1f)
        throw new SyntaxError(`Unescaped control character at ${path}`);
      if (code === 0x5c) {
        cursor += 1;
        const escape = source[cursor];
        if (escape === "u") {
          if (!/^[0-9a-fA-F]{4}$/.test(source.slice(cursor + 1, cursor + 5))) {
            throw new SyntaxError(`Invalid Unicode escape at ${path}`);
          }
          cursor += 5;
          continue;
        }
        if (!'"\\/bfnrt'.includes(escape ?? "")) {
          throw new SyntaxError(`Invalid string escape at ${path}`);
        }
      }
      cursor += 1;
    }
    throw new SyntaxError(`Unterminated string at ${path}`);
  };

  const parseValue = (path: string): JcsValue => {
    skipWhitespace();
    const token = source[cursor];

    if (token === '"') return parseString(path);
    if (token === "{") {
      cursor += 1;
      skipWhitespace();
      const result: Record<string, JcsValue> = {};
      const names = new Set<string>();
      if (source[cursor] === "}") {
        cursor += 1;
        return result;
      }
      while (cursor < source.length) {
        if (source[cursor] !== '"')
          throw new SyntaxError(`Expected object property name at ${path}`);
        const name = parseString(`${path} key`);
        if (names.has(name))
          throw new SyntaxError(
            `Duplicate object property ${JSON.stringify(name)} at ${path}`,
          );
        names.add(name);
        skipWhitespace();
        if (source[cursor] !== ":")
          throw new SyntaxError(
            `Expected colon after property name at ${path}`,
          );
        cursor += 1;
        const value = parseValue(`${path}.${name}`);
        Object.defineProperty(result, name, {
          value,
          enumerable: true,
          configurable: true,
          writable: true,
        });
        skipWhitespace();
        if (source[cursor] === "}") {
          cursor += 1;
          return result;
        }
        if (source[cursor] !== ",")
          throw new SyntaxError(`Expected comma at ${path}`);
        cursor += 1;
        skipWhitespace();
      }
      throw new SyntaxError(`Unterminated object at ${path}`);
    }
    if (token === "[") {
      cursor += 1;
      skipWhitespace();
      const result: JcsValue[] = [];
      if (source[cursor] === "]") {
        cursor += 1;
        return result;
      }
      while (cursor < source.length) {
        result.push(parseValue(`${path}[${result.length}]`));
        skipWhitespace();
        if (source[cursor] === "]") {
          cursor += 1;
          return result;
        }
        if (source[cursor] !== ",")
          throw new SyntaxError(`Expected comma at ${path}`);
        cursor += 1;
      }
      throw new SyntaxError(`Unterminated array at ${path}`);
    }

    for (const [literal, value] of [
      ["true", true],
      ["false", false],
      ["null", null],
    ] as const) {
      if (source.startsWith(literal, cursor)) {
        cursor += literal.length;
        return value;
      }
    }

    const numberToken = source
      .slice(cursor)
      .match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)?.[0];
    if (numberToken) {
      cursor += numberToken.length;
      const value = Number(numberToken);
      if (!Number.isFinite(value))
        throw new SyntaxError(`Non-finite number at ${path}`);
      if (Number.isInteger(value) && !Number.isSafeInteger(value)) {
        throw new SyntaxError(
          `Unsafe integer at ${path}; encode it as a string`,
        );
      }
      return value;
    }
    throw new SyntaxError(`Unexpected JSON token at ${path}`);
  };

  const result = parseValue("$");
  skipWhitespace();
  if (cursor !== source.length)
    throw new SyntaxError("Unexpected trailing JSON data");
  return result;
}

function domainSeparatedBytes(domain: string, payload: Uint8Array) {
  const prefix = encoder.encode(domain);
  const combined = new Uint8Array(prefix.length + payload.length);
  combined.set(prefix);
  combined.set(payload, prefix.length);
  return combined;
}

export function hashMarketId(normalizedMarketId: string): Hex {
  if (!/^[1-9]\d*$/.test(normalizedMarketId)) {
    throw new TypeError(
      "Market ID must be a positive canonical base-10 string",
    );
  }
  return keccak256(encoder.encode(MARKET_ID_DOMAIN + normalizedMarketId));
}

export type ContentPayload = Readonly<{
  schemaVersion: Signal402Report["schemaVersion"];
  marketId: string;
  source: Signal402Report["source"];
  analysis: Signal402Report["analysis"];
  generation: Signal402Report["generation"];
  disclaimer: Signal402Report["disclaimer"];
}>;

export function selectContentPayload(report: Signal402Report): ContentPayload {
  return {
    schemaVersion: report.schemaVersion,
    marketId: report.request.marketId,
    source: report.source,
    analysis: report.analysis,
    generation: report.generation,
    disclaimer: report.disclaimer,
  };
}

export function hashContentPayload(payload: ContentPayload): Hex {
  return keccak256(
    domainSeparatedBytes(
      CONTENT_DOMAIN,
      canonicalizeJcsBytes(payload as JcsValue),
    ),
  );
}

export const proofDomains = {
  marketId: MARKET_ID_DOMAIN,
  content: CONTENT_DOMAIN,
} as const;
