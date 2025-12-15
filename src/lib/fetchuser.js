import { getAuth } from "@clerk/nextjs/server";

export async function fetchUserData() {
  const { userId } = getAuth();
  if (!userId) return null;

  const res = await fetch(`https://novel-server-cdcp.onrender.com/api/${userId}`);
  if (!res.ok) throw new Error("Failed to fetch user data");

  const data = await res.json();
  return data;
}
