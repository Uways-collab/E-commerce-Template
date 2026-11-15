import { describe, expect, it } from "vitest";
import { isOptionalImageSource, normaliseImageSource, sanitizeImageList } from "@/lib/images";

describe("normaliseImageSource", () => {
  it("accepts site-relative paths and https URLs", () => {
    expect(normaliseImageSource("/images/hero.jpg")).toBe("/images/hero.jpg");
    expect(normaliseImageSource("/api/media/abc.webp")).toBe("/api/media/abc.webp");
    expect(normaliseImageSource("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(normaliseImageSource("  https://cdn.example.com/a.jpg  ")).toBe("https://cdn.example.com/a.jpg");
  });

  it("rejects dangerous or malformed sources", () => {
    expect(normaliseImageSource("javascript:alert(1)")).toBeNull();
    expect(normaliseImageSource("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(normaliseImageSource("http://insecure.example.com/a.jpg")).toBeNull();
    expect(normaliseImageSource("//evil.example.com/a.jpg")).toBeNull();
    expect(normaliseImageSource("https://localhost/a.jpg")).toBeNull();
    expect(normaliseImageSource("/images/a b.jpg")).toBeNull();
    expect(normaliseImageSource("relative/path.jpg")).toBeNull();
    expect(normaliseImageSource("")).toBeNull();
    expect(normaliseImageSource(null)).toBeNull();
    expect(normaliseImageSource(42)).toBeNull();
    expect(normaliseImageSource(`https://cdn.example.com/${"a".repeat(2100)}.jpg`)).toBeNull();
  });

  it("deduplicates and drops invalid entries in a list", () => {
    expect(
      sanitizeImageList(["/a.jpg", "javascript:alert(1)", "/a.jpg", "https://cdn.example.com/b.jpg", ""]),
    ).toEqual(["/a.jpg", "https://cdn.example.com/b.jpg"]);
    expect(sanitizeImageList("not-an-array")).toEqual([]);
  });

  it("treats empty optional fields as valid but bad values as invalid", () => {
    expect(isOptionalImageSource("")).toBe(true);
    expect(isOptionalImageSource(null)).toBe(true);
    expect(isOptionalImageSource("/a.jpg")).toBe(true);
    expect(isOptionalImageSource("javascript:alert(1)")).toBe(false);
  });
});
