import { useSession } from "@/contexts/SessionContext";

/**
 * Returns the persisted session ID from AsyncStorage.
 * Empty string while loading — consumers should check isLoading if needed.
 */
export function useSessionId(): string {
  return useSession().sessionId;
}
