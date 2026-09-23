from __future__ import annotations

from datetime import date, datetime
from random import choice
from uuid import uuid4

from app.schemas.domain import DietType, Dish, RecommendationRequest, RecommendationResponse, TimeBand
from app.services.catalog import load_catalog


TIME_LIMITS = {
    TimeBand.under_10: 10,
    TimeBand.under_20: 20,
    TimeBand.under_30: 30,
    TimeBand.relaxed: 60
}

WEIGHTS = {
    "preference": 0.30,
    "ingredients": 0.25,
    "time": 0.20,
    "variety": 0.15,
    "history": 0.10
}

CUISINE_PRIORITY = {
    "south-indian": 0.12,
    "north-indian": 0.05,
    "pan-indian": 0.03,
    "western": 0.0
}

CATEGORY_FAMILIES = {
    "idli": {"idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"},
    "dosa": {"idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"},
    "uttapam": {"idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"},
    "appam": {"idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"},
    "idiyappam": {"idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"},
    "paniyaram": {"idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"},
    "rice": {"rice", "khichdi", "pulao"},
    "khichdi": {"rice", "khichdi", "pulao"},
    "pulao": {"rice", "khichdi", "pulao"},
    "upma": {"upma", "poha", "usli"},
    "poha": {"upma", "poha", "usli"},
    "usli": {"upma", "poha", "usli"},
    "rotti": {"rotti", "chapati", "paratha"},
    "chapati": {"rotti", "chapati", "paratha"},
    "paratha": {"rotti", "chapati", "paratha"},
}


def _days_since(value: str) -> int:
    try:
        return (date.today() - datetime.fromisoformat(value.replace("Z", "+00:00")).date()).days
    except ValueError:
        return 999


def _diet_allowed(dish: Dish, diet_type: DietType) -> bool:
    if diet_type == DietType.veg:
        return dish.diet_type == DietType.veg
    if diet_type == DietType.egg:
        return dish.diet_type in {DietType.veg, DietType.egg}
    return True


def _has_avoided(dish: Dish, avoid: list[str]) -> bool:
    avoid_set = {item.lower().strip() for item in avoid}
    return any(ingredient.lower() in avoid_set for ingredient in dish.ingredients_required)


def _history_maps(history: list[dict]) -> tuple[dict[str, int], set[str], set[str]]:
    cooked_days: dict[str, int] = {}
    loved: set[str] = set()
    blocked: set[str] = set()
    for event in history:
        dish_id = str(event.get("dish_id", ""))
        if not dish_id:
            continue
        if "cooked_at" in event:
            cooked_days[dish_id] = min(cooked_days.get(dish_id, 999), _days_since(str(event["cooked_at"])))
        if event.get("rating") == "loved":
            loved.add(dish_id)
        if event.get("rating") == "dont_suggest":
            blocked.add(dish_id)
    return cooked_days, loved, blocked


def _eligible(req: RecommendationRequest, relax_repeat: bool = False, relax_time: bool = False) -> list[Dish]:
    limit = TIME_LIMITS[req.household.time_band]
    cooked_days, _, blocked = _history_maps(req.cooked_history)
    excluded_categories = {
        family_category
        for category in req.session_category_exclusions
        for family_category in CATEGORY_FAMILIES.get(category, {category})
    }
    result: list[Dish] = []
    custom_dishes = [dish for dish in req.custom_dishes if dish.meal_type == req.meal_type]
    for dish in [*custom_dishes, *load_catalog(req.meal_type)]:
        if not dish.is_active:
            continue
        if dish.id in blocked or dish.id in req.session_exclusions:
            continue
        if dish.category in excluded_categories:
            continue
        if not _diet_allowed(dish, req.household.diet_type):
            continue
        if _has_avoided(dish, req.household.avoid_ingredients):
            continue
        if req.quicker_than_minutes is not None and dish.morning_effort_minutes >= req.quicker_than_minutes:
            continue
        if req.max_cook_minutes is not None and dish.morning_effort_minutes > req.max_cook_minutes:
            continue
        if not relax_time and dish.morning_effort_minutes > limit:
            continue
        if not relax_repeat and cooked_days.get(dish.id, 999) < dish.repeat_gap_days:
            continue
        result.append(dish)
    return result


def _score(dish: Dish, req: RecommendationRequest) -> tuple[float, list[str]]:
    pantry = {item.lower().strip() for item in req.pantry_items}
    cooked_days, loved, _ = _history_maps(req.cooked_history)
    preferred = {style.lower() for style in req.household.preferred_styles}

    style_hit = dish.category.lower() in preferred or bool(preferred.intersection({tag.lower() for tag in dish.tags}))
    preference = 1.0 if style_hit else 0.65
    if dish.id in loved:
        preference += 0.15

    required = {item.lower() for item in dish.ingredients_required}
    ingredient_score = len(required.intersection(pantry)) / max(len(required), 1) if pantry else 0.55
    limit = TIME_LIMITS[req.household.time_band]
    time_score = max(0.0, 1 - (dish.morning_effort_minutes / max(limit, 1)) * 0.35)
    days = cooked_days.get(dish.id, 999)
    variety_score = min(days / max(dish.repeat_gap_days, 1), 1.0)
    history_score = 1.0 if dish.id in loved else 0.7

    score = (
        preference * WEIGHTS["preference"]
        + ingredient_score * WEIGHTS["ingredients"]
        + time_score * WEIGHTS["time"]
        + variety_score * WEIGHTS["variety"]
        + history_score * WEIGHTS["history"]
    )
    score += max((CUISINE_PRIORITY.get(tag.lower(), 0.0) for tag in dish.tags), default=0.0)

    reasons = []
    if "south-indian" in {tag.lower() for tag in dish.tags}:
        reasons.append("south_indian_first")
    if ingredient_score >= 0.75:
        reasons.append("pantry_match")
    if dish.morning_effort_minutes <= 10:
        reasons.append("quick")
    if days >= dish.repeat_gap_days:
        reasons.append("good_rotation")
    if dish.id in loved:
        reasons.append("household_loved")
    return round(score * 100, 2), reasons or ["balanced_fit"]


def _reason_text(codes: list[str]) -> str:
    if "quick" in codes:
        return "It is quick enough for today and still feels like a proper meal."
    if "pantry_match" in codes and "good_rotation" in codes:
        return "You have the main ingredients and have not had this too recently."
    if "household_loved" in codes:
        return "Your household has liked this before, and it still fits today's constraints."
    return "It fits your time, diet and recent meal rotation."


def recommend(req: RecommendationRequest) -> RecommendationResponse:
    candidates = _eligible(req)
    if len(candidates) < 3:
        req.session_category_exclusions = []
        candidates = _eligible(req)
    if len(candidates) < 3:
        candidates = _eligible(req, relax_repeat=True)
    if len(candidates) < 3:
        candidates = _eligible(req, relax_repeat=True, relax_time=True)
    if not candidates:
        raise ValueError("No eligible dish found without violating hard exclusions.")

    ranked = sorted(
        ((_score(dish, req), dish) for dish in candidates),
        key=lambda item: (item[0][0], item[1].id)
    )
    best_score = ranked[-1][0][0]
    top_band = [item for item in ranked if item[0][0] >= best_score - 3.0]
    (score, reason_codes), dish = choice(top_band[-8:])
    session_id = f"session-{uuid4()}"
    return RecommendationResponse(
        recommendation_id=f"rec-{uuid4()}",
        session_id=session_id,
        dish=dish,
        score=score,
        reason_codes=reason_codes,
        reason=_reason_text(reason_codes)
    )
