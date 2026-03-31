import { useEffect, useState } from "react";
import { getDashboardService } from "../service/dashboardService";

export function useDashboard(enabled) {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!enabled) return;
    getDashboardService().then(setData).catch(() => setData(null));
  }, [enabled]);

  return data;
}
