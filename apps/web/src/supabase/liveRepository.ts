import type { CustomDish, Dish, FeedbackRating, Household, MealEvent } from "../domain/types";
import { isSupabaseConfigured, supabase } from "./client";

export async function currentUserId() {
  if (!supabase) return undefined;
  const { data } = await supabase.auth.getUser();
  return data.user?.id;
}

export async function signInWithEmail(email: string) {
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin
    }
  });
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function trackEvent(eventName: string, properties: Record<string, unknown> = {}, householdId?: string) {
  if (!supabase || !isSupabaseConfigured) return;
  const userId = await currentUserId();
  await supabase.from("analytics_events").insert({
    user_id: userId,
    household_id: householdId?.startsWith("hh-") ? null : householdId,
    event_name: eventName,
    properties
  });
}

export async function upsertHousehold(household: Household, reminderTime = "20:30") {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("households").upsert({
    id: household.id.startsWith("local-") || household.id.startsWith("hh-") ? undefined : household.id,
    user_id: userId,
    household_size: household.household_size,
    diet_type: household.diet_type,
    preferred_styles: household.preferred_styles,
    avoid_ingredients: household.avoid_ingredients,
    time_band: household.time_band,
    reminder_time: reminderTime
  });
}

export async function fetchHousehold(): Promise<(Household & { reminder_time?: string }) | undefined> {
  if (!supabase) return undefined;
  const userId = await currentUserId();
  if (!userId) return undefined;
  const { data } = await supabase
    .from("households")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!data) return undefined;
  return {
    id: data.id,
    household_size: data.household_size,
    diet_type: data.diet_type,
    preferred_styles: data.preferred_styles ?? [],
    avoid_ingredients: data.avoid_ingredients ?? [],
    time_band: data.time_band,
    reminder_time: data.reminder_time
  } as Household & { reminder_time?: string };
}

export async function uploadDishPhoto(localDishId: string, file: File) {
  if (!supabase) return undefined;
  const userId = await currentUserId();
  if (!userId) return undefined;
  const extension = file.name.split(".").pop() || "jpg";
  const path = `${userId}/${localDishId}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("dish-photos").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("dish-photos").getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function upsertCustomDish(dish: CustomDish, household?: Household) {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("custom_dishes").upsert({
    user_id: userId,
    household_id: household?.id?.startsWith("local-") || household?.id?.startsWith("hh-") ? null : household?.id,
    local_id: dish.id,
    meal_type: dish.meal_type,
    name: dish.name,
    category: dish.category,
    diet_type: dish.diet_type,
    active_time_minutes: dish.active_time_minutes,
    total_time_minutes: dish.total_time_minutes,
    morning_effort_minutes: dish.morning_effort_minutes,
    ingredients_required: dish.ingredients_required,
    ingredients_optional: dish.ingredients_optional,
    side_suggestions: dish.side_suggestions,
    steps: dish.steps,
    tags: dish.tags,
    photo_url: dish.photo_data_url?.startsWith("http") ? dish.photo_data_url : null
  }, { onConflict: "user_id,local_id" });
}

export async function fetchCustomDishes(): Promise<CustomDish[]> {
  if (!supabase) return [];
  const userId = await currentUserId();
  if (!userId) return [];
  const { data } = await supabase
    .from("custom_dishes")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  return (data ?? []).map((row) => ({
    id: row.local_id ?? `custom-${row.id}`,
    meal_type: row.meal_type,
    slug: row.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name: row.name,
    region: ["family"],
    diet_type: row.diet_type,
    category: row.category,
    active_time_minutes: row.active_time_minutes,
    total_time_minutes: row.total_time_minutes,
    morning_effort_minutes: row.morning_effort_minutes,
    requires_previous_night_prep: false,
    ingredients_required: row.ingredients_required ?? [],
    ingredients_optional: row.ingredients_optional ?? [],
    side_suggestions: row.side_suggestions ?? [],
    repeat_gap_days: 3,
    steps: row.steps ?? [],
    image_key: `${row.meal_type}/custom`,
    photo_data_url: row.photo_url ?? undefined,
    tags: row.tags ?? ["family"],
    is_custom: true,
    created_at: row.created_at
  })) as CustomDish[];
}

export async function saveMealEvent(meal: MealEvent, dish?: Dish) {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("meal_events").insert({
    user_id: userId,
    household_id: meal.household_id.startsWith("local-") || meal.household_id.startsWith("hh-") ? null : meal.household_id,
    dish_id: meal.dish_id,
    dish_name: meal.dish_name,
    meal_type: dish?.meal_type,
    source_recommendation_id: meal.source_recommendation_id,
    cooked_at: meal.cooked_at
  });
}

export async function saveFeedback(meal: MealEvent, rating: FeedbackRating) {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  await supabase.from("feedback_events").insert({
    user_id: userId,
    dish_id: meal.dish_id,
    rating
  });
}

export async function saveTomorrowPlan(input: {
  household?: Household;
  planDate: string;
  breakfast?: Dish;
  lunch?: Dish;
  dinner?: Dish;
  prepTask: string;
  groceryGap: string[];
  status?: "draft" | "confirmed" | "worked" | "did_not_work";
}) {
  if (!supabase) return;
  const userId = await currentUserId();
  if (!userId) return;
  const { data } = await supabase.from("tomorrow_plans").upsert({
    user_id: userId,
    household_id: input.household?.id?.startsWith("local-") || input.household?.id?.startsWith("hh-") ? null : input.household?.id,
    plan_date: input.planDate,
    breakfast_dish: input.breakfast,
    lunch_dish: input.lunch,
    dinner_dish: input.dinner,
    prep_task: input.prepTask,
    grocery_gap: input.groceryGap,
    status: input.status ?? "draft"
  }, { onConflict: "user_id,plan_date" }).select("id").single();
  if (data?.id) {
    await Promise.all([
      supabase.from("prep_tasks").delete().eq("user_id", userId).eq("plan_id", data.id),
      supabase.from("grocery_items").delete().eq("user_id", userId).eq("plan_id", data.id)
    ]);
    await supabase.from("prep_tasks").insert({ user_id: userId, plan_id: data.id, title: input.prepTask });
    if (input.groceryGap.length) {
      await supabase.from("grocery_items").insert(input.groceryGap.map((item) => ({ user_id: userId, plan_id: data.id, item })));
    }
  }
}
