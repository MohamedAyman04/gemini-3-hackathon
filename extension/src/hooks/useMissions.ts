import { useState, useEffect, useCallback } from 'react';
import type { Mission } from '../types';

const DASHBOARD_URL = import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3000';

interface UseMissionsReturn {
    missions: Mission[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export const useMissions = (): UseMissionsReturn => {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchMissions = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${DASHBOARD_URL}/missions`);
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
        refresh: fetchMissions
    };
};
