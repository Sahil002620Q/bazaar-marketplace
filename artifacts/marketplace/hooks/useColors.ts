import { useThemeContext } from "@/context/ThemeContext";
import colors from "@/constants/colors";

export function useColors() {
  const { isDark, activeAccentHex } = useThemeContext();
  const basePalette = isDark && "dark" in colors
    ? (colors as any).dark
    : colors.light;
    
  return { 
    ...(basePalette as typeof colors.light), 
    radius: colors.radius as number,
    primary: activeAccentHex,
    tint: activeAccentHex,
  };
}
