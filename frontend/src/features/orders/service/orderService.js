import { createOrderApi, listOrdersApi, updateOrderStatusApi } from "../api/orderApi";
export const createOrderService      = async (payload) => (await createOrderApi(payload)).data;
export const listOrdersService       = async (params)  => (await listOrdersApi(params)).data;
export const updateOrderStatusService = async (id, status) => (await updateOrderStatusApi(id, status)).data;
