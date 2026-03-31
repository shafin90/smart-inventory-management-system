import { listActivitiesApi } from "../api/activityApi";
export const listActivitiesService = async () => (await listActivitiesApi()).data;
