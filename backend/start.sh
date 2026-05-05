#!/bin/sh
# Run alembic migrations. If the revision is already applied or the file
# can't be located (DB ahead of migration files), log a warning and continue.
# The schema already exists in that case so the app can start safely.
if alembic upgrade head; then
    echo "Migrations applied successfully"
else
    echo "WARNING: alembic upgrade head failed - DB may already be at the latest revision"
    echo "Starting server anyway..."
fi

exec uvicorn src.api.main:app --host 0.0.0.0 --port 8000
