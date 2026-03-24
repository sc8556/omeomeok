import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SESSION_KEY = "@date_meal:session_id";

function generateSessionId(): string {
  const rand = Math.random().toString(36).slice(2, 11);
  return `session_${rand}_${Date.now()}`;
}

interface SessionContextValue {
  sessionId: string;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  sessionId: "",
  isLoading: true,
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY)
      .then((stored) => {
        if (stored) {
          setSessionId(stored);
        } else {
          const newId = generateSessionId();
          AsyncStorage.setItem(SESSION_KEY, newId);
          setSessionId(newId);
        }
      })
      .catch(() => {
        // AsyncStorage 실패 시 인메모리 ID로 폴백
        setSessionId(generateSessionId());
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <SessionContext.Provider value={{ sessionId, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  return useContext(SessionContext);
}
