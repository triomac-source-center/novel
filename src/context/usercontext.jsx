"use client";

import { createContext, useContext } from "react";

const UserContext = createContext(null);

export function UserProvider({ user, children }) {
  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
}

export function useUserData() {
  const user = useContext(UserContext);
  if (!user) {
    throw new Error("useUserData must be used inside UserProvider");
  }
  return user;
}
