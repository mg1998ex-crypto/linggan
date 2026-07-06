/** 设置页面：首发版仅保留本地外观设置，不收集任何第三方 API Key。 */

import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenContainer } from "@/components/screen-container";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { useThemeManager, type AppearanceMode } from "@/lib/theme-context";

const APPEARANCE_OPTIONS: { value: AppearanceMode; label: string; icon: string }[] = [
  { value: "system", label: "跟随系统", icon: "brightness-auto" },
  { value: "light", label: "浅色模式", icon: "light-mode" },
  { value: "dark", label: "深色模式", icon: "dark-mode" },
];

export default function SettingsScreen() {
  const router = useRouter();
  const c = useThemeColors();
  const { appearanceMode, setAppearanceMode } = useThemeManager();

  const handleAppearanceChange = (mode: AppearanceMode) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAppearanceMode(mode);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: c.background }]}>
        <View style={styles.navbar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.navButton, pressed && { opacity: 0.5 }]}
            hitSlop={12}
          >
            <MaterialIcons name="arrow-back" size={24} color={c.foreground} />
          </Pressable>
          <Text style={[styles.navTitle, { color: c.foreground }]}>设置</Text>
          <View style={{ width: 32 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>外观模式</Text>
            <View style={[styles.card, { backgroundColor: c.cardBg, borderColor: c.border }]}>
              {APPEARANCE_OPTIONS.map((option, index) => (
                <View key={option.value}>
                  {index > 0 && <View style={[styles.divider, { backgroundColor: c.border }]} />}
                  <Pressable
                    onPress={() => handleAppearanceChange(option.value)}
                    style={({ pressed }) => [styles.optionRow, pressed && { opacity: 0.7 }]}
                  >
                    <MaterialIcons name={option.icon as any} size={20} color={c.primary} />
                    <Text style={[styles.optionLabel, { color: c.foreground }]}>{option.label}</Text>
                    {appearanceMode === option.value && (
                      <MaterialIcons name="check" size={20} color={c.primary} />
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: c.accentLight, borderColor: c.border }]}>
            <MaterialIcons name="auto-awesome" size={20} color={c.primary} />
            <View style={styles.infoText}>
              <Text style={[styles.infoTitle, { color: c.foreground }]}>使用你自己的 AI</Text>
              <Text style={[styles.infoBody, { color: c.muted }]}>灵感不会索取 API Key。保存创意后，可将专属分析提示词发送到你已经在使用的 AI 应用。</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },
  navButton: { padding: 4 },
  navTitle: { fontSize: 17, fontWeight: "600", letterSpacing: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 20 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 14, fontWeight: "600", letterSpacing: 1, marginBottom: 12, marginLeft: 4 },
  card: { borderRadius: 14, padding: 16, borderWidth: 1 },
  divider: { height: 1, marginVertical: 2 },
  optionRow: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, gap: 12 },
  optionLabel: { fontSize: 15, flex: 1 },
  infoCard: { flexDirection: "row", gap: 12, borderRadius: 14, borderWidth: 1, padding: 16 },
  infoText: { flex: 1 },
  infoTitle: { fontSize: 15, fontWeight: "600", marginBottom: 6 },
  infoBody: { fontSize: 13, lineHeight: 20 },
});
