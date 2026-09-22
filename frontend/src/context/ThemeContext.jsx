import React, { createContext, useContext, useEffect } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Permanently remove dark mode class and localStorage keys
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("theme");
    localStorage.removeItem("pastel_theme_v3_init");
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: "light", toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext) || { theme: "light", toggleTheme: () => {} };
};
