import type { CutoffPeriod } from "./cutoff";
import { findCutoffPeriodForDate, getCurrentCutoffPeriod } from "./cutoff";
import type { EmployeeType } from "./constants";
import { requestEmployeeKey } from "./roster";
import type { AttendanceRequest, PayrollCutoffRule } from "./schema";

export type ManagerCutoffRange = "current" | "all";

export type ManagerEmployeeGroup = {
  employeeName: string;
  requests: AttendanceRequest[];
};

export type ManagerCutoffGroup = {
  periodId: string;
  periodLabel: string;
  employees: ManagerEmployeeGroup[];
  requestCount: number;
};

export type ManagerPayrollSection = {
  payrollGroup: EmployeeType;
  periodSubtitle: string;
  cutoffGroups: ManagerCutoffGroup[];
  requestCount: number;
};

export type ManagerGroupedRequests = {
  sections: ManagerPayrollSection[];
  totalShown: number;
};

const PAYROLL_GROUPS: EmployeeType[] = ["Rank & File", "Confi"];

function resolvePayrollGroup(
  request: AttendanceRequest,
  employeeTypeLookup: Record<string, string>,
): EmployeeType | null {
  const employeeType = employeeTypeLookup[requestEmployeeKey(request)];
  if (employeeType === "Confi" || employeeType === "Rank & File") {
    return employeeType;
  }
  return null;
}

function buildRuleMap(rules: PayrollCutoffRule[]): Map<EmployeeType, PayrollCutoffRule> {
  const map = new Map<EmployeeType, PayrollCutoffRule>();
  for (const rule of rules) {
    if (rule.employeeType === "Confi" || rule.employeeType === "Rank & File") {
      map.set(rule.employeeType, rule);
    }
  }
  return map;
}

function groupByEmployee(requests: AttendanceRequest[]): ManagerEmployeeGroup[] {
  const byEmployee = new Map<string, AttendanceRequest[]>();

  for (const request of requests) {
    const existing = byEmployee.get(request.employeeName) ?? [];
    existing.push(request);
    byEmployee.set(request.employeeName, existing);
  }

  return Array.from(byEmployee.entries())
    .map(([employeeName, employeeRequests]) => ({
      employeeName,
      requests: employeeRequests.sort((left, right) =>
        right.dateOfIncident.localeCompare(left.dateOfIncident),
      ),
    }))
    .sort((left, right) => left.employeeName.localeCompare(right.employeeName));
}

function buildCutoffGroups(
  items: { request: AttendanceRequest; period: CutoffPeriod }[],
): ManagerCutoffGroup[] {
  const byPeriod = new Map<string, { period: CutoffPeriod; requests: AttendanceRequest[] }>();

  for (const item of items) {
    const existing = byPeriod.get(item.period.id) ?? {
      period: item.period,
      requests: [],
    };
    existing.requests.push(item.request);
    byPeriod.set(item.period.id, existing);
  }

  return Array.from(byPeriod.values())
    .map(({ period, requests }) => {
      const employees = groupByEmployee(requests);
      return {
        periodId: period.id,
        periodLabel: period.label,
        employees,
        requestCount: requests.length,
      };
    })
    .sort((left, right) => right.periodId.localeCompare(left.periodId));
}

export function buildManagerGroupedRequests(
  requests: AttendanceRequest[],
  range: ManagerCutoffRange,
  rules: PayrollCutoffRule[],
  employeeTypeLookup: Record<string, string>,
): ManagerGroupedRequests {
  const ruleMap = buildRuleMap(rules);
  const currentByGroup = new Map<EmployeeType, CutoffPeriod | null>();

  for (const payrollGroup of PAYROLL_GROUPS) {
    const rule = ruleMap.get(payrollGroup);
    currentByGroup.set(payrollGroup, rule ? getCurrentCutoffPeriod(rule) : null);
  }

  const assigned = requests.flatMap((request) => {
    const payrollGroup = resolvePayrollGroup(request, employeeTypeLookup);
    if (!payrollGroup || !request.dateOfIncident) {
      return [];
    }

    const rule = ruleMap.get(payrollGroup);
    if (!rule) {
      return [];
    }

    const period = findCutoffPeriodForDate(rule, request.dateOfIncident);
    if (!period) {
      return [];
    }

    return [{ request, payrollGroup, period }];
  });

  const filtered =
    range === "current"
      ? assigned.filter((item) => {
          const current = currentByGroup.get(item.payrollGroup);
          return current?.id === item.period.id;
        })
      : assigned;

  const sections = PAYROLL_GROUPS.flatMap((payrollGroup) => {
    const groupItems = filtered.filter((item) => item.payrollGroup === payrollGroup);
    if (groupItems.length === 0) {
      return [];
    }

    const current = currentByGroup.get(payrollGroup);
    const cutoffGroups = buildCutoffGroups(groupItems);
    const periodSubtitle =
      range === "current" && current
        ? current.label
        : `${cutoffGroups.length} cutoff period${cutoffGroups.length === 1 ? "" : "s"}`;

    return [
      {
        payrollGroup,
        periodSubtitle,
        cutoffGroups,
        requestCount: groupItems.length,
      },
    ];
  });

  return {
    sections,
    totalShown: filtered.length,
  };
}

export function filterRequestsForManagerRange(
  requests: AttendanceRequest[],
  range: ManagerCutoffRange,
  rules: PayrollCutoffRule[],
  employeeTypeLookup: Record<string, string>,
): AttendanceRequest[] {
  const grouped = buildManagerGroupedRequests(requests, range, rules, employeeTypeLookup);
  return grouped.sections.flatMap((section) =>
    section.cutoffGroups.flatMap((cutoffGroup) =>
      cutoffGroup.employees.flatMap((employee) => employee.requests),
    ),
  );
}

export function parseManagerCutoffRange(value?: string): ManagerCutoffRange {
  return value === "all" ? "all" : "current";
}
