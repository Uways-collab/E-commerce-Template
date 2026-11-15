import { describe, expect, it } from "vitest";
import { jsonLdString } from "@/lib/seo";

describe("jsonLdString", () => {
  it("keeps normal data intact and parseable", () => {
    const value = { "@type": "Product", name: "Silk shirt", price: 125000, inStock: true };
    expect(JSON.parse(jsonLdString(value))).toEqual(value);
  });

  it("neutralises a script-closing payload", () => {
    const output = jsonLdString({ name: "</script><script>alert(1)</script>" });
    expect(output).not.toContain("</script>");
    expect(output).not.toContain("<script>");
    expect(JSON.parse(output).name).toBe("</script><script>alert(1)</script>");
  });

  it("escapes ampersands, angle brackets and line separators", () => {
    const output = jsonLdString({ text: "a & b < c > d \u2028 e \u2029 f" });
    expect(output).not.toMatch(/[<>&]/);
    expect(output).toContain("\\u0026");
    expect(output).toContain("\\u2028");
    expect(JSON.parse(output).text).toBe("a & b < c > d \u2028 e \u2029 f");
  });
});
