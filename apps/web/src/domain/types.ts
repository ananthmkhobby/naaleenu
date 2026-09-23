export type DietType = "veg" | "egg" | "non_veg";
export type TimeBand = "under_10" | "under_20" | "under_30" | "relaxed";
export type FeedbackRating = "loved" | "good" | "dont_suggest";
export type MealType = "breakfast" | "lunch";

export interface Household {
  id: string;
  household_size: number;
  diet_type: DietType;
  preferred_styles: string[];
  avoid_ingredients: string[];
  time_band: TimeBand;
}

export interface Dish {
  id: string;
  meal_type: MealType;
  slug: string;
  name: string;
  region: string[];
  diet_type: DietType;
  category: string;
  active_time_minutes: number;
  total_time_minutes: number;
  morning_effort_minutes: number;
  requires_previous_night_prep: boolean;
  ingredients_required: string[];
  ingredients_optional: string[];
  side_suggestions: string[];
  repeat_gap_days: number;
  steps: string[];
  image_key: string;
  photo_data_url?: string;
  tags: string[];
}

export interface CustomDish extends Dish {
  is_custom: true;
  created_at: string;
}

export interface Recommendation {
  recommendation_id: string;
  session_id: string;
  dish: Dish;
  score: number;
  reason_codes: string[];
  reason: string;
}

export interface MealEvent {
  id: string;
  household_id: string;
  dish_id: string;
  dish_name?: string;
  cooked_at: string;
  source_recommendation_id?: string;
  rating?: FeedbackRating;
}
