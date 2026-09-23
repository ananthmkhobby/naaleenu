from app.schemas.domain import DietType, Household, MealType, RecommendationRequest, TimeBand
from app.services.recommendation import recommend


def household(**overrides):
    data = {
        "id": "hh-test",
        "household_size": 4,
        "diet_type": DietType.veg,
        "preferred_styles": ["dosa", "idli"],
        "avoid_ingredients": [],
        "time_band": TimeBand.under_20,
    }
    data.update(overrides)
    return Household(**data)


def test_never_recommends_egg_to_vegetarian_profile():
    response = recommend(RecommendationRequest(household=household(), pantry_items=["egg", "bread"]))
    assert response.dish.diet_type == DietType.veg


def test_never_recommends_avoided_ingredient():
    response = recommend(RecommendationRequest(household=household(avoid_ingredients=["rava"]), pantry_items=["rava"]))
    assert "rava" not in [item.lower() for item in response.dish.ingredients_required]


def test_another_excludes_current_recommendation():
    first = recommend(RecommendationRequest(household=household(), pantry_items=["rice", "urad dal"]))
    second = recommend(RecommendationRequest(
        household=household(),
        pantry_items=["rice", "urad dal"],
        session_exclusions=[first.dish.id],
    ))
    assert second.dish.id != first.dish.id


def test_quicker_returns_lower_effort():
    response = recommend(RecommendationRequest(
        household=household(time_band=TimeBand.relaxed),
        pantry_items=["bread", "oats", "banana"],
        quicker_than_minutes=15,
    ))
    assert response.dish.morning_effort_minutes < 15


def test_fallback_keeps_hard_diet_constraints():
    history = [{"dish_id": f"dish-{i:03d}", "cooked_at": "2026-09-22T00:00:00+00:00"} for i in range(1, 101)]
    response = recommend(RecommendationRequest(household=household(), cooked_history=history))
    assert response.dish.diet_type == DietType.veg


def test_lunchbox_mode_recommends_lunch_catalog():
    response = recommend(RecommendationRequest(
        meal_type=MealType.lunch,
        household=household(time_band=TimeBand.under_30),
        pantry_items=["cooked rice", "curd", "wheat flour"],
    ))
    assert response.dish.meal_type == MealType.lunch


def test_another_can_skip_current_category_when_enough_options_exist():
    response = recommend(RecommendationRequest(
        household=household(preferred_styles=["dosa"]),
        pantry_items=["rice", "urad dal"],
        session_category_exclusions=["dosa"],
    ))
    assert response.dish.category not in {"idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram"}
