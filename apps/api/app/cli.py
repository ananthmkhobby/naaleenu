from app.services.catalog import load_catalog


def migrate() -> None:
    print("Prototype storage is in-memory. PostgreSQL/Alembic migration hook is reserved for Phase 1 hardening.")


def seed() -> None:
    print(f"Loaded {len(load_catalog())} total dishes across breakfast and lunchbox catalogs")


def smoke() -> None:
    dishes = load_catalog()
    breakfast_count = len([dish for dish in dishes if dish.meal_type == "breakfast"])
    lunch_count = len([dish for dish in dishes if dish.meal_type == "lunch"])
    assert breakfast_count >= 200
    assert lunch_count >= 100
    print(f"Smoke passed: catalog has {breakfast_count} breakfast dishes and {lunch_count} lunchbox ideas")


if __name__ == "__main__":
    import sys
    command = sys.argv[1] if len(sys.argv) > 1 else "smoke"
    {"migrate": migrate, "seed": seed, "smoke": smoke}[command]()
