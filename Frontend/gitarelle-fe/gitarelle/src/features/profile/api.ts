import { apiJson } from "../../shared/api";
import type { User } from "../auth/api";

export type NameCount = { name: string; count: number };
export type TrekRecord = { id: number; title: string; date: string | null; value: number };

// Statistiche del diario (distanze e dislivelli solo dai trek con gpx)
export type Stats = {
  totalTreks: number;
  treksWithGpx: number;
  treksWithPoint: number;
  totalDistanceKm: number;
  totalElevationGainM: number;
  averageDistanceKm: number | null;
  firstTrekDate: string | null;
  lastTrekDate: string | null;
  byYear: { year: number; treks: number; distanceKm: number }[];
  byMonth: number[]; // 12 valori, gennaio → dicembre
  topCompanions: NameCount[];
  topFolders: NameCount[];
  longestTrek: TrekRecord | null;
  biggestClimb: TrekRecord | null;
  totalFolders: number;
  totalWishes: number;
};

export const updateProfile = (firstName: string, lastName: string) =>
  apiJson<User>("/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName }),
  });

export function uploadAvatar(image: Blob) {
  const formData = new FormData();
  formData.append("file", image, "avatar.jpg");
  return apiJson<User>("/profile/avatar", { method: "PUT", body: formData });
}

export const deleteAvatar = () => apiJson<User>("/profile/avatar", { method: "DELETE" });

export const fetchStats = () => apiJson<Stats>("/profile/stats");
