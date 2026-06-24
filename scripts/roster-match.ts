export function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let i = 0; i < rows; i += 1) matrix[i][0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}

function closestMatch(input: string, options: string[]): string {
  const normalizedInput = normalizeKey(input);
  let best = options[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const option of options) {
    const normalizedOption = normalizeKey(option);
    if (normalizedOption === normalizedInput) {
      return option;
    }

    const score = levenshtein(normalizedInput, normalizedOption);
    if (score < bestScore) {
      bestScore = score;
      best = option;
    }
  }

  return best;
}

const COMPANY_ALIASES: Record<string, string[]> = {
  "dic beerzone": ["dic - refrigzone", "dic - beerzone", "dic refrigzone"],
  mtei: ["mtei", "mtii", "mtri"],
  "dic eskina": ["dic - eskina", "dic eskina"],
  dsrdc: ["dsrdc"],
};

export function resolveCompanyName(input: string, existingCompanies: string[]): string {
  if (existingCompanies.includes(input)) {
    return input;
  }

  const normalizedInput = normalizeKey(input);
  for (const company of existingCompanies) {
    if (normalizeKey(company) === normalizedInput) {
      return company;
    }
  }

  const aliasCandidates = COMPANY_ALIASES[normalizedInput] ?? [];
  for (const alias of aliasCandidates) {
    const match = existingCompanies.find((company) => normalizeKey(company) === normalizeKey(alias));
    if (match) {
      return match;
    }
  }

  for (const company of existingCompanies) {
    const normalizedCompany = normalizeKey(company);
    if (
      normalizedCompany.includes(normalizedInput) ||
      normalizedInput.includes(normalizedCompany)
    ) {
      return company;
    }
  }

  return closestMatch(input, existingCompanies);
}

const DEPARTMENT_ALIASES: Record<string, string> = {
  "human resources": "Human Resource",
  "human resource": "Human Resource",
  hr: "Human Resource",
};

export function resolveDepartmentName(input: string, existingDepartments: string[]): string {
  const alias = DEPARTMENT_ALIASES[normalizeKey(input)];
  const candidate = alias ?? input;

  if (existingDepartments.includes(candidate)) {
    return candidate;
  }

  for (const department of existingDepartments) {
    if (normalizeKey(department) === normalizeKey(candidate)) {
      return department;
    }
  }

  return closestMatch(candidate, existingDepartments);
}
