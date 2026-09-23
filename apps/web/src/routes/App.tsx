import { ArrowLeft, BookOpen, CalendarCheck, Camera, Check, Clock, Heart, History, Pencil, Plus, RefreshCw, Search, Sparkles, Star, ThumbsUp, Wand2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createHousehold, listDishes, recommendation, recordFeedback, recordMeal } from "../domain/api";
import type { CustomDish, DietType, Dish, FeedbackRating, Household, MealEvent, MealType, Recommendation, TimeBand } from "../domain/types";
import { ChoiceButton } from "../components/ChoiceButton";
import { db, getLocalState, saveLocalState } from "../offline/db";
import { isSupabaseConfigured, supabase } from "../supabase/client";
import { fetchCustomDishes, fetchHousehold, saveFeedback, saveMealEvent, saveTomorrowPlan, signInWithEmail, signOut, trackEvent, uploadDishPhoto, upsertCustomDish, upsertHousehold } from "../supabase/liveRepository";

const pantryChoices = ["rice", "urad dal", "rava", "poha", "bread", "egg", "oats", "banana", "paneer", "mixed vegetables"];
const styleChoices = ["idli", "dosa", "poha", "upma", "rice", "rotti", "oats"];
const leftoverChoices = ["cooked rice", "chapati", "dal", "sambar", "dosa batter", "boiled potato", "curd", "vegetable palya"];
const cuisinePriority: Record<string, number> = { "south-indian": 12, "north-indian": 5, "pan-indian": 3, western: 0 };
const cookTimeFilters = [
  { label: "Any", value: undefined },
  { label: "10 min", value: 10 },
  { label: "20 min", value: 20 },
  { label: "30 min", value: 30 }
] as const;
const categoryFamilies: Record<string, string[]> = {
  idli: ["idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"],
  dosa: ["idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"],
  uttapam: ["idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"],
  appam: ["idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"],
  idiyappam: ["idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"],
  paniyaram: ["idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"],
  rice: ["rice", "khichdi", "pulao"],
  khichdi: ["rice", "khichdi", "pulao"],
  pulao: ["rice", "khichdi", "pulao"],
  upma: ["upma", "poha", "usli"],
  poha: ["upma", "poha", "usli"],
  usli: ["upma", "poha", "usli"],
  rotti: ["rotti", "chapati", "paratha"],
  chapati: ["rotti", "chapati", "paratha"],
  paratha: ["rotti", "chapati", "paratha"]
};

function dishVisual(dish: Pick<Dish, "name" | "category" | "meal_type">) {
  const palette: Record<string, { plate: string; accent: string; side: string }> = {
    dosa: { plate: "#d8a24a", accent: "#fff1c2", side: "#2f6f47" },
    idli: { plate: "#fff8e8", accent: "#ece0c8", side: "#2f6f47" },
    poha: { plate: "#f3c85f", accent: "#fff2b8", side: "#8f4e20" },
    upma: { plate: "#ead2a0", accent: "#fff5d8", side: "#2f6f47" },
    rice: { plate: "#fff1b8", accent: "#f2d35f", side: "#7d2f2a" },
    rotti: { plate: "#c98f45", accent: "#f3d39b", side: "#2f6f47" },
    paratha: { plate: "#c98f45", accent: "#f3d39b", side: "#7d2f2a" },
    sandwich: { plate: "#e6b75e", accent: "#fff7df", side: "#2f6f47" },
    pongal: { plate: "#f2deb2", accent: "#fff8df", side: "#8f4e20" },
    usli: { plate: "#f0c56b", accent: "#fff4ce", side: "#2f6f47" },
    family: { plate: "#f0c56b", accent: "#fff4ce", side: "#2f6f47" }
  };
  const colors = palette[dish.category] ?? { plate: "#e9bd6d", accent: "#fff3d1", side: "#2f6f47" };
  const safeName = dish.name.replace(/[<&>"]/g, "");
  const label = dish.meal_type === "lunch" ? "Lunchbox" : "Breakfast";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#fff8ec"/>
          <stop offset="1" stop-color="#e8d4ae"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#17221a" flood-opacity="0.22"/>
        </filter>
      </defs>
      <rect width="1200" height="900" fill="url(#bg)"/>
      <rect x="0" y="0" width="1200" height="900" fill="#214f3a" opacity="0.08"/>
      <circle cx="920" cy="180" r="150" fill="#b88a3b" opacity="0.16"/>
      <circle cx="220" cy="720" r="190" fill="#214f3a" opacity="0.10"/>
      <ellipse cx="600" cy="500" rx="330" ry="245" fill="#fffdf8" filter="url(#shadow)"/>
      <ellipse cx="600" cy="500" rx="260" ry="184" fill="${colors.plate}"/>
      <ellipse cx="600" cy="500" rx="190" ry="128" fill="${colors.accent}" opacity="0.72"/>
      <circle cx="820" cy="585" r="70" fill="${colors.side}"/>
      <circle cx="816" cy="578" r="48" fill="#f7f1df" opacity="0.9"/>
      <path d="M335 355c120-82 326-94 468-12" fill="none" stroke="#fff8df" stroke-width="24" stroke-linecap="round" opacity="0.65"/>
      <path d="M392 650c92 44 302 51 424-9" fill="none" stroke="#8f4e20" stroke-width="14" stroke-linecap="round" opacity="0.22"/>
      <text x="600" y="760" text-anchor="middle" font-family="Georgia, serif" font-size="62" fill="#17221a" font-weight="700">${safeName}</text>
      <text x="600" y="818" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" fill="#214f3a" font-weight="700" letter-spacing="4">${label.toUpperCase()}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function visualForDish(dish: Dish) {
  return dish.photo_data_url || dishVisual(dish);
}

function interleaveByCategory(dishes: Dish[], favoriteDishIds: string[]) {
  const groups = new Map<string, Dish[]>();
  for (const dish of dishes) {
    const key = dish.category;
    groups.set(key, [...(groups.get(key) ?? []), dish]);
  }
  const buckets = [...groups.values()].sort((first, second) => second.length - first.length);
  const ordered: Dish[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const bucket of buckets) {
      const next = bucket.shift();
      if (next) {
        ordered.push(next);
        added = true;
      }
    }
  }
  return ordered.sort((first, second) => {
    const fav = Number(favoriteDishIds.includes(second.id)) - Number(favoriteDishIds.includes(first.id));
    if (fav !== 0) return fav;
    return cuisineScore(second) - cuisineScore(first);
  });
}

function cuisineScore(dish: Dish) {
  return Math.max(...dish.tags.map((tag) => cuisinePriority[tag.toLowerCase()] ?? 0), 0);
}

function familyFor(category: string) {
  return categoryFamilies[category] ?? [category];
}

function pickFromTopBand<T>(ranked: T[], score: (item: T) => number) {
  if (!ranked.length) return undefined;
  const sorted = [...ranked].sort((first, second) => score(second) - score(first));
  const best = score(sorted[0]);
  const topBand = sorted.filter((item) => score(item) >= best - 3).slice(0, 8);
  return topBand[Math.floor(Math.random() * topBand.length)];
}

function sidesFor(dish: Dish) {
  if (dish.side_suggestions?.length) return dish.side_suggestions;
  if (dish.meal_type === "lunch") {
    if (["rice", "pulao", "khichdi", "lunchbox"].includes(dish.category)) return ["curd", "cucumber slices", "papad"];
    if (["chapati", "roll", "paratha", "rotti"].includes(dish.category)) return ["curd", "pickle", "fruit"];
    return ["curd", "fruit"];
  }
  if (["idli", "dosa", "uttapam", "appam", "idiyappam"].includes(dish.category)) return ["coconut chutney", "sambar", "podi with ghee"];
  if (["poha", "upma", "pongal", "usli"].includes(dish.category)) return ["coconut chutney", "curd", "banana"];
  if (["rice"].includes(dish.category)) return ["curd", "pickle", "papad"];
  if (["rotti", "paratha", "bread"].includes(dish.category)) return ["curd", "pickle", "vegetable palya"];
  return ["coconut chutney", "curd"];
}

function dietAllowed(dish: Dish, household?: Household) {
  if (!household) return true;
  if (household.diet_type === "veg") return dish.diet_type === "veg";
  if (household.diet_type === "egg") return dish.diet_type !== "non_veg";
  return true;
}

function avoidsAllowed(dish: Dish, household?: Household) {
  const avoid = new Set((household?.avoid_ingredients ?? []).map((item) => item.toLowerCase().trim()));
  return !dish.ingredients_required.some((ingredient) => avoid.has(ingredient.toLowerCase()));
}

function chooseDish(dishes: Dish[], household: Household | undefined, pantry: string[], favoriteDishIds: string[], avoidCategory?: string) {
  const pantrySet = new Set(pantry.map((item) => item.toLowerCase()));
  const eligible = dishes.filter((dish) => dietAllowed(dish, household) && avoidsAllowed(dish, household) && dish.category !== avoidCategory);
  const pool = eligible.length > 0 ? eligible : dishes.filter((dish) => dietAllowed(dish, household) && avoidsAllowed(dish, household));
  return [...pool].sort((first, second) => {
    const fav = Number(favoriteDishIds.includes(second.id)) - Number(favoriteDishIds.includes(first.id));
    if (fav !== 0) return fav;
    const pantryScore = (dish: Dish) => dish.ingredients_required.filter((ingredient) => pantrySet.has(ingredient.toLowerCase())).length;
    const pantryDiff = pantryScore(second) - pantryScore(first);
    if (pantryDiff !== 0) return pantryDiff;
    const cuisineDiff = cuisineScore(second) - cuisineScore(first);
    if (cuisineDiff !== 0) return cuisineDiff;
    return first.morning_effort_minutes - second.morning_effort_minutes;
  })[0];
}

function prepForPlan(breakfast?: Dish, lunch?: Dish) {
  const names = `${breakfast?.name ?? ""} ${lunch?.name ?? ""}`.toLowerCase();
  if (names.includes("dosa") || names.includes("idli") || names.includes("appam")) return "Check batter tonight or keep the batter box in front.";
  if (names.includes("rice") || names.includes("pulao") || names.includes("bath")) return "Cook a little extra rice tonight and cool it before storing.";
  if (names.includes("chapati") || names.includes("paratha") || names.includes("roll")) return "Knead dough tonight and keep one dry sabzi ready.";
  if (names.includes("potato")) return "Boil potatoes tonight so morning packing is quick.";
  return "Keep one onion, curry leaves and a small chutney or curd side ready.";
}

function groceryGap(dishes: Array<Dish | undefined>, pantry: string[]) {
  const staples = new Set(["oil", "salt", "water", "rice", "cooked rice", "wheat flour"]);
  const pantrySet = new Set(pantry.map((item) => item.toLowerCase()));
  const gaps = dishes
    .flatMap((dish) => dish?.ingredients_required ?? [])
    .filter((ingredient) => !staples.has(ingredient.toLowerCase()) && !pantrySet.has(ingredient.toLowerCase()));
  return [...new Set(gaps)].slice(0, 4);
}

async function clientRecommendation(payload: {
  meal_type: MealType;
  household: Household;
  pantry_items: string[];
  custom_dishes: Dish[];
  session_exclusions: string[];
  session_category_exclusions: string[];
  cooked_history: Array<MealEvent | { dish_id: string; rating: FeedbackRating }>;
  quicker_than_minutes?: number;
  max_cook_minutes?: number;
}): Promise<Recommendation> {
  const catalog = await listDishes(payload.meal_type);
  const pantrySet = new Set(payload.pantry_items.map((item) => item.toLowerCase()));
  const loved = new Set(payload.cooked_history.filter((event) => event.rating === "loved").map((event) => event.dish_id));
  const blocked = new Set(payload.cooked_history.filter((event) => event.rating === "dont_suggest").map((event) => event.dish_id));
  const dishes = [...payload.custom_dishes, ...catalog]
    .filter((dish) => !blocked.has(dish.id))
    .filter((dish) => !payload.session_exclusions.includes(dish.id))
    .filter((dish) => !payload.session_category_exclusions.includes(dish.category))
    .filter((dish) => dietAllowed(dish, payload.household) && avoidsAllowed(dish, payload.household))
    .filter((dish) => !payload.quicker_than_minutes || dish.morning_effort_minutes < payload.quicker_than_minutes)
    .filter((dish) => !payload.max_cook_minutes || dish.morning_effort_minutes <= payload.max_cook_minutes);
  const pool = dishes.length ? dishes : [...payload.custom_dishes, ...catalog].filter((dish) => dietAllowed(dish, payload.household) && avoidsAllowed(dish, payload.household));
  const preferred = new Set(payload.household.preferred_styles.map((style) => style.toLowerCase()));
  const score = (item: Dish) => {
    const pantryScore = item.ingredients_required.filter((ingredient) => pantrySet.has(ingredient.toLowerCase())).length * 4;
    const favoriteScore = loved.has(item.id) ? 8 : 0;
    const styleScore = preferred.has(item.category.toLowerCase()) ? 5 : 0;
    return pantryScore + favoriteScore + styleScore + cuisineScore(item) - item.morning_effort_minutes / 10;
  };
  const dish = pickFromTopBand(pool, score);
  if (!dish) throw new Error("No dish available");
  return {
    recommendation_id: `local-rec-${crypto.randomUUID()}`,
    session_id: `local-session-${crypto.randomUUID()}`,
    dish,
    score: 80,
    reason_codes: ["local_fit"],
    reason: "This fits your saved preferences and works without the API."
  };
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [screen, setScreen] = useState<"loading" | "setup" | "pantry" | "home" | "cook" | "feedback" | "history" | "catalog" | "tomorrow" | "leftovers">("loading");
  const [household, setHousehold] = useState<Household | undefined>();
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [pantry, setPantry] = useState<string[]>([]);
  const [rec, setRec] = useState<Recommendation | undefined>();
  const [sessionExclusions, setSessionExclusions] = useState<string[]>([]);
  const [sessionCategoryExclusions, setSessionCategoryExclusions] = useState<string[]>([]);
  const [meals, setMeals] = useState<MealEvent[]>([]);
  const [customDishes, setCustomDishes] = useState<CustomDish[]>([]);
  const [favoriteDishIds, setFavoriteDishIds] = useState<string[]>([]);
  const [reminderTime, setReminderTime] = useState("20:30");
  const [maxCookMinutes, setMaxCookMinutes] = useState<number | undefined>();
  const [syncEmail, setSyncEmail] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | undefined>();
  const [lastMeal, setLastMeal] = useState<MealEvent | undefined>();
  const [offlineNote, setOfflineNote] = useState("");

  useEffect(() => {
    void (async () => {
      const state = await getLocalState();
      const localMeals = await db.meals.orderBy("cooked_at").reverse().toArray();
      const localCustomDishes = await db.customDishes.orderBy("created_at").reverse().toArray();
      const latestRecommendation = state.latest_recommendation?.dish.meal_type === state.meal_type ? state.latest_recommendation : undefined;
      setHousehold(state.household);
      setMealType(state.meal_type);
      setPantry(state.pantry_items);
      setRec(latestRecommendation);
      setSessionExclusions(state.session_exclusions);
      setSessionCategoryExclusions(state.session_category_exclusions);
      setFavoriteDishIds(state.favorite_dish_ids);
      setReminderTime(state.reminder_time);
      setMeals(localMeals);
      setCustomDishes(localCustomDishes);
      setScreen(state.household ? "home" : "setup");
    })();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => setSignedInEmail(data.user?.email));
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        setSignedInEmail(session?.user.email);
      });
      return () => authListener.subscription.unsubscribe();
    }
  }, []);

  useEffect(() => {
    if (!signedInEmail) return;
    void (async () => {
      const [remoteHousehold, remoteDishes] = await Promise.all([fetchHousehold(), fetchCustomDishes()]);
      if (remoteHousehold) {
        setHousehold(remoteHousehold);
        setReminderTime(remoteHousehold.reminder_time ?? "20:30");
        await saveLocalState({ household: remoteHousehold, reminder_time: remoteHousehold.reminder_time ?? "20:30" });
      } else if (household) {
        await upsertHousehold(household, reminderTime);
      }
      if (remoteDishes.length) {
        await db.customDishes.bulkPut(remoteDishes);
        setCustomDishes(await db.customDishes.orderBy("created_at").reverse().toArray());
      } else if (customDishes.length) {
        await Promise.all(customDishes.map((dish) => upsertCustomDish(dish, household)));
      }
      setSyncStatus("Family recipes synced on this device.");
    })();
  }, [signedInEmail]);

  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const [hour, minute] = reminderTime.split(":").map(Number);
    const now = new Date();
    const next = new Date();
    next.setHours(hour || 20, minute || 30, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    const timer = window.setTimeout(() => {
      new Notification("Naale enu?", { body: "Plan tomorrow in 60 seconds." });
    }, next.getTime() - now.getTime());
    return () => window.clearTimeout(timer);
  }, [reminderTime]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 1900);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (household && !rec) {
      void loadRecommendation();
    }
  }, [household, mealType, rec]);

  async function completeSetup(input: Omit<Household, "id">) {
    const fallback: Household = { id: `local-${crypto.randomUUID()}`, ...input };
    try {
      const created = await createHousehold(input);
      setHousehold(created);
      await saveLocalState({ household: created });
      await upsertHousehold(created, reminderTime);
    } catch {
      setHousehold(fallback);
      setOfflineNote("You can start now. Actions will stay on this device until the API is available.");
      await saveLocalState({ household: fallback });
    }
    setScreen("pantry");
  }

  async function loadRecommendation(quicker = false) {
    if (!household) return;
    const payload = {
      meal_type: mealType,
      household,
      pantry_items: pantry,
      custom_dishes: customDishes.filter((dish) => dish.meal_type === mealType),
      session_exclusions: sessionExclusions,
      session_category_exclusions: quicker ? sessionCategoryExclusions : [...sessionCategoryExclusions, ...(rec ? familyFor(rec.dish.category) : [])],
      cooked_history: [
        ...meals,
        ...favoriteDishIds.map((dishId) => ({ dish_id: dishId, rating: "loved" as const }))
      ],
      quicker_than_minutes: quicker && rec ? rec.dish.morning_effort_minutes : undefined,
      max_cook_minutes: quicker ? undefined : maxCookMinutes
    };
    await trackEvent("recommendation_requested", { meal_type: mealType, quicker }, household.id);
    try {
      const next = await recommendation(payload);
      const exclusions = [...sessionExclusions, next.dish.id].slice(-8);
      const categoryExclusions = [...new Set([...sessionCategoryExclusions, ...familyFor(next.dish.category)])].slice(-10);
      setRec(next);
      setSessionExclusions(exclusions);
      setSessionCategoryExclusions(categoryExclusions);
      setOfflineNote("");
      await saveLocalState({ latest_recommendation: next, session_exclusions: exclusions, session_category_exclusions: categoryExclusions, pantry_items: pantry });
      await trackEvent("recommendation_shown", { meal_type: mealType, dish_id: next.dish.id, category: next.dish.category }, household.id);
    } catch {
      try {
        const next = await clientRecommendation(payload);
        const exclusions = [...sessionExclusions, next.dish.id].slice(-8);
        const categoryExclusions = [...new Set([...sessionCategoryExclusions, ...familyFor(next.dish.category)])].slice(-10);
        setRec(next);
        setSessionExclusions(exclusions);
        setSessionCategoryExclusions(categoryExclusions);
        setOfflineNote("Using local recommendations. Sync will resume when services are available.");
        await saveLocalState({ latest_recommendation: next, session_exclusions: exclusions, session_category_exclusions: categoryExclusions, pantry_items: pantry });
      } catch {
        setOfflineNote("Showing the last useful recommendation. New actions will be kept locally.");
      }
    }
  }

  async function cookThis() {
    if (!household || !rec) return;
    const optimistic: MealEvent = {
      id: `local-meal-${crypto.randomUUID()}`,
      household_id: household.id,
      dish_id: rec.dish.id,
      dish_name: rec.dish.name,
      cooked_at: new Date().toISOString(),
      source_recommendation_id: rec.recommendation_id
    };
    try {
      const saved = await recordMeal({ household_id: household.id, dish_id: rec.dish.id, source_recommendation_id: rec.recommendation_id });
      const meal = { ...saved, dish_name: rec.dish.name };
      setLastMeal(meal);
      await db.meals.put(meal);
      await saveMealEvent(meal, rec.dish);
    } catch {
      setLastMeal(optimistic);
      await db.meals.put(optimistic);
      await db.outbox.put({ id: crypto.randomUUID(), kind: "meal", payload: optimistic, created_at: new Date().toISOString() });
      await saveMealEvent(optimistic, rec.dish);
    }
    setMeals(await db.meals.orderBy("cooked_at").reverse().toArray());
    setScreen("feedback");
  }

  async function feedback(rating: FeedbackRating) {
    if (!lastMeal) return;
    const updated = { ...lastMeal, rating };
    await db.meals.put(updated);
    try {
      await recordFeedback(lastMeal.id, rating);
      await saveFeedback(lastMeal, rating);
    } catch {
      await db.outbox.put({ id: crypto.randomUUID(), kind: "feedback", payload: { meal_id: lastMeal.id, rating }, created_at: new Date().toISOString() });
      await saveFeedback(lastMeal, rating);
    }
    setMeals(await db.meals.orderBy("cooked_at").reverse().toArray());
    setScreen("history");
  }

  async function saveCustomDish(input: { id?: string; name: string; minutes: number; ingredients: string[]; steps: string[]; sideSuggestions: string[]; photoDataUrl?: string; photoFile?: File; sourceDish?: Dish }) {
    const safeSteps = input.steps.length >= 3 ? input.steps : [
      `Prepare ${input.name} with the ingredients you usually use.`,
      "Pack it after it cools slightly so the texture stays comfortable.",
      "Add a small side if it is available."
    ];
    const source = input.sourceDish;
    const localId = input.id ?? `custom-${crypto.randomUUID()}`;
    let photoUrl = input.photoDataUrl ?? source?.photo_data_url;
    if (input.photoFile) {
      try {
        const uploaded = await uploadDishPhoto(localId, input.photoFile);
        photoUrl = uploaded?.url ?? photoUrl;
      } catch {
        photoUrl = input.photoDataUrl ?? photoUrl;
      }
    }
    const custom: CustomDish = {
      id: localId,
      meal_type: mealType,
      slug: input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      name: input.name,
      region: ["family"],
      diet_type: source?.diet_type ?? household?.diet_type ?? "veg",
      category: source?.category ?? "family",
      active_time_minutes: input.minutes,
      total_time_minutes: input.minutes,
      morning_effort_minutes: input.minutes,
      requires_previous_night_prep: source?.requires_previous_night_prep ?? false,
      ingredients_required: input.ingredients.length > 0 ? input.ingredients : ["family pantry items"],
      ingredients_optional: source?.ingredients_optional ?? [],
      side_suggestions: input.sideSuggestions,
      repeat_gap_days: source?.repeat_gap_days ?? 3,
      steps: safeSteps.slice(0, 5),
      image_key: `${mealType}/custom`,
      photo_data_url: photoUrl,
      tags: ["family", mealType === "lunch" ? "lunchbox" : "breakfast"],
      is_custom: true,
      created_at: new Date().toISOString()
    };
    await db.customDishes.put(custom);
    await upsertCustomDish(custom, household);
    await trackEvent("custom_dish_saved", { meal_type: custom.meal_type, category: custom.category }, household?.id);
    setCustomDishes(await db.customDishes.orderBy("created_at").reverse().toArray());
  }

  async function toggleFavorite(dishId: string) {
    const next = favoriteDishIds.includes(dishId)
      ? favoriteDishIds.filter((id) => id !== dishId)
      : [dishId, ...favoriteDishIds];
    setFavoriteDishIds(next);
    await saveLocalState({ favorite_dish_ids: next });
    await trackEvent(next.includes(dishId) ? "favorite_added" : "favorite_removed", { dish_id: dishId }, household?.id);
    if (rec && dishId === rec.dish.id) {
      await saveLocalState({ latest_recommendation: rec });
    }
  }

  async function switchMealType(nextMealType: MealType) {
    if (nextMealType === mealType) return;
    setMealType(nextMealType);
    setRec(undefined);
    setSessionExclusions([]);
    setSessionCategoryExclusions([]);
    await saveLocalState({ meal_type: nextMealType, latest_recommendation: undefined, session_exclusions: [], session_category_exclusions: [] });
  }

  async function sendSyncLink() {
    if (!syncEmail.trim()) return;
    try {
      const { error } = await signInWithEmail(syncEmail.trim());
      if (error) throw error;
      setSyncStatus("Check your email for the sign-in link.");
      await trackEvent("sync_link_requested");
    } catch {
      setSyncStatus("Sync is not configured yet. Add Supabase env vars on Vercel.");
    }
  }

  async function signOutLive() {
    await signOut();
    setSignedInEmail(undefined);
    setSyncStatus("Signed out on this device.");
  }

  async function updateReminder(nextTime: string) {
    setReminderTime(nextTime);
    await saveLocalState({ reminder_time: nextTime });
    if (household) await upsertHousehold(household, nextTime);
  }

  if (showSplash) return <SplashScreen onSkip={() => setShowSplash(false)} />;
  if (screen === "loading") return <main className="app-shell"><p>Preparing breakfast...</p></main>;
  if (screen === "setup") return <Setup onDone={completeSetup} note={offlineNote} />;
  if (screen === "pantry") return <Pantry selected={pantry} setSelected={setPantry} onDone={async () => { await saveLocalState({ pantry_items: pantry }); setScreen("home"); }} />;
  if (screen === "cook" && rec) return <Cook recommendation={rec} onBack={() => setScreen("home")} onCooked={cookThis} />;
  if (screen === "feedback" && lastMeal) return <Feedback meal={lastMeal} onRate={feedback} />;
  if (screen === "history") return <HistoryScreen meals={meals} onBack={() => setScreen("home")} />;
  if (screen === "catalog") return <CatalogScreen mealType={mealType} customDishes={customDishes} favoriteDishIds={favoriteDishIds} onToggleFavorite={toggleFavorite} onSave={saveCustomDish} onBack={() => setScreen("home")} />;
  if (screen === "tomorrow") return <TomorrowPlan household={household} pantry={pantry} customDishes={customDishes} favoriteDishIds={favoriteDishIds} reminderTime={reminderTime} onReminderChange={updateReminder} onBack={() => setScreen("home")} />;
  if (screen === "leftovers") return <LeftoverMagic household={household} customDishes={customDishes} favoriteDishIds={favoriteDishIds} onBack={() => setScreen("home")} />;
  return <Home mealType={mealType} onMealTypeChange={switchMealType} maxCookMinutes={maxCookMinutes} onMaxCookMinutesChange={async (minutes) => { setMaxCookMinutes(minutes); setRec(undefined); setSessionExclusions([]); setSessionCategoryExclusions([]); await saveLocalState({ latest_recommendation: undefined, session_exclusions: [], session_category_exclusions: [] }); }} recommendation={rec} isFavorite={rec ? favoriteDishIds.includes(rec.dish.id) : false} note={offlineNote} onAnother={() => loadRecommendation(false)} onQuicker={() => loadRecommendation(true)} onCook={() => setScreen("cook")} onHistory={() => setScreen("history")} onCatalog={() => setScreen("catalog")} onTomorrow={() => setScreen("tomorrow")} onLeftovers={() => setScreen("leftovers")} onToggleFavorite={() => rec && toggleFavorite(rec.dish.id)} />;
}

function SplashScreen({ onSkip }: { onSkip: () => void }) {
  const dishes = [
    { name: "Idli", tone: "coconut" },
    { name: "Dosa", tone: "gold" },
    { name: "Pongal", tone: "cream" },
    { name: "Upma", tone: "rava" },
    { name: "Akki rotti", tone: "toast" },
    { name: "Chitranna", tone: "lemon" }
  ];
  return (
    <main className="splash-screen" onClick={onSkip}>
      <div className="splash-dish-stage" aria-hidden="true">
        <div className="question-orbit">
          <span>?</span>
        </div>
        {dishes.map((dish, index) => (
          <span key={dish.name} className={`dish-token ${dish.tone}`} style={{ "--dish": index } as React.CSSProperties}>
            <i />
            <b>{dish.name}</b>
          </span>
        ))}
      </div>
      <div className="splash-copy">
        <p>ನಾಳೆ ಏನು?</p>
        <h1>Naale enu?</h1>
        <span>What shall we make?</span>
      </div>
    </main>
  );
}

function Setup({ onDone, note }: { onDone: (input: Omit<Household, "id">) => void; note: string }) {
  const [size, setSize] = useState(4);
  const [diet, setDiet] = useState<DietType>("veg");
  const [time, setTime] = useState<TimeBand>("under_20");
  const [styles, setStyles] = useState<string[]>(["dosa", "upma", "rice", "rotti"]);
  const [avoid, setAvoid] = useState("");
  return (
    <main className="app-shell setup">
      <p className="eyebrow">Breakfast decision assistant</p>
      <h1>Tomorrow morning should feel lighter.</h1>
      <label>Household size<input type="number" min={1} max={12} value={size} onChange={(e) => setSize(Number(e.target.value))} /></label>
      <div className="segmented" aria-label="Diet preference">
        {(["veg", "egg", "non_veg"] as DietType[]).map((item) => <button key={item} className={diet === item ? "active" : ""} onClick={() => setDiet(item)}>{item.replace("_", " ")}</button>)}
      </div>
      <div className="style-grid">
        {styleChoices.map((style) => <button key={style} className={styles.includes(style) ? "active" : ""} onClick={() => setStyles((current) => current.includes(style) ? current.filter((x) => x !== style) : [...current, style])}>{style}</button>)}
      </div>
      <label>Usual morning time<select value={time} onChange={(e) => setTime(e.target.value as TimeBand)}><option value="under_10">Under 10 min</option><option value="under_20">Under 20 min</option><option value="under_30">Under 30 min</option><option value="relaxed">Relaxed</option></select></label>
      <label>Avoid ingredients<input value={avoid} onChange={(e) => setAvoid(e.target.value)} placeholder="egg, rava, paneer" /></label>
      {note && <p className="note">{note}</p>}
      <ChoiceButton icon={<Sparkles size={18} />} onClick={() => onDone({ household_size: size, diet_type: diet, preferred_styles: styles, avoid_ingredients: avoid.split(",").map((x) => x.trim()).filter(Boolean), time_band: time })}>Start gently</ChoiceButton>
    </main>
  );
}

function Pantry({ selected, setSelected, onDone }: { selected: string[]; setSelected: (items: string[]) => void; onDone: () => void }) {
  return (
    <main className="app-shell setup">
      <p className="eyebrow">Optional pantry</p>
      <h1>What is already easy today?</h1>
      <div className="style-grid pantry-grid">
        {pantryChoices.map((item) => <button key={item} className={selected.includes(item) ? "active" : ""} onClick={() => setSelected(selected.includes(item) ? selected.filter((x) => x !== item) : [...selected, item])}>{item}</button>)}
      </div>
      <ChoiceButton icon={<Check size={18} />} onClick={onDone}>Done</ChoiceButton>
      <ChoiceButton variant="ghost" onClick={onDone}>Skip</ChoiceButton>
    </main>
  );
}

function Home({ mealType, onMealTypeChange, maxCookMinutes, onMaxCookMinutesChange, recommendation, isFavorite, note, onAnother, onQuicker, onCook, onHistory, onCatalog, onTomorrow, onLeftovers, onToggleFavorite }: { mealType: MealType; onMealTypeChange: (mealType: MealType) => void; maxCookMinutes?: number; onMaxCookMinutesChange: (minutes?: number) => void; recommendation?: Recommendation; isFavorite: boolean; note: string; onAnother: () => void; onQuicker: () => void; onCook: () => void; onHistory: () => void; onCatalog: () => void; onTomorrow: () => void; onLeftovers: () => void; onToggleFavorite: () => void }) {
  if (!recommendation) return <main className="app-shell"><MealTypeSwitch value={mealType} onChange={onMealTypeChange} /><CookTimeFilter value={maxCookMinutes} onChange={onMaxCookMinutesChange} /><p>Finding one good {mealType === "lunch" ? "lunchbox" : "breakfast"}...</p></main>;
  return (
    <main className="decision-screen">
      <div className="top-actions">
        <button className="round-button" aria-label={mealType === "lunch" ? "Lunchbox book" : "Breakfast book"} onClick={onCatalog}><BookOpen size={20} /></button>
        <button className="round-button" aria-label="Breakfast memory" onClick={onHistory}><History size={20} /></button>
      </div>
      <img className="hero-image" src={visualForDish(recommendation.dish)} alt={`${recommendation.dish.name} ${mealType === "lunch" ? "lunchbox" : "breakfast"} inspiration`} />
      <section className="decision-copy">
        <MealTypeSwitch value={mealType} onChange={onMealTypeChange} />
        <CookTimeFilter value={maxCookMinutes} onChange={onMaxCookMinutesChange} />
        <p className="eyebrow"><Clock size={15} /> {recommendation.dish.morning_effort_minutes} min</p>
        <h1>{recommendation.dish.name}</h1>
        <p>{recommendation.reason}</p>
        {recommendation.dish.nutrition && <NutritionPanel nutrition={recommendation.dish.nutrition} />}
        {sidesFor(recommendation.dish).length > 0 && (
          <section className="side-panel" aria-label="Recommended side dishes">
            <strong>Best with</strong>
            <span>{sidesFor(recommendation.dish).slice(0, 3).join(" · ")}</span>
          </section>
        )}
        {note && <p className="note">{note}</p>}
        <button className={`favorite-inline ${isFavorite ? "active" : ""}`} onClick={onToggleFavorite}>
          <Star size={17} fill={isFavorite ? "currentColor" : "none"} />
          {isFavorite ? "Family favorite" : "Add to favorites"}
        </button>
        <div className="decision-actions">
          <ChoiceButton icon={<Check size={19} />} onClick={onCook}>{mealType === "lunch" ? "Pack this" : "Cook this"}</ChoiceButton>
          <ChoiceButton variant="quiet" icon={<RefreshCw size={18} />} onClick={onAnother}>Another</ChoiceButton>
        </div>
        <button className="text-button" onClick={onQuicker}>Need something quicker</button>
        <div className="relief-actions">
          <button onClick={onTomorrow}><CalendarCheck size={17} /> Tomorrow plan</button>
          <button onClick={onLeftovers}><Wand2 size={17} /> Leftover magic</button>
        </div>
      </section>
    </main>
  );
}

function CookTimeFilter({ value, onChange }: { value?: number; onChange: (minutes?: number) => void }) {
  return (
    <div className="cook-filter" aria-label="Cooking time filter">
      {cookTimeFilters.map((filter) => (
        <button key={filter.label} className={value === filter.value ? "active" : ""} onClick={() => onChange(filter.value)}>
          {filter.label}
        </button>
      ))}
    </div>
  );
}

function NutritionPanel({ nutrition }: { nutrition: NonNullable<Dish["nutrition"]> }) {
  return (
    <section className="nutrition-panel" aria-label="Estimated nutrition per serving">
      <div>
        <strong>Est. nutrition</strong>
        <span>{nutrition.serving}</span>
      </div>
      <div className="macro-grid">
        <span><b>{nutrition.calories_kcal}</b> kcal</span>
        <span><b>{nutrition.carbs_g}g</b> carbs</span>
        <span><b>{nutrition.protein_g}g</b> protein</span>
        <span><b>{nutrition.fat_g}g</b> fat</span>
      </div>
      <small>{nutrition.source_name}. {nutrition.confidence}</small>
    </section>
  );
}

function SyncPanel({ signedInEmail, email, status, onEmailChange, onSend, onSignOut }: { signedInEmail?: string; email: string; status: string; onEmailChange: (email: string) => void; onSend: () => void; onSignOut: () => void }) {
  return (
    <section className="sync-panel">
      <strong>{signedInEmail ? "Synced" : "Save across devices"}</strong>
      {signedInEmail ? (
        <div>
          <span>{signedInEmail}</span>
          <button onClick={onSignOut}>Sign out</button>
        </div>
      ) : (
        <div>
          <input value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="email for magic link" aria-label="Email for sync" />
          <button onClick={onSend} disabled={!isSupabaseConfigured}>Send link</button>
        </div>
      )}
      {status && <small>{status}</small>}
    </section>
  );
}

function TomorrowPlan({ household, pantry, customDishes, favoriteDishIds, reminderTime, onReminderChange, onBack }: { household?: Household; pantry: string[]; customDishes: CustomDish[]; favoriteDishIds: string[]; reminderTime: string; onReminderChange: (time: string) => void; onBack: () => void }) {
  const [breakfastCatalog, setBreakfastCatalog] = useState<Dish[]>([]);
  const [lunchCatalog, setLunchCatalog] = useState<Dish[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    void Promise.all([listDishes("breakfast"), listDishes("lunch")])
      .then(([breakfast, lunch]) => {
        setBreakfastCatalog(breakfast);
        setLunchCatalog(lunch);
      })
      .catch(() => setNote("Using saved family recipes. Start the local API for the full plan."));
  }, []);

  const breakfastPool = [...customDishes.filter((dish) => dish.meal_type === "breakfast"), ...breakfastCatalog];
  const lunchPool = [...customDishes.filter((dish) => dish.meal_type === "lunch"), ...lunchCatalog];
  const breakfast = chooseDish(breakfastPool, household, pantry, favoriteDishIds);
  const lunch = chooseDish(lunchPool, household, pantry, favoriteDishIds, breakfast?.category);
  const dinnerPool = lunchPool.filter((dish) => ["chapati", "paratha", "rotti", "rice", "khichdi", "pulao", "lunchbox"].includes(dish.category));
  const dinner = chooseDish(dinnerPool.length ? dinnerPool : lunchPool, household, pantry, favoriteDishIds, lunch?.category);
  const prep = prepForPlan(breakfast, lunch);
  const gaps = groceryGap([breakfast, lunch, dinner], pantry);
  const tomorrowDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

  async function confirmPlan(status: "confirmed" | "worked" | "did_not_work" = "confirmed") {
    await saveTomorrowPlan({
      household,
      planDate: tomorrowDate,
      breakfast,
      lunch,
      dinner,
      prepTask: prep,
      groceryGap: gaps,
      status
    });
    await trackEvent("tomorrow_plan_saved", { status, grocery_gap_count: gaps.length }, household?.id);
  }

  async function enableReminder() {
    await onReminderChange(reminderTime);
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    await trackEvent("reminder_configured", { reminder_time: reminderTime }, household?.id);
  }

  return (
    <main className="app-shell plan-screen">
      <button className="back-button" onClick={onBack}><ArrowLeft size={19} /> Back</button>
      <p className="eyebrow">Naale enu?</p>
      <h1>Tomorrow plan</h1>
      {note && <p className="note">{note}</p>}
      <section className="plan-grid">
        <PlanCard title="Breakfast" dish={breakfast} />
        <PlanCard title="Lunchbox" dish={lunch} />
        <PlanCard title="Dinner rescue" dish={dinner} />
      </section>
      <section className="side-panel">
        <strong>One prep tonight</strong>
        <span>{prep}</span>
      </section>
      <section className="side-panel">
        <strong>Grocery gap</strong>
        <span>{gaps.length ? gaps.join(" · ") : "Nothing urgent from this plan"}</span>
      </section>
      <section className="reminder-panel">
        <label>Evening reminder<input type="time" value={reminderTime} onChange={(event) => onReminderChange(event.target.value)} /></label>
        <ChoiceButton icon={<Check size={18} />} onClick={() => confirmPlan("confirmed")}>Looks good</ChoiceButton>
        <ChoiceButton variant="quiet" icon={<Clock size={18} />} onClick={enableReminder}>Remind me nightly</ChoiceButton>
        <div className="feedback-mini">
          <button onClick={() => confirmPlan("worked")}>Worked well</button>
          <button onClick={() => confirmPlan("did_not_work")}>Did not work</button>
        </div>
      </section>
    </main>
  );
}

function PlanCard({ title, dish }: { title: string; dish?: Dish }) {
  if (!dish) {
    return <article className="plan-card empty"><strong>{title}</strong><span>Add a few family recipes or start the API.</span></article>;
  }
  return (
    <article className="plan-card">
      <img src={visualForDish(dish)} alt="" />
      <div>
        <strong>{title}</strong>
        <h2>{dish.name}</h2>
        <span>{dish.morning_effort_minutes} min</span>
        <small>Best with {sidesFor(dish).slice(0, 2).join(" or ")}</small>
      </div>
    </article>
  );
}

function LeftoverMagic({ household, customDishes, favoriteDishIds, onBack }: { household?: Household; customDishes: CustomDish[]; favoriteDishIds: string[]; onBack: () => void }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [catalog, setCatalog] = useState<Dish[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    void Promise.all([listDishes("breakfast"), listDishes("lunch")])
      .then(([breakfast, lunch]) => setCatalog([...breakfast, ...lunch]))
      .catch(() => setNote("Using saved family recipes. Start the local API for the full list."));
  }, []);

  const selectedText = selected.join(" ").toLowerCase();
  const allDishes = [...customDishes, ...catalog].filter((dish) => dietAllowed(dish, household) && avoidsAllowed(dish, household));
  const magic = allDishes
    .filter((dish) => {
      const haystack = `${dish.name} ${dish.ingredients_required.join(" ")} ${dish.tags.join(" ")}`.toLowerCase();
      if (selectedText.includes("cooked rice") && /(rice|fried|curd|lemon|tomato|puliyogare)/.test(haystack)) return true;
      if (selectedText.includes("chapati") && /(chapati|roll|upma|sandwich)/.test(haystack)) return true;
      if (selectedText.includes("dal") && /(dal|khichdi|chilla|sambar)/.test(haystack)) return true;
      if (selectedText.includes("sambar") && /(idli|rice|dosa|sambar)/.test(haystack)) return true;
      if (selectedText.includes("dosa batter") && /(dosa|idli|uttapam|appam)/.test(haystack)) return true;
      if (selectedText.includes("boiled potato") && /(potato|aloo|masala|poori|paratha)/.test(haystack)) return true;
      if (selectedText.includes("curd") && /(curd|paratha|rice|avalakki)/.test(haystack)) return true;
      if (selectedText.includes("vegetable palya") && /(chapati|roll|sandwich|rice)/.test(haystack)) return true;
      return false;
    })
    .sort((first, second) => Number(favoriteDishIds.includes(second.id)) - Number(favoriteDishIds.includes(first.id)) || first.morning_effort_minutes - second.morning_effort_minutes)
    .slice(0, 5);

  return (
    <main className="app-shell leftover-screen">
      <button className="back-button" onClick={onBack}><ArrowLeft size={19} /> Back</button>
      <p className="eyebrow">Leftover magic</p>
      <h1>Use what is already there</h1>
      {note && <p className="note">{note}</p>}
      <div className="leftover-grid">
        {leftoverChoices.map((item) => (
          <button key={item} className={selected.includes(item) ? "active" : ""} onClick={() => setSelected((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])}>{item}</button>
        ))}
      </div>
      <section className="dish-list" aria-label="Leftover ideas">
        {selected.length === 0 ? <p className="subtle">Tap one or two leftovers to get practical ideas.</p> : magic.length === 0 ? <p className="subtle">No perfect match yet. Add a family recipe for this leftover.</p> : magic.map((dish) => (
          <article className="dish-row" key={dish.id}>
            <img className="dish-thumb" src={visualForDish(dish)} alt="" />
            <div>
              <strong>{dish.name}</strong>
              <span>{dish.morning_effort_minutes} min · {dish.meal_type === "lunch" ? "lunchbox" : "breakfast"}</span>
              <small>Best with {sidesFor(dish).slice(0, 2).join(", ")}</small>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function MealTypeSwitch({ value, onChange }: { value: MealType; onChange: (mealType: MealType) => void }) {
  return (
    <div className="meal-switch" aria-label="Meal type">
      <button className={value === "breakfast" ? "active" : ""} onClick={() => onChange("breakfast")}>Breakfast</button>
      <button className={value === "lunch" ? "active" : ""} onClick={() => onChange("lunch")}>Lunchbox</button>
    </div>
  );
}

function CatalogScreen({ mealType, customDishes, favoriteDishIds, onToggleFavorite, onSave, onBack }: { mealType: MealType; customDishes: CustomDish[]; favoriteDishIds: string[]; onToggleFavorite: (dishId: string) => void; onSave: (input: { id?: string; name: string; minutes: number; ingredients: string[]; steps: string[]; sideSuggestions: string[]; photoDataUrl?: string; photoFile?: File; sourceDish?: Dish }) => Promise<void>; onBack: () => void }) {
  const [catalog, setCatalog] = useState<Dish[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "family">("all");
  const [query, setQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | undefined>();
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(15);
  const [ingredients, setIngredients] = useState("");
  const [steps, setSteps] = useState("");
  const [sideSuggestions, setSideSuggestions] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>();
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [note, setNote] = useState("");

  useEffect(() => {
    void listDishes(mealType)
      .then(setCatalog)
      .catch(() => setNote(`Showing your saved family ${mealType === "lunch" ? "lunchbox ideas" : "breakfasts"}. The full catalog needs the local API.`));
  }, [mealType]);

  const dishes = useMemo(() => {
    const familyDishes = customDishes.filter((dish) => (dish.meal_type ?? "breakfast") === mealType);
    const all = activeTab === "family" ? familyDishes : [...familyDishes, ...catalog];
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? all.filter((dish) => [dish.name, dish.category, ...dish.ingredients_required, ...dish.tags].join(" ").toLowerCase().includes(needle))
      : all;
    return interleaveByCategory(filtered, favoriteDishIds);
  }, [activeTab, catalog, customDishes, favoriteDishIds, mealType, query]);

  function openEditor(dish?: Dish) {
    setEditingDish(dish);
    setName(dish?.name ?? "");
    setMinutes(dish?.morning_effort_minutes ?? 15);
    setIngredients(dish?.ingredients_required.join(", ") ?? "");
    setSteps(dish?.steps.join("\n") ?? "");
    setSideSuggestions(dish ? sidesFor(dish).join(", ") : "");
    setPhotoDataUrl(dish?.photo_data_url);
    setPhotoFile(undefined);
    setShowAdd(true);
  }

  function attachPhoto(file?: File) {
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoDataUrl(typeof reader.result === "string" ? reader.result : undefined);
    reader.readAsDataURL(file);
  }

  async function submitCustomDish() {
    const cleanName = name.trim();
    if (!cleanName) return;
    await onSave({
      id: editingDish?.id.startsWith("custom-") ? editingDish.id : undefined,
      name: cleanName,
      minutes,
      ingredients: ingredients.split(",").map((item) => item.trim()).filter(Boolean),
      steps: steps.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 5),
      sideSuggestions: sideSuggestions.split(",").map((item) => item.trim()).filter(Boolean),
      photoDataUrl,
      photoFile,
      sourceDish: editingDish
    });
    setEditingDish(undefined);
    setName("");
    setMinutes(15);
    setIngredients("");
    setSteps("");
    setSideSuggestions("");
    setPhotoDataUrl(undefined);
    setPhotoFile(undefined);
    setShowAdd(false);
  }

  return (
    <main className="app-shell catalog">
      <button className="back-button" onClick={onBack}><ArrowLeft size={19} /> Back</button>
      <p className="eyebrow">{mealType === "lunch" ? "Lunchbox book" : "Breakfast book"}</p>
      <h1>{mealType === "lunch" ? "Lunchbox ideas" : "All breakfasts"}</h1>
      <div className="book-tabs" aria-label="Recipe collection">
        <button className={activeTab === "all" ? "active" : ""} onClick={() => setActiveTab("all")}>All</button>
        <button className={activeTab === "family" ? "active" : ""} onClick={() => setActiveTab("family")}>Family {mealType === "lunch" ? "lunch" : "breakfast"}</button>
      </div>
      {favoriteDishIds.length > 0 && <p className="subtle">Favorites for this meal are tried first on the decision screen.</p>}
      <div className="search-field">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={mealType === "lunch" ? "Search rice, roll, paratha..." : "Search dosa, poha, oats..."} aria-label={mealType === "lunch" ? "Search lunchbox ideas" : "Search breakfasts"} />
      </div>
      {note && <p className="note">{note}</p>}
      <ChoiceButton variant="quiet" icon={<Plus size={18} />} onClick={() => openEditor()}>Add family {mealType === "lunch" ? "lunchbox" : "breakfast"}</ChoiceButton>
      {showAdd && (
        <section className="add-dish-form" aria-label={mealType === "lunch" ? "Add family lunchbox" : "Add family breakfast"}>
          <p className="subtle">{editingDish && !editingDish.id.startsWith("custom-") ? "A family copy will be saved, so the original catalog stays unchanged." : "Save this in your family folder and edit it anytime."}</p>
          <label>Name<input value={name} onChange={(event) => setName(event.target.value)} placeholder={mealType === "lunch" ? "Quick paneer roll" : "Grandma's quick avalakki"} /></label>
          <label>{mealType === "lunch" ? "Packing minutes" : "Morning minutes"}<input type="number" min={3} max={90} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} /></label>
          <label>Ingredients<input value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder="poha, onion, peanuts" /></label>
          <label>Side dishes<input value={sideSuggestions} onChange={(event) => setSideSuggestions(event.target.value)} placeholder="coconut chutney, curd, pickle" /></label>
          <label>Dish photo<input type="file" accept="image/*" onChange={(event) => attachPhoto(event.target.files?.[0])} /></label>
          {photoDataUrl && <img className="photo-preview" src={photoDataUrl} alt="Selected dish preview" />}
          <label>Steps<textarea value={steps} onChange={(event) => setSteps(event.target.value)} placeholder={"Rinse poha\nTemper spices\nMix and serve"} /></label>
          <ChoiceButton icon={<Check size={18} />} onClick={submitCustomDish}>Save {mealType === "lunch" ? "lunchbox" : "breakfast"}</ChoiceButton>
        </section>
      )}
      <section className="dish-list" aria-label="Available breakfasts">
        {dishes.map((dish) => (
          <article className="dish-row" key={dish.id}>
            <img className="dish-thumb" src={visualForDish(dish)} alt="" />
            <div>
              <strong>{dish.name}</strong>
              <span>{dish.morning_effort_minutes} min · {dish.category}{dish.id.startsWith("custom-") ? " · family" : ""}</span>
              {sidesFor(dish).length > 0 && <small>Side: {sidesFor(dish).slice(0, 2).join(", ")}</small>}
            </div>
            <div className="dish-actions">
              <button className="favorite-button" aria-label={dish.id.startsWith("custom-") ? `Edit ${dish.name}` : `Copy and edit ${dish.name}`} onClick={() => openEditor(dish)}>
                <Pencil size={17} />
              </button>
              <button className={`favorite-button ${favoriteDishIds.includes(dish.id) ? "active" : ""}`} aria-label={favoriteDishIds.includes(dish.id) ? `Remove ${dish.name} from favorites` : `Add ${dish.name} to favorites`} onClick={() => onToggleFavorite(dish.id)}>
                <Star size={18} fill={favoriteDishIds.includes(dish.id) ? "currentColor" : "none"} />
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function Cook({ recommendation, onBack, onCooked }: { recommendation: Recommendation; onBack: () => void; onCooked: () => void }) {
  const isLunchbox = recommendation.dish.meal_type === "lunch";
  return (
    <main className="app-shell cook">
      <button className="back-button" onClick={onBack}><ArrowLeft size={19} /> Back</button>
      <img className="cook-photo" src={visualForDish(recommendation.dish)} alt={`${recommendation.dish.name} dish`} />
      <h1>{recommendation.dish.name}</h1>
      <p className="subtle">{recommendation.dish.total_time_minutes} minutes total</p>
      <h2>Ingredients</h2>
      <ul>{recommendation.dish.ingredients_required.map((item) => <li key={item}>{item}</li>)}</ul>
      {sidesFor(recommendation.dish).length > 0 && (
        <>
          <h2>Side ideas</h2>
          <ul>{sidesFor(recommendation.dish).map((item) => <li key={item}>{item}</li>)}</ul>
        </>
      )}
      <h2>Steps</h2>
      <ol>{recommendation.dish.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      <ChoiceButton icon={<Check size={18} />} onClick={onCooked}>{isLunchbox ? "Mark packed" : "Mark cooked"}</ChoiceButton>
    </main>
  );
}

function Feedback({ meal, onRate }: { meal: MealEvent; onRate: (rating: FeedbackRating) => void }) {
  return (
    <main className="app-shell feedback">
      <p className="eyebrow">Breakfast memory</p>
      <h1>How did {meal.dish_name ?? "breakfast"} work?</h1>
      <ChoiceButton icon={<Heart size={18} />} onClick={() => onRate("loved")}>Loved</ChoiceButton>
      <ChoiceButton variant="quiet" icon={<ThumbsUp size={18} />} onClick={() => onRate("good")}>Good</ChoiceButton>
      <ChoiceButton variant="ghost" icon={<X size={18} />} onClick={() => onRate("dont_suggest")}>Don’t suggest</ChoiceButton>
    </main>
  );
}

function HistoryScreen({ meals, onBack }: { meals: MealEvent[]; onBack: () => void }) {
  const grouped = useMemo(() => meals.slice(0, 20), [meals]);
  return (
    <main className="app-shell history">
      <button className="back-button" onClick={onBack}><ArrowLeft size={19} /> Back</button>
      <h1>Breakfast memory</h1>
      {grouped.length === 0 ? <p className="subtle">Cook one breakfast and it will appear here.</p> : grouped.map((meal) => (
        <article className="meal-row" key={meal.id}>
          <strong>{meal.dish_name ?? meal.dish_id}</strong>
          <span>{new Date(meal.cooked_at).toLocaleDateString()} {meal.rating ? `• ${meal.rating.replace("_", " ")}` : ""}</span>
        </article>
      ))}
    </main>
  );
}
