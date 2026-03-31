import { useEffect, useState } from "react";
import { listActivitiesService } from "../service/activityService";

export function useActivity(active) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!active) return;
    listActivitiesService().then(setItems).catch(() => setItems([]));
  }, [active]);
  return items;
}
