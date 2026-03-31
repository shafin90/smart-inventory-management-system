import { makeAutoObservable } from "mobx";

class RootStore {
  token = localStorage.getItem("token");
  user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  })();
  activeTab = "dashboard";

  constructor() {
    makeAutoObservable(this);
  }

  setAuth(token, user) {
    this.token = token;
    this.user = user;
    this.activeTab = "dashboard";
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
  }

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  setTab(tab) {
    this.activeTab = tab;
  }

  get isAdmin() {
    return this.user?.role === "admin";
  }
}

const rootStore = new RootStore();
export default rootStore;
