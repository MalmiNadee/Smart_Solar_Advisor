import { useState, useEffect, useRef } from "react";
import { usersAPI } from "@/lib/api";

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at?: string;
}

export const useUsers = (pollInterval: number = 10000) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUsers = async () => {
    try {
      const data = await usersAPI.getAll();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to fetch users");
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Set up polling for updates
    intervalRef.current = setInterval(fetchUsers, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [pollInterval]);

  return { users, loading, error, refetch: fetchUsers };
};

