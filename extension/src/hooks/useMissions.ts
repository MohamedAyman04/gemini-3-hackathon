import { useState, useEffect, useCallback } from "react";
import type { Mission } from "../types";
import { REST_API_URL } from "../config";
import { getExtensionSessionId } from "../utils/cookie";

const DASHBOARD_URL = REST_API_URL;

interface UseMissionsReturn {
  missions: Mission[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createMission: (
    name: string,
    context: string,
    url: string,
  ) => Promise<Mission>;
}

export const useMissions = (): UseMissionsReturn => {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sessionId = await getExtensionSessionId();
      const headers: HeadersInit = sessionId ? { "x-session-id": sessionId } : {};

      const response = await fetch(`${DASHBOARD_URL}/missions`, {
        credentials: "include",
        headers,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch missions: ${response.statusText}`);
      }
      const data = await response.json();
      setMissions(data);
    } catch (err: any) {
      console.error("Error fetching missions:", err);
      setError(err.message || "Failed to load missions");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  return {
    missions,
    isLoading,
    error,
    refresh: fetchMissions,
    createMission: async (name: string, context: string, url: string) => {
      try {
        const sessionId = await getExtensionSessionId();
        const headers: HeadersInit = {
          "Content-Type": "application/json",
          ...(sessionId ? { "x-session-id": sessionId } : {})
        };

        const response = await fetch(`${DASHBOARD_URL}/missions`, {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ name, context, url, happyPath: [] }),
        });
        if (!response.ok) throw new Error("Failed to create mission");
        const newMission = await response.json();
        setMissions((prev) => [newMission, ...prev]);
        return newMission;
      } catch (e) {
        console.error(e);
        throw e;
      }
    },
  };
};
