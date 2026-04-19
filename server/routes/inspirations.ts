/**
 * 灵感存档 API
 * 提供灵感的增删查改功能
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { inspirations, type Inspiration } from "../../drizzle/schema";
import { desc, eq, sql, count } from "drizzle-orm";

export const inspirationsRouter = router({
  /**
   * 创建灵感记录
   */
  create: publicProcedure
    .input(
      z.object({
        word1: z.string().min(1).max(50),
        word2: z.string().min(1).max(50),
        word3: z.string().min(1).max(50),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }

      const [result] = await db.insert(inspirations).values({
        word1: input.word1,
        word2: input.word2,
        word3: input.word3,
        content: input.content,
      });

      return { success: true, id: result.insertId };
    }),

  /**
   * 获取所有灵感记录(按时间倒序)
   */
  list: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const results = await db.select().from(inspirations).orderBy(desc(inspirations.createdAt));
    return results;
  }),

  /**
   * 获取单个灵感记录
   */
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        return null;
      }
      const results = await db.select().from(inspirations).where(eq(inspirations.id, input.id));
      return results[0] || null;
    }),

  /**
   * 更新灵感记录内容
   */
  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }
      await db.update(inspirations).set({ content: input.content }).where(eq(inspirations.id, input.id));
      return { success: true };
    }),

  /**
   * 获取灵感统计数据
   * 使用JS端计算避免MySQL DATE()函数兼容性问题
   */
  stats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return { total: 0, todayCount: 0, weekCount: 0, streakDays: 0 };
    }

    // 获取所有灵感的创建时间
    const allInspirations = await db
      .select({ createdAt: inspirations.createdAt })
      .from(inspirations)
      .orderBy(desc(inspirations.createdAt));

    const total = allInspirations.length;

    if (total === 0) {
      return { total: 0, todayCount: 0, weekCount: 0, streakDays: 0 };
    }

    // 在JS端计算今日、本周、连续天数
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    let todayCount = 0;
    let weekCount = 0;
    const uniqueDays = new Set<string>();

    for (const row of allInspirations) {
      const d = new Date(row.createdAt);
      const dayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      uniqueDays.add(dayStr);

      if (dayStr === todayStr) {
        todayCount++;
      }

      if (d >= sevenDaysAgo) {
        weekCount++;
      }
    }

    // 计算连续天数(从今天往前数连续有记录的天数)
    const sortedDays = Array.from(uniqueDays).sort().reverse();
    let streakDays = 0;

    for (let i = 0; i < sortedDays.length; i++) {
      const expectedDate = new Date(now);
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedStr = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, "0")}-${String(expectedDate.getDate()).padStart(2, "0")}`;

      if (sortedDays[i] === expectedStr) {
        streakDays++;
      } else {
        break;
      }
    }

    return { total, todayCount, weekCount, streakDays };
  }),

  /**
   * 删除灵感记录
   */
  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }
      await db.delete(inspirations).where(eq(inspirations.id, input.id));
      return { success: true };
    }),
});
