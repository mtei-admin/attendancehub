"""AttendanceHub — internal attendance management system."""

import io
from datetime import date

import pandas as pd
import streamlit as st

import db

ROLES = ("Employee", "Manager", "HR")
REQUEST_TYPES = ("Late", "Absent", "Leave", "Offset")
EMPLOYEE_NAMES = (
    "Maria Santos",
    "Juan Dela Cruz",
    "Ana Reyes",
    "Pedro Garcia",
    "Lisa Fernandez",
    "Mark Villanueva",
    "Grace Tan",
    "Ryan Ocampo",
)

st.set_page_config(
    page_title="AttendanceHub",
    page_icon="📋",
    layout="wide",
)


def _init_session_state() -> None:
    if "role" not in st.session_state:
        st.session_state.role = "Employee"
    if "db_initialized" not in st.session_state:
        st.session_state.db_initialized = False


def _ensure_db() -> None:
    if not st.session_state.db_initialized:
        try:
            db.init_db()
            db.seed_dummy_data()
            st.session_state.db_initialized = True
        except Exception as exc:
            st.error(f"Failed to initialize the database: {exc}")


def _requests_to_dataframe(requests: list[dict]) -> pd.DataFrame:
    if not requests:
        return pd.DataFrame()
    df = pd.DataFrame(requests)
    display_cols = [
        "ref_id",
        "submitted_at",
        "employee_name",
        "request_type",
        "date_of_incident",
        "time_in",
        "ot_hrs",
        "reason",
        "status",
        "approved_by",
        "approved_on",
    ]
    return df[[c for c in display_cols if c in df.columns]]


def render_employee_view() -> None:
    st.header("Submit Attendance Request")
    st.caption("Fill out the form below to log a late arrival, absence, leave, or offset request.")

    with st.form("employee_request_form", clear_on_submit=True):
        col1, col2 = st.columns(2)

        with col1:
            employee_name = st.selectbox("Employee Name", EMPLOYEE_NAMES)
            request_type = st.selectbox("Request Type", REQUEST_TYPES)
            date_of_incident = st.date_input("Date of Incident", value=date.today())

        with col2:
            time_in = st.text_input("Actual Time In", placeholder="e.g. 09:30 AM")
            ot_hrs = st.text_input("OT Hours (for Offset)", placeholder="e.g. 4")

        reason = st.text_area("Reason / Notes", placeholder="Provide a brief explanation…")

        submitted = st.form_submit_button("Submit Request", type="primary", use_container_width=True)

        if submitted:
            if not reason.strip():
                st.warning("Please provide a reason before submitting.")
            else:
                try:
                    ref_id = db.add_request(
                        employee_name=employee_name,
                        request_type=request_type,
                        date_of_incident=date_of_incident,
                        reason=reason.strip(),
                        time_in=time_in.strip() or None,
                        ot_hrs=ot_hrs.strip() or None,
                    )
                    st.success(f"Request **{ref_id}** submitted successfully and is pending manager review.")
                except Exception as exc:
                    st.warning(f"Unable to submit your request. Please try again. ({exc})")


def render_manager_view() -> None:
    st.header("Manager Dashboard")
    st.caption("Review pending requests and take action on employee submissions.")

    try:
        all_requests = db.get_all_requests()
    except Exception as exc:
        st.warning(f"Unable to load requests: {exc}")
        return

    total = len(all_requests)
    pending = sum(1 for r in all_requests if r["status"] == "Pending")
    approved = sum(1 for r in all_requests if r["status"] == "Approved")
    rejected = sum(1 for r in all_requests if r["status"] == "Rejected")

    m1, m2, m3, m4 = st.columns(4)
    m1.metric("Total Requests", total)
    m2.metric("Pending", pending)
    m3.metric("Approved", approved)
    m4.metric("Rejected", rejected)

    st.subheader("All Requests")
    df = _requests_to_dataframe(all_requests)
    if df.empty:
        st.info("No requests found.")
    else:
        st.dataframe(df, use_container_width=True, hide_index=True)

    st.subheader("Review Pending Requests")
    pending_requests = [r for r in all_requests if r["status"] == "Pending"]

    if not pending_requests:
        st.info("No pending requests to review.")
        return

    pending_ids = [r["ref_id"] for r in pending_requests]
    selected_id = st.selectbox("Select Pending Request", pending_ids)

    selected = next(r for r in pending_requests if r["ref_id"] == selected_id)
    with st.expander("Request Details", expanded=True):
        detail_col1, detail_col2 = st.columns(2)
        detail_col1.write(f"**Employee:** {selected['employee_name']}")
        detail_col1.write(f"**Type:** {selected['request_type']}")
        detail_col1.write(f"**Date:** {selected['date_of_incident']}")
        detail_col2.write(f"**Time In:** {selected['time_in'] or '—'}")
        detail_col2.write(f"**OT Hours:** {selected['ot_hrs'] or '—'}")
        st.write(f"**Reason:** {selected['reason']}")

    action_col1, action_col2 = st.columns(2)
    with action_col1:
        if st.button("Approve", type="primary", use_container_width=True):
            try:
                updated = db.update_request_status(selected_id, "Approved", "Carlos Reyes")
                if updated:
                    st.success(f"Request **{selected_id}** approved.")
                    st.rerun()
                else:
                    st.warning("Request could not be updated. It may have already been processed.")
            except Exception as exc:
                st.warning(f"Unable to approve request: {exc}")

    with action_col2:
        if st.button("Reject", use_container_width=True):
            try:
                updated = db.update_request_status(selected_id, "Rejected", "Carlos Reyes")
                if updated:
                    st.warning(f"Request **{selected_id}** rejected.")
                    st.rerun()
                else:
                    st.warning("Request could not be updated. It may have already been processed.")
            except Exception as exc:
                st.warning(f"Unable to reject request: {exc}")


def render_hr_view() -> None:
    st.header("HR Analytics — Approved Records")
    st.caption("Read-only view of approved attendance records for payroll processing.")

    try:
        approved_requests = db.get_approved_requests()
    except Exception as exc:
        st.warning(f"Unable to load approved records: {exc}")
        return

    total_approved = len(approved_requests)
    late_count = sum(1 for r in approved_requests if r["request_type"] == "Late")
    absent_count = sum(1 for r in approved_requests if r["request_type"] == "Absent")
    leave_count = sum(1 for r in approved_requests if r["request_type"] == "Leave")

    h1, h2, h3, h4 = st.columns(4)
    h1.metric("Total Approved", total_approved)
    h2.metric("Late", late_count)
    h3.metric("Absent", absent_count)
    h4.metric("Leave", leave_count)

    df = _requests_to_dataframe(approved_requests)

    st.subheader("Approved Records")
    if df.empty:
        st.info("No approved records to display.")
    else:
        st.dataframe(df, use_container_width=True, hide_index=True)

        csv_buffer = io.StringIO()
        df.to_csv(csv_buffer, index=False)
        st.download_button(
            label="Download CSV for Payroll",
            data=csv_buffer.getvalue(),
            file_name="approved_attendance_records.csv",
            mime="text/csv",
            type="primary",
        )


def main() -> None:
    _init_session_state()
    _ensure_db()

    st.title("AttendanceHub")
    st.caption("Internal Attendance Management System")

    with st.sidebar:
        st.header("Navigation")
        st.session_state.role = st.radio(
            "Select Role",
            ROLES,
            index=ROLES.index(st.session_state.role),
        )
        st.divider()
        st.caption("Switch roles to access different portal views.")

    role = st.session_state.role

    if role == "Employee":
        render_employee_view()
    elif role == "Manager":
        render_manager_view()
    elif role == "HR":
        render_hr_view()


if __name__ == "__main__":
    main()
