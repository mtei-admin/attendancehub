# AttendanceHub — Local Deployment Guide

## Prerequisites

- Python 3.10 or later
- Network access to the internal machine that will host the app

## 1. Install Dependencies

```bash
cd "d:\Code\MTEI Slips"
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
```

## 2. Initialize the Database (optional — app does this on startup)

```bash
python db.py
```

This creates `attendance.db` and seeds sample data if the database is empty.

## 3. Run the App Manually

```bash
streamlit run app.py
```

The app listens on **http://localhost:8501** (configured in `.streamlit/config.toml`).

## 4. Production Configuration

Server settings live in `.streamlit/config.toml`:

| Setting | Value |
|---------|-------|
| Port | 8501 |
| Headless | true |
| Usage stats | disabled |

## 5. Automatic Startup

### Windows

Double-click **`start_attendancehub.bat`** or add it to **Task Scheduler**:

1. Open Task Scheduler → Create Basic Task
2. Trigger: **At startup** (or **At log on**)
3. Action: **Start a program** → browse to `start_attendancehub.bat`
4. Finish and enable "Run whether user is logged on or not" if needed

The batch file starts Streamlit in a minimized background window on port 8501.

### Linux (systemd)

1. Copy the project to `/opt/attendancehub`
2. Create a dedicated user: `sudo useradd -r -s /bin/false attendancehub`
3. Set ownership: `sudo chown -R attendancehub:attendancehub /opt/attendancehub`
4. Install the service file:

```bash
sudo cp deploy/attendancehub.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable attendancehub
sudo systemctl start attendancehub
```

5. Check status: `sudo systemctl status attendancehub`

## 6. Internal Network Access

To expose the app on your LAN, set in `.streamlit/config.toml`:

```toml
[server]
address = "0.0.0.0"
```

Then restart the app. Other machines can reach it at `http://<server-ip>:8501`.

## 7. Firewall

Ensure port **8501** is allowed through the host firewall for internal clients.
