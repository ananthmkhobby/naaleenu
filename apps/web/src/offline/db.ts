import Dexie, { type Table } from "dexie";
import type { CustomDish, Household, MealEvent, MealType, Recommendation } from "../domain/types";

export interface LocalState {
  key: string;
  household?: Household;
  meal_type: MealType;
  pantry_items: string[];
  favorite_dish_ids: string[];
  reminder_time: string;
  latest_recommendation?: Recommendation;
  session_exclusions: string[];
  session_category_exclusions: string[];
}

export interface OutboxItem {
  id: string;
  kind: "meal" | "feedback";
  payload: unknown;
  created_at: string;
}

class BreakfastDb extends Dexie {
  state!: Table<LocalState, string>;
  meals!: Table<MealEvent, string>;
  customDishes!: Table<CustomDish, string>;
  outbox!: Table<OutboxItem, string>;

  constructor() {
    super("breakfast-assistant");
    this.version(1).stores({
      state: "key",
      meals: "id, cooked_at, dish_id",
      outbox: "id, kind, created_at"
    });
    this.version(2).stores({
      state: "key",
      meals: "id, cooked_at, dish_id",
      customDishes: "id, name, category, created_at",
      outbox: "id, kind, created_at"
    });
  }
}

export const db = new BreakfastDb();

export async function getLocalState(): Promise<LocalState> {
  const state = await db.state.get("active");
  if (state) return { ...state, meal_type: state.meal_type ?? "breakfast", favorite_dish_ids: state.favorite_dish_ids ?? [], reminder_time: state.reminder_time ?? "20:30", session_exclusions: state.session_exclusions ?? [], session_category_exclusions: state.session_category_exclusions ?? [] };
  const fresh: LocalState = { key: "active", meal_type: "breakfast", pantry_items: [], favorite_dish_ids: [], reminder_time: "20:30", session_exclusions: [], session_category_exclusions: [] };
  await db.state.put(fresh);
  return fresh;
}

export async function saveLocalState(update: Partial<LocalState>) {
  const current = await getLocalState();
  await db.state.put({ ...current, ...update, key: "active" });
}
