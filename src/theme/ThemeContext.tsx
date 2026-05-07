import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { lightColors, darkColors, Colors } from './colors';

const ThemeContext = createContext<Colors>(lightColors);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useColorScheme();
  const themeSetting = useAppSelector(s => s.settings?.theme ?? 'system');

  let resolved: Colors;
  if (themeSetting === 'dark') {
    resolved = darkColors;
  } else if (themeSetting === 'light') {
    resolved = lightColors;
  } else {
    // 'system'
    resolved = deviceScheme === 'dark' ? darkColors : lightColors;
  }

  return (
    <ThemeContext.Provider value={resolved}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeColors(): Colors {
  return useContext(ThemeContext);
}
