import { describe, expect, it } from "vitest";
import { fetchAllProducts } from "./vizlync";

describe("Vizlync API", () => {
  it("should have API credentials configured", () => {
    expect(process.env.VIZLYNC_API_KEY).toBeTruthy();
    expect(process.env.VIZLYNC_PARTNER_ID).toBeTruthy();
  });

  it("should fetch products from Vizlync API", async () => {
    const result = await fetchAllProducts();
    expect(result).toBeDefined();
    expect(result.products).toBeInstanceOf(Array);
    expect(result.products.length).toBeGreaterThan(0);
    // Check first product has required fields
    const firstProduct = result.products[0];
    expect(firstProduct.productId).toBeTruthy();
    expect(firstProduct.name).toBeTruthy();
    expect(firstProduct.price).toBeGreaterThanOrEqual(0);
  }, 120000); // align with the 120s axios timeout in fetchAllProducts (large payload)
});
