import { listRestockApi, removeRestockApi } from "../api/restockApi";
export const listRestockService = async () => (await listRestockApi()).data;
export const removeRestockService = async (id) => (await removeRestockApi(id)).data;
