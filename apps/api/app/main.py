from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.domain import (
    DecisionRequest,
    FeedbackCreate,
    Household,
    HouseholdCreate,
    Meal,
    MealCreate,
    MealType,
    RecommendationRequest,
    RecommendationResponse,
)
from app.services.catalog import get_dish, load_catalog
from app.services.recommendation import recommend

app = FastAPI(title="Breakfast Decision Assistant API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

HOUSEHOLDS: dict[str, Household] = {}
MEALS: list[Meal] = []
FEEDBACK: list[dict] = []
IDEMPOTENCY: dict[str, dict] = {}


@app.middleware("http")
async def correlation_id(request: Request, call_next):
    request.state.correlation_id = request.headers.get("x-correlation-id", f"req-{uuid4()}")
    response = await call_next(request)
    response.headers["x-correlation-id"] = request.state.correlation_id
    return response


@app.get("/health")
def health():
    return {"status": "ok", "catalog_count": len(load_catalog())}


@app.get("/v1/catalog/version")
def catalog_version():
    return {"version": "seed-2026-09-23", "dish_count": len(load_catalog())}


@app.get("/v1/dishes")
def dishes(meal_type: MealType | None = None):
    return {"dishes": load_catalog(meal_type)}


@app.post("/v1/households", response_model=Household)
def create_household(payload: HouseholdCreate):
    household = Household(id=f"hh-{uuid4()}", **payload.model_dump())
    HOUSEHOLDS[household.id] = household
    return household


@app.get("/v1/households/{household_id}", response_model=Household)
def read_household(household_id: str):
    if household_id not in HOUSEHOLDS:
        raise HTTPException(404, "Household not found")
    return HOUSEHOLDS[household_id]


@app.patch("/v1/households/{household_id}", response_model=Household)
def update_household(household_id: str, payload: HouseholdCreate):
    if household_id not in HOUSEHOLDS:
        raise HTTPException(404, "Household not found")
    household = Household(id=household_id, **payload.model_dump())
    HOUSEHOLDS[household.id] = household
    return household


@app.post("/v1/households/{household_id}/pantry")
def update_pantry(household_id: str, pantry_items: list[str]):
    if household_id not in HOUSEHOLDS:
        raise HTTPException(404, "Household not found")
    return {"household_id": household_id, "pantry_items": pantry_items}


@app.post("/v1/recommendations", response_model=RecommendationResponse)
def create_recommendation(payload: RecommendationRequest):
    try:
        return recommend(payload)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.post("/v1/recommendations/{recommendation_id}/decision")
def record_decision(recommendation_id: str, payload: DecisionRequest):
    if payload.idempotency_key in IDEMPOTENCY:
        return IDEMPOTENCY[payload.idempotency_key]
    result = {"recommendation_id": recommendation_id, "action": payload.action, "created_at": datetime.now(timezone.utc).isoformat()}
    IDEMPOTENCY[payload.idempotency_key] = result
    return result


@app.post("/v1/meals", response_model=Meal)
def create_meal(payload: MealCreate):
    if payload.idempotency_key in IDEMPOTENCY:
        return IDEMPOTENCY[payload.idempotency_key]
    if get_dish(payload.dish_id) is None:
        raise HTTPException(404, "Dish not found")
    meal = Meal(
        id=f"meal-{uuid4()}",
        household_id=payload.household_id,
        dish_id=payload.dish_id,
        cooked_at=datetime.now(timezone.utc).isoformat(),
        source_recommendation_id=payload.source_recommendation_id
    )
    MEALS.append(meal)
    IDEMPOTENCY[payload.idempotency_key] = meal
    return meal


@app.post("/v1/meals/{meal_id}/feedback")
def create_feedback(meal_id: str, payload: FeedbackCreate):
    if payload.idempotency_key in IDEMPOTENCY:
        return IDEMPOTENCY[payload.idempotency_key]
    event = {"meal_id": meal_id, "rating": payload.rating, "created_at": datetime.now(timezone.utc).isoformat()}
    FEEDBACK.append(event)
    IDEMPOTENCY[payload.idempotency_key] = event
    return event


@app.get("/v1/households/{household_id}/history")
def history(household_id: str):
    meals = [meal.model_dump() for meal in MEALS if meal.household_id == household_id]
    return {"meals": meals, "feedback": FEEDBACK}


@app.get("/v1/dishes/{dish_id}")
def dish(dish_id: str):
    found = get_dish(dish_id)
    if found is None:
        raise HTTPException(404, "Dish not found")
    return found
