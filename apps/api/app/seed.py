from __future__ import annotations

import os

from sqlalchemy import create_engine, text


SEED_SNAPSHOTS = [
    {"namespace": "cost-detective", "created_at": 1735689600, "finding_count": 8},
    {"namespace": "cost-detective", "created_at": 1735776000, "finding_count": 5},
    {"namespace": "cost-detective", "created_at": 1735862400, "finding_count": 3},
]


def main() -> None:
    engine = create_engine(os.environ["DATABASE_URL"])

    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE analysis_snapshots RESTART IDENTITY"))
        conn.execute(
            text("""
                INSERT INTO analysis_snapshots (namespace, created_at, finding_count)
                VALUES (:namespace, :created_at, :finding_count)
            """),
            SEED_SNAPSHOTS,
        )

    print(f"Seeded {len(SEED_SNAPSHOTS)} analysis snapshots.")


if __name__ == "__main__":
    main()
