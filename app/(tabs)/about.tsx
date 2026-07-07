/**
 * 关于页面
 * 展示APP名称、版本号、理念介绍、开发者信息和致谢
 * 提供设置和反馈入口
 */

import { ScrollView, View, Text, StyleSheet, Pressable, Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useThemeColors } from "@/hooks/use-theme-colors";

export default function AboutScreen() {
  const c = useThemeColors();
  const router = useRouter();

  const handleCopyQQ = () => {
    if (Platform.OS === "web") {
      navigator.clipboard.writeText("2522507815").then(() => {
        alert("QQ号已复制到剪贴板");
      }).catch(() => {});
    }
  };

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: c.background }}
      >
        {/* APP名称和版本号 */}
        <View style={styles.heroSection}>
          <Text style={[styles.appName, { color: c.foreground }]}>灵 感</Text>
          <Text style={[styles.version, { color: c.muted }]}>Version 1.0.0</Text>
        </View>

        {/* 快捷入口 */}
        <View style={[styles.quickActions, { backgroundColor: c.cardBg, borderColor: c.border }]}>
          <Pressable
            onPress={() => router.push("/settings" as any)}
            style={({ pressed }) => [styles.quickActionItem, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.quickActionIcon}>
              <MaterialIcons name="tune" size={22} color={c.foreground} />
            </View>
            <Text style={[styles.quickActionText, { color: c.foreground }]}>设置</Text>
            <MaterialIcons name="arrow-forward-ios" size={15} color={c.muted} />
          </Pressable>
          <View style={[styles.quickActionDivider, { backgroundColor: c.border }]} />
          <Pressable
            onPress={() => router.push("/feedback" as any)}
            style={({ pressed }) => [styles.quickActionItem, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.quickActionIcon}>
              <MaterialIcons name="chat-bubble-outline" size={21} color={c.foreground} />
            </View>
            <Text style={[styles.quickActionText, { color: c.foreground }]}>意见反馈</Text>
            <MaterialIcons name="arrow-forward-ios" size={15} color={c.muted} />
          </Pressable>
        </View>

        {/* APP理念介绍 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>创意源于随机碰撞</Text>
          <View style={styles.quoteContainer}>
            <View style={[styles.quoteLine, { backgroundColor: c.primary }]} />
            <View style={styles.quoteContent}>
              <Text style={[styles.quoteText, { color: c.isDark ? c.muted : "#5A5A5A" }]}>
                "灵感"APP的核心理念源自软银集团创始人孙正义的"随机组合法"——通过将三个毫不相关的事物随机组合在一起，激发全新的创意联想。孙正义在创业初期，曾用这种方法在一年内产出了超过250个商业创意，其中不乏后来改变世界的想法。
              </Text>
              <Text style={[styles.quoteText, { color: c.isDark ? c.muted : "#5A5A5A", marginTop: 16 }]}>
                我们相信，创造力不是天赋，而是一种可以训练的思维方式。每一次随机组合，都是一次思维的越界旅行。打开"灵感"，给自己5分钟，让三个词带你去从未到过的地方。
              </Text>
            </View>
          </View>
        </View>

        {/* 开发者信息 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: c.foreground }]}>开发者</Text>
          <View style={[styles.infoCard, { backgroundColor: c.cardBg, borderColor: c.border }]}>
            <View style={styles.infoRow}>
              <MaterialIcons name="person-outline" size={18} color={c.primary} />
              <Text style={[styles.infoLabel, { color: c.muted }]}>开发者</Text>
              <Text style={[styles.infoValue, { color: c.foreground }]}>Miracles_Gratitude</Text>
            </View>
            <View style={[styles.infoDivider, { backgroundColor: c.border }]} />
            <Pressable
              onPress={handleCopyQQ}
              style={({ pressed }) => [styles.infoRow, pressed && { opacity: 0.7 }]}
            >
              <MaterialIcons name="chat-bubble-outline" size={18} color={c.primary} />
              <Text style={[styles.infoLabel, { color: c.muted }]}>QQ</Text>
              <Text style={[styles.infoValue, { color: c.foreground }]}>2522507815</Text>
              {Platform.OS === "web" && (
                <MaterialIcons name="content-copy" size={14} color={c.muted} style={{ marginLeft: 8 }} />
              )}
            </Pressable>
          </View>
        </View>

        {/* 致谢 */}
        <View style={styles.thanksSection}>
          <View style={[styles.thanksDivider, { backgroundColor: c.border }]} />
          <Text style={[styles.thanksText, { color: c.muted }]}>
            感谢每一位使用"灵感"的创造者。
          </Text>
          <View style={[styles.thanksDivider, { backgroundColor: c.border }]} />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingHorizontal: 28 },

  heroSection: { alignItems: "center", paddingTop: 60, paddingBottom: 32 },
  appName: { fontSize: 42, fontWeight: "200", letterSpacing: 16 },
  version: { fontSize: 14, marginTop: 12, letterSpacing: 2 },

  quickActions: { borderRadius: 20, marginBottom: 40, borderWidth: 1, overflow: "hidden" },
  quickActionItem: {
    flexDirection: "row", alignItems: "center", minHeight: 64, paddingVertical: 14, paddingHorizontal: 20,
  },
  quickActionIcon: {
    width: 28, height: 36, justifyContent: "center", alignItems: "flex-start",
  },
  quickActionText: { flex: 1, fontSize: 16, marginLeft: 12, fontWeight: "500" },
  quickActionDivider: { height: 1, marginLeft: 60 },

  section: { marginBottom: 36 },
  sectionTitle: { fontSize: 18, fontWeight: "500", letterSpacing: 2, marginBottom: 20 },

  quoteContainer: { flexDirection: "row" },
  quoteLine: { width: 3, borderRadius: 2, marginRight: 16 },
  quoteContent: { flex: 1 },
  quoteText: { fontSize: 15, lineHeight: 26, letterSpacing: 0.3 },

  infoCard: { borderRadius: 14, padding: 20, borderWidth: 1 },
  infoRow: { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  infoLabel: { fontSize: 14, marginLeft: 10, width: 56 },
  infoValue: { fontSize: 15, fontWeight: "400", flex: 1 },
  infoDivider: { height: 1, marginVertical: 14 },

  thanksSection: { alignItems: "center", paddingVertical: 20 },
  thanksDivider: { width: 40, height: 1, marginVertical: 16 },
  thanksText: { fontSize: 14, letterSpacing: 2, textAlign: "center" },
});
