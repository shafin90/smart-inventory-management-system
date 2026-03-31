import {
  createCategoryApi,
  createProductApi,
  deleteProductApi,
  listCategoriesApi,
  listProductsApi,
  restockProductApi,
} from "../api/productApi";

export const listProductsService   = async (params) => (await listProductsApi(params)).data;
export const createProductService  = async (payload) => (await createProductApi(payload)).data;
export const restockProductService = async (id, quantity) => (await restockProductApi(id, quantity)).data;
export const deleteProductService  = async (id) => (await deleteProductApi(id)).data;
export const listCategoriesService = async () => (await listCategoriesApi()).data;
export const createCategoryService = async (name) => (await createCategoryApi(name)).data;
