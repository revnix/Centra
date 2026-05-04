import subprocess
import sys


def main():
    print("Running database migrations...")
    result = subprocess.run(
        ["alembic", "upgrade", "head"],
        cwd="/app",
        capture_output=True,
        text=True,
    )
    print(result.stdout)
    if result.returncode != 0:
        print("Error:", result.stderr)
        sys.exit(1)
    print("Database setup complete!")


if __name__ == "__main__":
    main()
