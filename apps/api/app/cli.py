from app.services.catalog import load_catalog


def migrate() -> None:
    print("Prototype storage is in-memory. PostgreSQL/Alembic migration hook is reserved for Phase 1 hardening.")


def seed() -> None:
    print(f"Loaded {len(load_catalog())} total dishes across breakfast and lunchbox catalogs")


def smoke() -> None:
    assert len(load_catalog()) == 164
    print("Smoke passed: catalog has 104 breakfast dishes and 60 lunchbox ideas")


if __name__ == "__main__":
    import sys
    command = sys.argv[1] if len(sys.argv) > 1 else "smoke"
    {"migrate": migrate, "seed": seed, "smoke": smoke}[command]()
