/**
 * Converts a year integer to Indian Financial Year format
 * @param year - The year as an integer (e.g., 2024)
 * @returns Indian FY format string (e.g., "FY'24-25")
 */
export function convertToIndianFY(year: number): string {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    throw new Error(`Invalid year: ${year}. Year must be an integer between 1900 and 2100`);
  }

  const currentYearLastTwoDigits = year % 100;
  const nextYear = year + 1;
  const nextYearLastTwoDigits = nextYear % 100;

  return `FY'${currentYearLastTwoDigits}-${String(nextYearLastTwoDigits).padStart(2, "0")}`;
}

/**
 * Parses an Indian FY string back to the starting year
 * @param fyString - Indian FY format string (e.g., "FY'24-25")
 * @returns The year as an integer (e.g., 2024)
 */
export function parseIndianFY(fyString: string): number {
  const match = fyString.match(/FY'(\d{2})-(\d{2})/);
  if (!match) {
    throw new Error(`Invalid FY format: ${fyString}. Expected format: FY'YY-YY`);
  }

  const startYear = parseInt(match[1], 10);
  
  // Determine the century (assume 19xx for years > 50, 20xx for years <= 50)
  const century = startYear > 50 ? 1900 : 2000;
  return century + startYear;
}

/**
 * Formats FY for display in reports and downloads
 * @param year - The year as an integer
 * @returns Formatted display string
 */
export function formatFYForDisplay(year: number): string {
  return convertToIndianFY(year);
}

/**
 * Gets current financial year
 * @returns Current Indian FY (e.g., "FY'25-26" if current year is 2025)
 */
export function getCurrentFY(): string {
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Indian FY runs from April to March
  // If current month is before April (Jan-Mar), the FY is previous year to current year
  // If current month is from April onwards, the FY is current year to next year
  const month = now.getMonth(); // 0-indexed, so Jan=0, Mar=2, Apr=3
  
  if (month < 3) { // Before April
    return convertToIndianFY(currentYear - 1);
  } else { // April onwards
    return convertToIndianFY(currentYear);
  }
}
