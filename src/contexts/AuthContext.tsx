import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axios from "axios";

export type UserRole = "admin" | "medecin" | "infirmier" | "pharmacien" | "secretaire";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name?: string, role?: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  activeStudy: string | null;
  setActiveStudy: (studyId: string | null) => void;
  activeIntervention: boolean;
  setActiveIntervention: (completed: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const normalizeRole = (role?: string): UserRole => {
  const raw = String(role ?? "").trim().toLowerCase();
  if (["admin"].includes(raw)) return "admin";
  if (["medecin", "médecin", "physician", "doctor"].includes(raw)) return "medecin";
  if (["infirmier", "nurse"].includes(raw)) return "infirmier";
  if (["pharmacien", "pharmacist", "pharmacy", "pharmacie"].includes(raw)) return "pharmacien";
  if (["secretaire", "secrétaire", "secretary"].includes(raw)) return "secretaire";
  return "medecin";
};

const getUserPayload = (data: any) => {
  if (!data || typeof data !== "object") return null;
  if (data.user) return data.user;
  if (data.data?.user) return data.data.user;
  if (data.result?.user) return data.result.user;
  if (data.data && typeof data.data === "object" && (data.data.role || data.data.email || data.data.id)) return data.data;
  if (data.result && typeof data.result === "object" && (data.result.role || data.result.email || data.result.id)) return data.result;
  return data;
};

const getRoleValue = (user: any, rootData: any) => {
  return (
    user?.role ??
    user?.roleName ??
    user?.Role ??
    user?.roles?.[0] ??
    user?.type ??
    rootData?.role ??
    rootData?.Role ??
    rootData?.roleName
  );
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("cathlab-user");
    return saved ? JSON.parse(saved) : null;
  });

  const [activeStudy, setActiveStudy] = useState<string | null>(null);
  const [activeIntervention, setActiveIntervention] = useState(false);

  // ✅ INTERCEPTOR UNIQUE (gestion token propre)
  useEffect(() => {
    const interceptor = axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("cathlab-token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    });

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, []);

  // LOGIN
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await axios.post("http://localhost:5106/api/Account/login", {
        email,
        password,
      });

      const token = res.data.token || res.data.accessToken;
      if (!token) return false;
      localStorage.setItem("cathlab-token", token);

      const payload = res.data;
      const rawUser = getUserPayload(payload);
      const role = normalizeRole(getRoleValue(rawUser, payload));

      const userData: User = {
        id: String(rawUser?.id ?? rawUser?.userId ?? payload?.userId ?? payload?.id ?? "1"),
        email: rawUser?.email ?? rawUser?.username ?? payload?.email ?? email,
        name: rawUser?.name ?? rawUser?.firstName ?? rawUser?.fullName ?? email.split("@")[0],
        role,
        avatar: rawUser?.avatar ?? rawUser?.picture,
      };

      setUser(userData);
      localStorage.setItem("cathlab-user", JSON.stringify(userData));

      return true;
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  // REGISTER
  const register = async (
    email: string,
    password: string,
    name?: string,
    role?: string
  ): Promise<boolean> => {
    try {
      await axios.post("http://localhost:5106/api/Account/register", {
        email,
        password,
        name: name || email.split("@")[0],
        role: role || "medecin",
      });

      return true;
    } catch (error) {
      console.error("Register error:", error);
      return false;
    }
  };

  // LOGOUT
  const logout = () => {
    setUser(null);
    setActiveStudy(null);
    setActiveIntervention(false);

    localStorage.removeItem("cathlab-user");
    localStorage.removeItem("cathlab-token");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        activeStudy,
        setActiveStudy,
        activeIntervention,
        setActiveIntervention,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};