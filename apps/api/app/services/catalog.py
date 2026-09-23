from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path

from app.schemas.domain import DietType, Dish, MealType

ROOT = Path(__file__).resolve().parents[4]
BREAKFAST_NAMES_PATH = ROOT / "data" / "dish_names.json"
LUNCHBOX_NAMES_PATH = ROOT / "data" / "lunchbox_names.json"

SOUTH_TERMS = {
    "idli", "dosa", "uttapam", "uthappam", "pongal", "upma", "bath", "avalakki", "poha", "puttu",
    "appam", "idiyappam", "sevai", "akki", "ragi", "jowar", "rotti", "puliyogare", "chitranna",
    "rice", "bisi bele", "vangi", "sambar", "rasam", "puli", "paniyaram", "adai", "pesarattu",
    "kozhukattai", "sundal", "kadala", "kootu", "poriyal", "palya", "kuzhi", "neer", "set dosa",
    "thalipeeth", "curd rice", "lemon rice", "tomato rice", "coconut rice"
}
NORTH_TERMS = {
    "paratha", "phulka", "chapati", "roti", "thepla", "poori", "puri", "chole", "paneer",
    "bhurji", "sabzi", "sabji", "rajma", "chana", "dal", "khichdi", "chilla", "poha",
    "methi", "aloo", "matar", "jeera"
}
WESTERN_TERMS = {
    "sandwich", "toast", "omelette", "oats", "porridge", "bowl", "pancake", "wrap", "pasta",
    "fried rice", "noodles"
}
WESTERN_OVERRIDE_TERMS = {"sandwich", "toast", "porridge", "bowl", "pancake", "wrap", "pasta", "fried rice", "noodles", "cornflakes"}


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def category_for(name: str, meal_type: MealType = MealType.breakfast) -> str:
    lower = name.lower()
    if meal_type == MealType.lunch:
        for category in ["rice", "chapati", "roll", "paratha", "rotti", "idli", "dosa", "sandwich", "sundal", "khichdi", "pulao", "millet", "noodles", "pasta"]:
            if category in lower:
                return category
        return "lunchbox"
    for category in ["idli", "dosa", "uttapam", "vada", "poha", "upma", "pongal", "usli", "rice", "rotti", "appam", "puttu", "paniyaram", "paratha", "sandwich", "egg", "oats"]:
        if category in lower or (category == "poha" and "avalakki" in lower):
            return category
    if "chapati" in lower:
        return "bread"
    if "porridge" in lower or "malt" in lower:
        return "porridge"
    return "other"


def cuisine_tier_for(name: str) -> str:
    lower = name.lower()
    if any(term in lower for term in WESTERN_OVERRIDE_TERMS):
        return "western"
    if any(term in lower for term in SOUTH_TERMS):
        return "south-indian"
    if any(term in lower for term in NORTH_TERMS):
        return "north-indian"
    if any(term in lower for term in WESTERN_TERMS):
        return "western"
    return "pan-indian"


def region_for(name: str, meal_type: MealType) -> list[str]:
    tier = cuisine_tier_for(name)
    if tier == "south-indian":
        regions = ["South Indian", "Karnataka", "Tamil Nadu", "Kerala", "Andhra/Telangana"]
    elif tier == "north-indian":
        regions = ["North Indian", "pan-Indian"]
    elif tier == "western":
        regions = ["Western", "urban quick"]
    else:
        regions = ["pan-Indian"]
    if meal_type == MealType.lunch:
        return ["lunchbox", *regions]
    return regions


def ingredients_for(name: str) -> list[str]:
    lower = name.lower()
    ingredients = []
    if any(x in lower for x in ["idli", "dosa", "uttapam", "appam"]):
        ingredients += ["rice", "urad dal"]
    if "rava" in lower:
        ingredients += ["rava", "curd"]
    if "oats" in lower:
        ingredients += ["oats"]
    if "pasta" in lower:
        ingredients += ["pasta"]
    if "noodles" in lower:
        ingredients += ["noodles"]
    if "ragi" in lower:
        ingredients += ["ragi flour"]
    if "poha" in lower or "avalakki" in lower:
        ingredients += ["poha"]
    if "usli" in lower:
        ingredients += ["rice rava", "coconut"]
    if "upma" in lower or "bath" in lower:
        ingredients += ["rava"]
    if "rice" in lower or "puliyogare" in lower or "chitranna" in lower:
        ingredients += ["cooked rice"]
    if "egg" in lower or "omelette" in lower:
        ingredients += ["egg"]
    if "bread" in lower or "toast" in lower or "sandwich" in lower:
        ingredients += ["bread"]
    if "banana" in lower:
        ingredients += ["banana"]
    if "paneer" in lower:
        ingredients += ["paneer"]
    if any(x in lower for x in ["vegetable", "palya", "bath"]):
        ingredients += ["mixed vegetables"]
    if "chapati" in lower or "phulka" in lower or "roll" in lower or "thepla" in lower:
        ingredients += ["wheat flour"]
    if "dal" in lower or "khichdi" in lower or "sambar" in lower:
        ingredients += ["dal"]
    if "chickpea" in lower or "chana" in lower or "kadala" in lower or "chole" in lower:
        ingredients += ["chickpea"]
    if "sprouts" in lower or "moong" in lower:
        ingredients += ["moong"]
    return sorted(set(ingredients or ["rice", "lentils"]))


def effort_for(name: str, meal_type: MealType = MealType.breakfast) -> tuple[int, int, bool]:
    lower = name.lower()
    if meal_type == MealType.lunch:
        if any(x in lower for x in ["leftover", "curd rice", "sandwich", "roll", "idli", "sundal"]):
            return 12, 15, False
        if any(x in lower for x in ["rice", "pulao", "khichdi", "bath"]):
            return 22, 30, False
        if any(x in lower for x in ["chapati", "paratha", "rotti", "poori"]):
            return 28, 40, False
        return 20, 30, False
    if any(x in lower for x in ["instant", "sandwich", "toast", "bowl", "malt", "fruit"]):
        return 8, 12, False
    if any(x in lower for x in ["idli", "dosa", "uttapam", "appam", "puttu"]):
        return 18, 25, True
    if any(x in lower for x in ["rice", "poha", "avalakki", "upma", "usli", "omelette"]):
        return 15, 20, False
    if any(x in lower for x in ["poori", "paratha", "rotti"]):
        return 25, 35, False
    return 18, 25, False


def diet_for(name: str) -> DietType:
    lower = name.lower()
    if "egg" in lower or "omelette" in lower:
        return DietType.egg
    return DietType.veg


def side_suggestions_for(name: str, category: str, meal_type: MealType = MealType.breakfast) -> list[str]:
    lower = name.lower()
    if meal_type == MealType.lunch:
        if any(x in lower for x in ["rice", "bath", "pulao", "khichdi"]):
            return ["curd", "cucumber slices", "roasted papad"]
        if any(x in lower for x in ["chapati", "paratha", "roll", "rotti"]):
            return ["curd", "pickle", "fruit"]
        if "sandwich" in lower or "pasta" in lower or "noodles" in lower:
            return ["fruit", "curd", "nuts"]
        return ["curd", "fruit"]
    if category in ["idli", "dosa", "uttapam", "appam", "idiyappam", "paniyaram", "vada"]:
        return ["coconut chutney", "sambar", "podi with ghee"]
    if category in ["poha", "upma", "pongal", "usli"]:
        return ["coconut chutney", "curd", "banana"]
    if category in ["rice"]:
        return ["curd", "pickle", "papad"]
    if category in ["rotti", "paratha", "bread"]:
        return ["curd", "pickle", "vegetable palya"]
    if category == "porridge":
        return ["banana", "jaggery", "nuts"]
    return ["coconut chutney", "curd"]


def nutrition_for(name: str, category: str, meal_type: MealType = MealType.breakfast) -> dict:
    lower = name.lower()
    base_by_category = {
        "idli": (170, 34, 6, 2, 3),
        "dosa": (260, 42, 7, 8, 3),
        "uttapam": (280, 44, 8, 8, 4),
        "poha": (250, 45, 7, 7, 4),
        "upma": (270, 43, 7, 9, 4),
        "pongal": (320, 48, 10, 10, 4),
        "rice": (330, 58, 8, 8, 3),
        "rotti": (290, 50, 7, 7, 5),
        "appam": (240, 45, 5, 5, 2),
        "puttu": (300, 56, 8, 6, 5),
        "paniyaram": (280, 42, 7, 9, 3),
        "paratha": (360, 48, 9, 14, 5),
        "chapati": (310, 50, 10, 8, 6),
        "sandwich": (300, 38, 11, 11, 4),
        "egg": (260, 20, 16, 14, 2),
        "oats": (260, 42, 10, 7, 6),
        "khichdi": (330, 52, 12, 8, 5),
        "pulao": (360, 58, 9, 10, 4),
        "sundal": (260, 36, 13, 8, 8),
        "lunchbox": (330, 52, 10, 9, 5),
        "other": (280, 44, 8, 8, 4),
    }
    calories, carbs, protein, fat, fiber = base_by_category.get(category, base_by_category["other"])
    if "egg" in lower or "omelette" in lower:
        protein += 8
        fat += 5
        calories += 70
    if "paneer" in lower or "cheese" in lower:
        protein += 7
        fat += 8
        calories += 90
    if "sprouts" in lower or "moong" in lower or "chickpea" in lower or "sundal" in lower or "kadala" in lower:
        protein += 5
        fiber += 3
        calories += 35
    if "millet" in lower or "ragi" in lower or "jowar" in lower:
        fiber += 2
    if "poori" in lower or "fried" in lower:
        fat += 6
        calories += 70
    if meal_type == MealType.lunch:
        calories += 40
        carbs += 6
    return {
        "serving": "1 typical home serving",
        "calories_kcal": calories,
        "carbs_g": carbs,
        "protein_g": protein,
        "fat_g": fat,
        "fiber_g": fiber,
        "source_name": "USDA FoodData Central + Indian Food Composition Tables 2017",
        "source_license": "USDA FDC public domain; IFCT 2017 by ICMR-NIN used as India-specific reference",
        "confidence": "estimated from ingredients/category; verify with weighed recipe for clinical use",
    }


def steps_for(name: str, ingredients: list[str], meal_type: MealType = MealType.breakfast) -> list[str]:
    main = ingredients[0]
    if meal_type == MealType.lunch:
        return [
            f"Keep {', '.join(ingredients[:3])} ready and use any cooked base already available.",
            f"Prepare {name} with mild seasoning so it travels well in a lunch box.",
            "Cool slightly before closing the box to reduce excess steam.",
            "Pack with curd, fruit or a small side if it is available."
        ]
    return [
        f"Gather {', '.join(ingredients[:3])} and keep the usual pantry staples ready.",
        f"Prepare the {main} base and season it gently for a breakfast-friendly taste.",
        "Cook on medium heat until the texture is set and the aroma is fresh.",
        f"Serve {name} warm with chutney, curd or a simple side that is already available."
    ]


def _load_names(meal_type: MealType) -> list[str]:
    path = BREAKFAST_NAMES_PATH if meal_type == MealType.breakfast else LUNCHBOX_NAMES_PATH
    return json.loads(path.read_text())


@lru_cache
def load_catalog(meal_type: MealType | None = None) -> list[Dish]:
    dishes: list[Dish] = []
    meal_types = [meal_type] if meal_type else [MealType.breakfast, MealType.lunch]
    for current_meal_type in meal_types:
        names = _load_names(current_meal_type)
        prefix = "dish" if current_meal_type == MealType.breakfast else "lunch"
        for index, name in enumerate(names, start=1):
            ingredients = ingredients_for(name)
            morning, total, prep = effort_for(name, current_meal_type)
            category = category_for(name, current_meal_type)
            slug = slugify(name)
            dishes.append(Dish(
                id=f"{prefix}-{index:03d}",
                meal_type=current_meal_type,
                slug=slug,
                name=name,
                region=region_for(name, current_meal_type),
                diet_type=diet_for(name),
                category=category,
                active_time_minutes=morning,
                total_time_minutes=total,
                morning_effort_minutes=morning,
                previous_night_effort_minutes=10 if prep else 0,
                requires_previous_night_prep=prep,
                ingredients_required=ingredients,
                ingredients_optional=["curd", "fruit", "pickle"] if current_meal_type == MealType.lunch else ["curry leaves", "coconut", "peanuts"] if category in ["poha", "upma", "rice"] else ["chutney"],
                side_suggestions=side_suggestions_for(name, category, current_meal_type),
                kids_score=4 if any(x in name.lower() for x in ["mini", "cheese", "banana", "sandwich"]) else 3,
                lunchbox_score=4 if any(x in name.lower() for x in ["rotti", "paratha", "rice", "sandwich"]) else 3,
                protein_score=5 if any(x in name.lower() for x in ["egg", "sprouts", "chickpea", "paneer"]) else 3,
                health_score=4 if any(x in name.lower() for x in ["ragi", "millet", "oats", "sprouts", "moong"]) else 3,
                cost_level=2 if any(x in name.lower() for x in ["paneer", "cheese"]) else 1,
                leftover_friendly=any(x in name.lower() for x in ["leftover", "fried", "upma", "rice"]),
                repeat_gap_days=4 if category in ["idli", "dosa"] else 3,
                steps=steps_for(name, ingredients, current_meal_type),
                image_key=f"{current_meal_type.value}/{slug}",
                tags=[
                    cuisine_tier_for(name),
                    *(
                        ["quick", "lunchbox"] if current_meal_type == MealType.lunch and morning <= 15
                        else ["lunchbox"] if current_meal_type == MealType.lunch
                        else ["quick"] if morning <= 10
                        else ["weekday"] if morning <= 20
                        else ["weekend"]
                    )
                ],
                nutrition=nutrition_for(name, category, current_meal_type),
                is_active=True
            ))
    return dishes


def get_dish(dish_id: str) -> Dish | None:
    return next((dish for dish in load_catalog(None) if dish.id == dish_id), None)
