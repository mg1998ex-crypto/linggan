/**
 * 关于页面
 * 展示APP名称、版本号、理念介绍、开发者信息和致谢
 */

import { ScrollView, View, Text, StyleSheet, Linking, Pressable, Platform } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScreenContainer } from "@/components/screen-container";

export default function AboutScreen() {
  const handleCopyQQ = () => {
    if (Platform.OS === "web") {
      navigator.clipboard.writeText("2522507815").then(() => {
        alert("QQ号已复制到剪贴板");
      }).catch(() => {});
    }
  };

  return (
    <ScreenContainer className="bg-background">
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* APP名称和版本号 */}
        <View style={styles.heroSection}>
          <Text style={styles.appName}>灵 感</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        {/* APP理念介绍 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>创意源于随机碰撞</Text>
          <View style={styles.quoteContainer}>
            <View style={styles.quoteLine} />
            <View style={styles.quoteContent}>
              <Text style={styles.quoteText}>
                "灵感"APP的核心理念源自软银集团创始人孙正义的"随机组合法"——通过将三个毫不相关的事物随机组合在一起，激发全新的创意联想。孙正义在创业初期，曾用这种方法在一年内产出了超过250个商业创意，其中不乏后来改变世界的想法。
              </Text>
              <Text style={[styles.quoteText, { marginTop: 16 }]}>
                我们相信，创造力不是天赋，而是一种可以训练的思维方式。每一次随机组合，都是一次思维的越界旅行。打开"灵感"，给自己5分钟，让三个词带你去从未到过的地方。
              </Text>
            </View>
          </View>
        </View>

        {/* 开发者信息 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>开发者</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialIcons name="person-outline" size={18} color="#F5A623" />
              <Text style={styles.infoLabel}>开发者</Text>
              <Text style={styles.infoValue}>Miracles_Gratitude</Text>
            </View>
            <View style={styles.infoDivider} />
            <Pressable
              onPress={handleCopyQQ}
              style={({ pressed }) => [styles.infoRow, pressed && { opacity: 0.7 }]}
            >
              <MaterialIcons name="chat-bubble-outline" size={18} color="#F5A623" />
              <Text style={styles.infoLabel}>QQ</Text>
              <Text style={styles.infoValue}>2522507815</Text>
              {Platform.OS === "web" && (
                <MaterialIcons name="content-copy" size={14} color="#B0B0B5" style={{ marginLeft: 8 }} />
              )}
            </Pressable>
          </View>
        </View>

        {/* 致谢 */}
        <View style={styles.thanksSection}>
          <View style={styles.thanksDivider} />
          <Text style={styles.thanksText}>
            感谢每一位使用"灵感"的创造者。
          </Text>
          <View style={styles.thanksDivider} />
        </View>

        {/* 底部留白 */}
        <View style={{ height: 60 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1, paddingHorizontal: 28,
  },

  /* 英雄区域 */
  heroSection: {
    alignItems: "center", paddingTop: 60, paddingBottom: 48,
  },
  appName: {
    fontSize: 42, fontWeight: "200", color: "#2D2D2D", letterSpacing: 16,
  },
  version: {
    fontSize: 14, color: "#B0B0B5", marginTop: 12, letterSpacing: 2,
  },

  /* 通用段落 */
  section: {
    marginBottom: 36,
  },
  sectionTitle: {
    fontSize: 18, fontWeight: "500", color: "#2D2D2D", letterSpacing: 2,
    marginBottom: 20,
  },

  /* 引用样式 */
  quoteContainer: {
    flexDirection: "row",
  },
  quoteLine: {
    width: 3, backgroundColor: "#F5A623", borderRadius: 2,
    marginRight: 16,
  },
  quoteContent: {
    flex: 1,
  },
  quoteText: {
    fontSize: 15, lineHeight: 26, color: "#5A5A5A", letterSpacing: 0.3,
  },

  /* 信息卡片 */
  infoCard: {
    backgroundColor: "#FFFFFF", borderRadius: 14, padding: 20,
    borderWidth: 1, borderColor: "#F0EDE8",
  },
  infoRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14, color: "#8E8E93", marginLeft: 10, width: 56,
  },
  infoValue: {
    fontSize: 15, color: "#2D2D2D", fontWeight: "400", flex: 1,
  },
  infoDivider: {
    height: 1, backgroundColor: "#F0EDE8", marginVertical: 14,
  },

  /* 致谢 */
  thanksSection: {
    alignItems: "center", paddingVertical: 20,
  },
  thanksDivider: {
    width: 40, height: 1, backgroundColor: "#F0EDE8", marginVertical: 16,
  },
  thanksText: {
    fontSize: 14, color: "#B0B0B5", letterSpacing: 2, textAlign: "center",
  },
});
