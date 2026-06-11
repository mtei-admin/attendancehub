# Streamlit Backup — AttendanceHub v1

Snapshot of the original Streamlit + SQLite setup before migration to Next.js + Neon + Vercel.

**Backed up:** 2026-06-11

## Contents

| File | Purpose |
|------|---------|
| `app.py` | Streamlit UI (Employee, Manager, HR views) |
| `db.py` | SQLite database layer |
| `attendance.db` | SQLite database with seed data |
| `requirements.txt` | Python dependencies |
| `.streamlit/config.toml` | Streamlit server config |
| `start_attendancehub.bat` | Windows startup script |
| `deploy/attendancehub.service` | Linux systemd unit |
| `DEPLOYMENT.md` | Local deployment guide |
| `.cursorrules` | Project guidelines |

## Restore

```powershell
cd "c:\CursorAi Creation\New\MTEI Slips"
Copy-Item backup\streamlit-original\app.py, backup\streamlit-original\db.py, backup\streamlit-original\attendance.db, backup\streamlit-original\requirements.txt, backup\streamlit-original\start_attendancehub.bat, backup\streamlit-original\DEPLOYMENT.md -Destination . -Force
Copy-Item backup\streamlit-original\.streamlit\config.toml .streamlit\ -Force
pip install -r requirements.txt
python -m streamlit run app.py
```
