// Formatting utilities for dates, times, and other data

/**
 * Format timestamp to time string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted time string (e.g., "2:30 PM")
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format timestamp to date string
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format timestamp to relative time
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Relative time string (e.g., "2 minutes ago", "Just now")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "Just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return formatDate(timestamp);
}

/**
 * Format timestamp for message display
 * @param timestamp - Unix timestamp in milliseconds
 * @returns Formatted message time (relative for recent, time for today, date for older)
 */
export function formatMessageTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const hours = diff / (1000 * 60 * 60);

  // Less than 1 hour: show relative time
  if (hours < 1) {
    return formatRelativeTime(timestamp);
  }

  // Same day: show time
  const today = new Date().setHours(0, 0, 0, 0);
  if (timestamp >= today) {
    return formatTime(timestamp);
  }

  // Yesterday
  const yesterday = today - 24 * 60 * 60 * 1000;
  if (timestamp >= yesterday) {
    return `Yesterday ${formatTime(timestamp)}`;
  }

  // Older: show date and time
  return `${formatDate(timestamp)} ${formatTime(timestamp)}`;
}

/**
 * Format peer code with spacing for readability
 * @param code - Peer code string
 * @returns Formatted code (e.g., "123 456")
 */
export function formatPeerCode(code: string): string {
  if (!code) return "";
  return code.match(/.{1,3}/g)?.join(" ") || code;
}

/**
 * Format duration in milliseconds to human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration (e.g., "2h 30m", "45s")
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Truncate text with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Format transfer speed
 * @param bytesPerSecond - Transfer speed in bytes per second
 * @returns Formatted speed (e.g., "1.5 MB/s")
 */
export function formatSpeed(bytesPerSecond: number): string {
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let speed = bytesPerSecond;
  let unitIndex = 0;

  while (speed >= 1024 && unitIndex < units.length - 1) {
    speed /= 1024;
    unitIndex++;
  }

  return `${speed.toFixed(2)} ${units[unitIndex]}`;
}
