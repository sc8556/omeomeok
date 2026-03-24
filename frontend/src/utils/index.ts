export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Extracts distance text from a reason string produced by the backend.
 * e.g. "Highly rated, 1.2 km away" → "1.2 km"
 *      "Top-rated, 794 m away"     → "794 m"
 * Returns null if no distance token is found.
 */
export function extractDistance(reason: string): string | null {
  const match = reason.match(/(\d+(?:\.\d+)?)\s*(km|m)\s+away/i);
  if (!match) return null;
  return `${match[1]} ${match[2]}`;
}

/**
 * Returns a color string for a match score (0–100).
 * 80–100 → green, 60–79 → amber, below 60 → gray
 */
export function scoreColor(score: number): string {
  if (score >= 80) return "#10B981"; // green
  if (score >= 60) return "#F59E0B"; // amber
  return "#9CA3AF";                  // gray
}

/**
 * Formats a date string into a Korean section header.
 * - Today     → "오늘"
 * - Yesterday → "어제"
 * - This year → "3월 20일 (목)"
 * - Other     → "2025년 12월 25일"
 */
export function formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();

  const toDay = (d: Date) => d.toISOString().slice(0, 10);
  const today = toDay(now);
  const yesterday = toDay(new Date(now.getTime() - 86400000));
  const target = toDay(date);

  if (target === today) return "오늘";
  if (target === yesterday) return "어제";

  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dow = days[date.getDay()];

  if (date.getFullYear() === now.getFullYear()) {
    return `${month}월 ${day}일 (${dow})`;
  }
  return `${date.getFullYear()}년 ${month}월 ${day}일`;
}

/**
 * Groups RecommendationItems by calendar date (newest first).
 * Returns an array of { title, date, data } sections for SectionList.
 */
export function groupItemsByDate<T extends { created_at: string }>(
  items: T[]
): Array<{ title: string; date: string; data: T[] }> {
  const map = new Map<string, T[]>();

  for (const item of items) {
    const dateKey = new Date(item.created_at).toISOString().slice(0, 10);
    if (!map.has(dateKey)) map.set(dateKey, []);
    map.get(dateKey)!.push(item);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // 최신 날짜 먼저
    .map(([date, data]) => ({
      title: formatDateHeader(date),
      date,
      data,
    }));
}
