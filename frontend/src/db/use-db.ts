import { useEffect, useState } from "react";

import { getDb } from "@/src/db/schema";

/**
 * Ensures the SQLite database is initialized before children render.
 * Returns null while booting, then renders children.
 */
export function useDbReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    getDb().then(() => setReady(true));
  }, []);
  return ready;
}
