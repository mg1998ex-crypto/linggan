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
   */
  stats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return { total: 0, todayCount: 0, weekCount: 0, streakDays: 0 };
    }

    // 总数
    const totalResult = await db.select({ count: count() }).from(inspirations);
    const total = totalResult[0]?.count || 0;

    // 今日数量
    const todayResult = await db.select({ count: count() }).from(inspirations)
      .where(sql`DATE(${inspirations.createdAt}) = CURDATE()`);
    const todayCount = todayResult[0]?.count || 0;

    // 本周数量
    const weekResult = await db.select({ count: count() }).from(inspirations)
      .where(sql`${inspirations.createdAt} >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`);
    const weekCount = weekResult[0]?.count || 0;

    // 连续天数(从今天往前数连续有记录的天数)
    const daysResult = await db.select({
      day: sql<string>`DATE(${inspirations.createdAt})`,
    }).from(inspirations)
      .groupBy(sql`DATE(${inspirations.createdAt})`)
      .orderBy(desc(sql`DATE(${inspirations.createdAt})`));

    let streakDays = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < daysResult.length; i++) {
      const dayStr = daysResult[i].day;
      const dayDate = new Date(dayStr);
      dayDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      expectedDate.setHours(0, 0, 0, 0);

      if (dayDate.getTime() === expectedDate.getTime()) {
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
