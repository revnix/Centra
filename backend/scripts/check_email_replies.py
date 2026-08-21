"""Compatibility wrapper.

The poller script was migrated to `src/app/jobs/tasks/email_reply_poller.py`.
This wrapper keeps the legacy subprocess path working.

Important: this file must stay import-safe even if optional dependencies
(e.g. `imap_tools`) are not installed.
"""


def main() -> None:
    from src.app.jobs.tasks import email_reply_poller as poller

    # The migrated module currently retains the legacy script structure.
    # Running it here reproduces the old behavior.
    import time
    from datetime import datetime

    print(f"[{datetime.now()}] STARTING: Gmail Reply Polling Service")
    print("Checking for replies every 30 seconds...")

    while True:
        try:
            poller.check_for_replies()
            poller.check_timeouts()
        except KeyboardInterrupt:
            print("Exiting...")
            break
        except Exception as e:
            print(f"[{datetime.now()}] CRITICAL RUNTIME ERROR: {e}")
        time.sleep(30)


if __name__ == "__main__":
    main()
