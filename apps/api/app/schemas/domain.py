from enum import StrEnum
from pydantic import BaseModel, Field


class DietType(StrEnum):
    veg = "veg"
    egg = "egg"
    non_veg = "non_veg"


class TimeBand(StrEnum):
    under_10 = "under_10"
    under_20 = "under_20"
    under_30 = "under_30"
    relaxed = "relaxed"


class MealType(StrEnum):
    breakfast = "breakfast"
    lunch = "lunch"


class FeedbackRating(StrEnum):
    loved = "loved"
    good = "good"
    dont_suggest = "dont_suggest"


class Household(BaseModel):
    id: str
    household_size: int = Field(ge=1, le=12)
    diet_type: DietType
    preferred_styles: list[str] = []
    avoid_ingredients: list[str] = []
    time_band: TimeBand = TimeBand.under_20


class HouseholdCreate(BaseModel):
    household_size: int = Field(default=4, ge=1, le=12)
    diet_type: DietType = DietType.veg
    preferred_styles: list[str] = []
    avoid_ingredients: list[str] = []
    time_band: TimeBand = TimeBand.under_20


class NutritionEstimate(BaseModel):
    serving: str
    calories_kcal: int
    carbs_g: int
    protein_g: int
    fat_g: int
    fiber_g: int
    source_name: str
    source_license: str
    confidence: str = "estimate"


class Dish(BaseModel):
    id: str
    meal_type: MealType = MealType.breakfast
    slug: str
    name: str
    region: list[str]
    diet_type: DietType
    category: str
    active_time_minutes: int
    total_time_minutes: int
    morning_effort_minutes: int
    previous_night_effort_minutes: int = 0
    requires_previous_night_prep: bool
    ingredients_required: list[str]
    ingredients_optional: list[str] = []
    side_suggestions: list[str] = []
    pantry_assumptions: list[str] = ["oil", "salt", "water"]
    kids_score: int = Field(ge=1, le=5)
    lunchbox_score: int = Field(ge=1, le=5)
    protein_score: int = Field(ge=1, le=5)
    health_score: int = Field(ge=1, le=5)
    cost_level: int = Field(ge=1, le=3)
    leftover_friendly: bool = False
    repeat_gap_days: int = Field(ge=0, le=14)
    steps: list[str] = Field(min_length=3, max_length=5)
    image_key: str
    tags: list[str] = []
    nutrition: NutritionEstimate | None = None
    is_active: bool = True


class RecommendationRequest(BaseModel):
    meal_type: MealType = MealType.breakfast
    household: Household
    pantry_items: list[str] = []
    custom_dishes: list[Dish] = []
    session_exclusions: list[str] = []
    session_category_exclusions: list[str] = []
    cooked_history: list[dict] = []
    quicker_than_minutes: int | None = None
    max_cook_minutes: int | None = None


class RecommendationResponse(BaseModel):
    recommendation_id: str
    session_id: str
    dish: Dish
    score: float
    reason_codes: list[str]
    reason: str


class DecisionRequest(BaseModel):
    action: str
    idempotency_key: str


class MealCreate(BaseModel):
    household_id: str
    dish_id: str
    source_recommendation_id: str | None = None
    idempotency_key: str


class Meal(BaseModel):
    id: str
    household_id: str
    dish_id: str
    cooked_at: str
    source_recommendation_id: str | None = None


class FeedbackCreate(BaseModel):
    meal_id: str
    rating: FeedbackRating
    idempotency_key: str
