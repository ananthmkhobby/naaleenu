export type DietType = "veg" | "egg" | "non_veg";
export type TimeBand = "under_10" | "under_20" | "under_30" | "relaxed";
export type FeedbackRating = "loved" | "good" | "dont_suggest";

export interface HouseholdProfile {
  id: string;
  household_size: number;
  diet_type: DietType;
  preferred_styles: string[];
  avoid_ingredients: string[];
  time_band: TimeBand;
}

export interface Dish {
  id: string;
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
  repeat_gap_days: number;
  steps: string[];
  image_key: string;
  tags: string[];
}
