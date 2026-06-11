import { neon } from "@neondatabase/serverless";
import { count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { attendanceRequests } from "../src/lib/schema";

const samples = [
  {
    refId: "REQ-001",
    employeeName: "Maria Santos",
    requestType: "Late",
    dateOfIncident: daysAgo(1),
    timeIn: "09:45 AM",
    otHrs: null,
    reason: "Heavy traffic on EDSA due to road construction.",
    status: "Pending",
    approvedBy: null,
    approvedOn: null,
    submittedAt: hoursAgo(2),
  },
  {
    refId: "REQ-002",
    employeeName: "Juan Dela Cruz",
    requestType: "Absent",
    dateOfIncident: daysAgo(3),
    timeIn: null,
    otHrs: null,
    reason: "Medical appointment — attached doctor's note.",
    status: "Approved",
    approvedBy: "Carlos Reyes",
    approvedOn: daysAndHoursAgo(2, 4),
    submittedAt: daysAndHoursAgo(3, 1),
  },
  {
    refId: "REQ-003",
    employeeName: "Ana Reyes",
    requestType: "Leave",
    dateOfIncident: daysAgo(5),
    timeIn: null,
    otHrs: null,
    reason: "Personal leave — family event.",
    status: "Approved",
    approvedBy: "Carlos Reyes",
    approvedOn: daysAgoAt(4),
    submittedAt: daysAgoAt(5),
  },
  {
    refId: "REQ-004",
    employeeName: "Pedro Garcia",
    requestType: "Offset",
    dateOfIncident: daysAgo(2),
    timeIn: null,
    otHrs: "4",
    reason: "Worked Saturday to offset Monday absence.",
    status: "Pending",
    approvedBy: null,
    approvedOn: null,
    submittedAt: daysAndHoursAgo(2, 3),
  },
  {
    refId: "REQ-005",
    employeeName: "Lisa Fernandez",
    requestType: "Late",
    dateOfIncident: daysAgo(7),
    timeIn: "10:15 AM",
    otHrs: null,
    reason: "MRT breakdown caused significant delay.",
    status: "Rejected",
    approvedBy: "Carlos Reyes",
    approvedOn: daysAgoAt(6),
    submittedAt: daysAgoAt(7),
  },
  {
    refId: "REQ-006",
    employeeName: "Mark Villanueva",
    requestType: "Leave",
    dateOfIncident: daysAgo(10),
    timeIn: null,
    otHrs: null,
    reason: "Vacation leave — pre-approved by HR.",
    status: "Approved",
    approvedBy: "Carlos Reyes",
    approvedOn: daysAgoAt(9),
    submittedAt: daysAgoAt(10),
  },
  {
    refId: "REQ-007",
    employeeName: "Grace Tan",
    requestType: "Absent",
    dateOfIncident: daysAgo(4),
    timeIn: null,
    otHrs: null,
    reason: "Flu symptoms — advised to rest at home.",
    status: "Pending",
    approvedBy: null,
    approvedOn: null,
    submittedAt: daysAndHoursAgo(4, 5),
  },
  {
    refId: "REQ-008",
    employeeName: "Ryan Ocampo",
    requestType: "Late",
    dateOfIncident: daysAgo(6),
    timeIn: "09:30 AM",
    otHrs: null,
    reason: "Childcare drop-off took longer than expected.",
    status: "Approved",
    approvedBy: "Carlos Reyes",
    approvedOn: daysAndHoursAgo(5, 2),
    submittedAt: daysAndHoursAgo(6, 1),
  },
];

function daysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function daysAgoAt(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function daysAndHoursAgo(days: number, hours: number): Date {
  return new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000);
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to seed the database.");
  }

  const db = drizzle(neon(url));
  const [existing] = await db.select({ value: count() }).from(attendanceRequests);

  if ((existing?.value ?? 0) > 0) {
    console.log("Database already has records — skipping seed.");
    return;
  }

  await db.insert(attendanceRequests).values(samples);
  console.log(`Seeded ${samples.length} attendance requests.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
