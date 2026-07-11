import type { Dayjs } from "dayjs";

import { parseApiTimestamp } from "@/lib/order-formatters";

export {
  getElapsedMinutes,
  normalizeAssignedMenuName,
  parseApiTimestamp,
} from "@/lib/order-formatters";

export function formatElapsedLabel(now: number, timestamp: string) {
  const start = parseApiTimestamp(timestamp).getTime();
  if (Number.isNaN(start)) return "-";
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  if (seconds < 60) return `${seconds}초 경과`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 경과`;
  return "1시간 +";
}

export function formatDetailTime(timestamp: string) {
  const date = parseApiTimestamp(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatOrderCardTime(timestamp: string) {
  const date = parseApiTimestamp(timestamp);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function getOrderTypeLabel(platform: string) {
  const normalized = platform?.toLowerCase() ?? "";
  if (normalized.includes("delivery") || normalized.includes("배달")) return "배달";
  if (normalized.includes("takeout") || normalized.includes("포장") || normalized.includes("take")) return "포장";
  return "매장";
}

export function formatDeliveryAddress(address: {
  deliveryRoadAddress: string | null;
  deliveryJibunAddress: string | null;
  deliveryAddressDetail: string | null;
}) {
  const baseAddress = address.deliveryRoadAddress?.trim() || address.deliveryJibunAddress?.trim();
  const detail = address.deliveryAddressDetail?.trim();
  if (baseAddress === "***" || detail === "***") return "***";
  if (!baseAddress) return "-";
  return detail ? `${baseAddress} ${detail}` : baseAddress;
}

export function diffMinutesWithinDay(start: Dayjs, end: Dayjs) {
  const startMinutes = start.hour() * 60 + start.minute();
  const endMinutes = end.hour() * 60 + end.minute();
  const diff = endMinutes - startMinutes;
  return diff > 0 ? diff : diff + 24 * 60;
}
