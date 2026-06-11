"""Database abstraction layer for AttendanceHub."""

import sqlite3
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Generator, Optional

DB_PATH = Path(__file__).parent / "attendance.db"

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS attendance_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ref_id TEXT NOT NULL UNIQUE,
    submitted_at DATETIME NOT NULL,
    employee_name TEXT NOT NULL,
    request_type TEXT NOT NULL,
    date_of_incident DATE NOT NULL,
    time_in TEXT,
    ot_hrs TEXT,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    approved_by TEXT,
    approved_on DATETIME
);
"""


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_now_iso() -> str:
    return _utc_now().isoformat()


@contextmanager
def get_connection() -> Generator[sqlite3.Connection, None, None]:
    """Yield a SQLite connection that always closes cleanly."""
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """Create the attendance_requests table if it does not exist."""
    with get_connection() as conn:
        conn.execute(CREATE_TABLE_SQL)


def _generate_ref_id(conn: sqlite3.Connection) -> str:
    row = conn.execute(
        "SELECT ref_id FROM attendance_requests ORDER BY id DESC LIMIT 1"
    ).fetchone()
    if row is None:
        return "REQ-001"
    last_num = int(row["ref_id"].split("-")[1])
    return f"REQ-{last_num + 1:03d}"


def add_request(
    employee_name: str,
    request_type: str,
    date_of_incident: date,
    reason: str,
    time_in: Optional[str] = None,
    ot_hrs: Optional[str] = None,
) -> str:
    """Insert a new attendance request and return its ref_id."""
    with get_connection() as conn:
        ref_id = _generate_ref_id(conn)
        conn.execute(
            """
            INSERT INTO attendance_requests (
                ref_id, submitted_at, employee_name, request_type,
                date_of_incident, time_in, ot_hrs, reason, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
            """,
            (
                ref_id,
                _utc_now_iso(),
                employee_name,
                request_type,
                date_of_incident.isoformat(),
                time_in,
                ot_hrs,
                reason,
            ),
        )
        return ref_id


def _rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    return [dict(row) for row in rows]


def get_all_requests() -> list[dict[str, Any]]:
    """Return all attendance requests, newest first."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM attendance_requests ORDER BY submitted_at DESC"
        ).fetchall()
        return _rows_to_dicts(rows)


def get_pending_requests() -> list[dict[str, Any]]:
    """Return all requests with Pending status."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM attendance_requests WHERE status = 'Pending' ORDER BY submitted_at DESC"
        ).fetchall()
        return _rows_to_dicts(rows)


def get_approved_requests() -> list[dict[str, Any]]:
    """Return all requests with Approved status."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM attendance_requests WHERE status = 'Approved' ORDER BY submitted_at DESC"
        ).fetchall()
        return _rows_to_dicts(rows)


def update_request_status(
    req_id: str,
    status: str,
    approved_by: str,
) -> bool:
    """Update the status of a request by ref_id. Returns True if a row was updated."""
    with get_connection() as conn:
        cursor = conn.execute(
            """
            UPDATE attendance_requests
            SET status = ?, approved_by = ?, approved_on = ?
            WHERE ref_id = ?
            """,
            (status, approved_by, _utc_now_iso(), req_id),
        )
        return cursor.rowcount > 0


def seed_dummy_data() -> None:
    """Populate the database with sample attendance requests for testing."""
    samples = [
        {
            "employee_name": "Maria Santos",
            "request_type": "Late",
            "date_of_incident": date.today() - timedelta(days=1),
            "time_in": "09:45 AM",
            "ot_hrs": None,
            "reason": "Heavy traffic on EDSA due to road construction.",
            "status": "Pending",
            "approved_by": None,
            "approved_on": None,
            "submitted_at_offset": timedelta(hours=-2),
        },
        {
            "employee_name": "Juan Dela Cruz",
            "request_type": "Absent",
            "date_of_incident": date.today() - timedelta(days=3),
            "time_in": None,
            "ot_hrs": None,
            "reason": "Medical appointment — attached doctor's note.",
            "status": "Approved",
            "approved_by": "Carlos Reyes",
            "approved_on": timedelta(days=-2, hours=-4),
            "submitted_at_offset": timedelta(days=-3, hours=-1),
        },
        {
            "employee_name": "Ana Reyes",
            "request_type": "Leave",
            "date_of_incident": date.today() - timedelta(days=5),
            "time_in": None,
            "ot_hrs": None,
            "reason": "Personal leave — family event.",
            "status": "Approved",
            "approved_by": "Carlos Reyes",
            "approved_on": timedelta(days=-4),
            "submitted_at_offset": timedelta(days=-5),
        },
        {
            "employee_name": "Pedro Garcia",
            "request_type": "Offset",
            "date_of_incident": date.today() - timedelta(days=2),
            "time_in": None,
            "ot_hrs": "4",
            "reason": "Worked Saturday to offset Monday absence.",
            "status": "Pending",
            "approved_by": None,
            "approved_on": None,
            "submitted_at_offset": timedelta(days=-2, hours=-3),
        },
        {
            "employee_name": "Lisa Fernandez",
            "request_type": "Late",
            "date_of_incident": date.today() - timedelta(days=7),
            "time_in": "10:15 AM",
            "ot_hrs": None,
            "reason": "MRT breakdown caused significant delay.",
            "status": "Rejected",
            "approved_by": "Carlos Reyes",
            "approved_on": timedelta(days=-6),
            "submitted_at_offset": timedelta(days=-7),
        },
        {
            "employee_name": "Mark Villanueva",
            "request_type": "Leave",
            "date_of_incident": date.today() - timedelta(days=10),
            "time_in": None,
            "ot_hrs": None,
            "reason": "Vacation leave — pre-approved by HR.",
            "status": "Approved",
            "approved_by": "Carlos Reyes",
            "approved_on": timedelta(days=-9),
            "submitted_at_offset": timedelta(days=-10),
        },
        {
            "employee_name": "Grace Tan",
            "request_type": "Absent",
            "date_of_incident": date.today() - timedelta(days=4),
            "time_in": None,
            "ot_hrs": None,
            "reason": "Flu symptoms — advised to rest at home.",
            "status": "Pending",
            "approved_by": None,
            "approved_on": None,
            "submitted_at_offset": timedelta(days=-4, hours=-5),
        },
        {
            "employee_name": "Ryan Ocampo",
            "request_type": "Late",
            "date_of_incident": date.today() - timedelta(days=6),
            "time_in": "09:30 AM",
            "ot_hrs": None,
            "reason": "Childcare drop-off took longer than expected.",
            "status": "Approved",
            "approved_by": "Carlos Reyes",
            "approved_on": timedelta(days=-5, hours=-2),
            "submitted_at_offset": timedelta(days=-6, hours=-1),
        },
    ]

    now = _utc_now()
    with get_connection() as conn:
        existing = conn.execute("SELECT COUNT(*) AS cnt FROM attendance_requests").fetchone()
        if existing and existing["cnt"] > 0:
            return

        for idx, sample in enumerate(samples, start=1):
            ref_id = f"REQ-{idx:03d}"
            submitted_at = now + sample["submitted_at_offset"]
            approved_on = None
            if sample["approved_on"] is not None:
                approved_on = (now + sample["approved_on"]).isoformat()

            conn.execute(
                """
                INSERT INTO attendance_requests (
                    ref_id, submitted_at, employee_name, request_type,
                    date_of_incident, time_in, ot_hrs, reason,
                    status, approved_by, approved_on
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    ref_id,
                    submitted_at.isoformat(),
                    sample["employee_name"],
                    sample["request_type"],
                    sample["date_of_incident"].isoformat(),
                    sample["time_in"],
                    sample["ot_hrs"],
                    sample["reason"],
                    sample["status"],
                    sample["approved_by"],
                    approved_on,
                ),
            )


if __name__ == "__main__":
    init_db()
    seed_dummy_data()
    print(f"Database initialized at {DB_PATH}")
