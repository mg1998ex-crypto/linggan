/**
 * 灵感存档 API
 * 提供灵感的增删查改功能
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { inspirations, type Inspiration } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";

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
