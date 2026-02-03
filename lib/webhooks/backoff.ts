import { BASE_RETRY_DELAY_MS } from "./retryConfig";

export function getBackoffDelay(attempt: number) {
    return BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 2);
}
