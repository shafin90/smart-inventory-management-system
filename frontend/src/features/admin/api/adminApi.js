import httpClient from "../../../shared/api/httpClient";

export const getUsersApi  = (params) => httpClient.get("/admin/users", { params });
export const approveUserApi = (id)  => httpClient.patch(`/admin/users/${id}/approve`);
export const rejectUserApi  = (id)  => httpClient.patch(`/admin/users/${id}/reject`);
export const deleteUserApi  = (id)  => httpClient.delete(`/admin/users/${id}`);
export const changeRoleApi  = (id, role) => httpClient.patch(`/admin/users/${id}/role`, { role });
