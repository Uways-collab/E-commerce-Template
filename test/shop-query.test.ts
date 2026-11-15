import { describe, expect, it } from "vitest";
import { parseShopQuery } from "@/lib/shop-query";

describe("parseShopQuery", () => {
  it("defaults to the unfiltered first page", () => {
    const query = parseShopQuery({});
    expect(query).toEqual({
      category: undefined,
      collection: undefined,
      q: undefined,
      minPriceCents: undefined,
      maxPriceCents: undefined,
      sort: "featured",
      inStockOnly: false,
      onSale: false,
      page: 1,
    });
  });

  it("accepts valid filters", () => {
    const query = parseShopQuery({
      category: "shirts",
      collection: "SS26",
      q: "  silk  ",
      price: "50000-150000",
      sort: "price-desc",
      stock: "in",
      sale: "true",
      page: "3",
    });
    expect(query.category).toBe("shirts");
    expect(query.q).toBe("silk");
    expect(query.minPriceCents).toBe(50_000);
    expect(query.maxPriceCents).toBe(150_000);
    expect(query.sort).toBe("price-desc");
    expect(query.inStockOnly).toBe(true);
    expect(query.onSale).toBe(true);
    expect(query.page).toBe(3);
  });

  it("rejects an unknown sort instead of sending it to SQL", () => {
    expect(parseShopQuery({ sort: "DROP TABLE products" }).sort).toBe("featured");
    expect(parseShopQuery({ sort: "" }).sort).toBe("featured");
  });

  it("ignores malformed prices and normalises reversed ranges", () => {
    expect(parseShopQuery({ price: "abc" }).minPriceCents).toBeUndefined();
    expect(parseShopQuery({ price: "1000-" }).maxPriceCents).toBeUndefined();
    expect(parseShopQuery({ price: "-500" }).minPriceCents).toBeUndefined();
    expect(parseShopQuery({ price: "1e9-2" }).minPriceCents).toBeUndefined();

    const reversed = parseShopQuery({ price: "900-100" });
    expect(reversed.minPriceCents).toBe(100);
    expect(reversed.maxPriceCents).toBe(900);
  });

  it("clamps pages and drops non-numeric values", () => {
    expect(parseShopQuery({ page: "-5" }).page).toBe(1);
    expect(parseShopQuery({ page: "abc" }).page).toBe(1);
    expect(parseShopQuery({ page: "0" }).page).toBe(1);
    expect(parseShopQuery({ page: "99999" }).page).toBe(1000);
  });

  it("rejects unsafe slugs and truncates long queries", () => {
    expect(parseShopQuery({ category: "../../etc/passwd" }).category).toBeUndefined();
    expect(parseShopQuery({ collection: "a b" }).collection).toBeUndefined();
    expect(parseShopQuery({ q: "x".repeat(500) }).q).toHaveLength(120);
    expect(parseShopQuery({ q: "line\u0000break" }).q).toBe("linebreak");
  });

  it("takes the first value when a param is repeated", () => {
    expect(parseShopQuery({ category: ["shirts", "bags"] }).category).toBe("shirts");
  });
});
