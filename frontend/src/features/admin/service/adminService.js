import { getUsersApi, approveUserApi, rejectUserApi, deleteUserApi, changeRoleApi } from "../api/adminApi";

export const getUsers   = async (params) => (await getUsersApi(params)).data;
export const approveUser = async (id)    => (await approveUserApi(id)).data;
export const rejectUser  = async (id)    => (await rejectUserApi(id)).data;
export const deleteUser  = async (id)    => (await deleteUserApi(id)).data;
export const changeRole  = async (id, role) => (await changeRoleApi(id, role)).data;
