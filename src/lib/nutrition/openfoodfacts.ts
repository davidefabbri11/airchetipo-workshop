export interface OFFProduct {
  id: string;
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

const OFF_BASE_URL = "https://world.openfoodfacts.org/cgi/search.pl";
const TIMEOUT_MS = 3000;

export async function searchProduct(name: string): Promise<OFFProduct | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const params = new URLSearchParams({
      search_terms: name,
      json: "1",
      page_size: "1",
      fields: "id,product_name,nutriments",
    });

    const response = await fetch(`${OFF_BASE_URL}?${params}`, {
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      products?: Array<{
        id?: string;
        product_name?: string;
        nutriments?: Record<string, number>;
      }>;
    };

    const product = data.products?.[0];
    if (!product || !product.nutriments) return null;

    const n = product.nutriments;

    return {
      id: product.id ?? "",
      name: product.product_name ?? name,
      calories: n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0,
      proteins: n["proteins_100g"] ?? n["proteins"] ?? 0,
      carbs: n["carbohydrates_100g"] ?? n["carbohydrates"] ?? 0,
      fats: n["fat_100g"] ?? n["fat"] ?? 0,
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return null;
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}
