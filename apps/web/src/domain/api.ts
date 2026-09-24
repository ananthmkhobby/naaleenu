import type { Dish, FeedbackRating, Household, MealEvent, MealType, OccasionPreference, Recommendation } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "content-type": "application/json", "x-correlation-id": crypto.randomUUID() },
    ...options
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json() as Promise<T>;
}

export async function createHousehold(input: Omit<Household, "id">): Promise<Household> {
  return request<Household>("/v1/households", { method: "POST", body: JSON.stringify(input) });
}

export async function recommendation(payload: {
  meal_type: MealType;
  household: Household;
  pantry_items: string[];
  custom_dishes: Dish[];
  session_exclusions: string[];
  session_category_exclusions: string[];
  cooked_history: Array<MealEvent | { dish_id: string; rating: FeedbackRating } | { dish_id: string; cooked_at: string }>;
  quicker_than_minutes?: number;
  max_cook_minutes?: number;
  occasion_preference?: OccasionPreference;
}): Promise<Recommendation> {
  return request<Recommendation>("/v1/recommendations", { method: "POST", body: JSON.stringify(payload) });
}

export async function listDishes(mealType: MealType): Promise<Dish[]> {
  try {
    const response = await request<{ dishes: Dish[] }>(`/v1/dishes?meal_type=${mealType}`);
    return response.dishes;
  } catch {
    const response = await fetch(`/catalog/${mealType}.json`);
    if (!response.ok) throw new Error("Catalog unavailable");
    return response.json() as Promise<Dish[]>;
  }
}

export async function recordMeal(input: { household_id: string; dish_id: string; source_recommendation_id?: string }) {
  return request<MealEvent>("/v1/meals", {
    method: "POST",
    body: JSON.stringify({ ...input, idempotency_key: crypto.randomUUID() })
  });
}

export async function recordFeedback(mealId: string, rating: FeedbackRating) {
  return request(`/v1/meals/${mealId}/feedback`, {
    method: "POST",
    body: JSON.stringify({ meal_id: mealId, rating, idempotency_key: crypto.randomUUID() })
  });
}
