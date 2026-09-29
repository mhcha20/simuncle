import { z } from "zod";
import { eq, desc, sql, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { referralCodes, referralCommissions, users } from "../../drizzle/schema";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Validate a user-supplied referral code string */
const codeSchema = z
  .string()
  .min(3, "推薦碼最少 3 個字元")
  .max(20, "推薦碼最多 20 個字元")
  .regex(/^[A-Za-z0-9_-]+$/, "推薦碼只可包含英文字母、數字、底線或連字號")
  .transform((s) => s.toUpperCase());

/** Generate a random default code from the user's name */
function generateDefaultCode(name: string | null): string {
  const base = (name ?? "USER")
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base || "USER"}${suffix}`;
}

// ─── router ──────────────────────────────────────────────────────────────────

export const referralRouter = router({
  /** Get (or auto-create) the current user's referral code */
  getMyCode: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
    const [existing] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.userId, ctx.user.id))
      .limit(1);

    if (existing) return existing;

    // Auto-create a default code
    const code = generateDefaultCode(ctx.user.name);
    const [result] = await db
      .insert(referralCodes)
      .values({
        userId: ctx.user.id,
        code,
        discountPct: 10,
        commissionPct: 10,
        isActive: true,
      })
      .$returningId();

    const [created] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.id, result.id))
      .limit(1);
    return created;
  }),

  /** Update the current user's referral code (user-customisable) */
  setCode: protectedProcedure
    .input(z.object({ code: codeSchema }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      // Check uniqueness (exclude own code)
      const [conflict] = await db
        .select({ id: referralCodes.id, userId: referralCodes.userId })
        .from(referralCodes)
        .where(eq(referralCodes.code, input.code))
        .limit(1);

      if (conflict && conflict.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "此推薦碼已被使用，請選擇其他推薦碼",
        });
      }

      // Upsert
      const [existing] = await db
        .select({ id: referralCodes.id })
        .from(referralCodes)
        .where(eq(referralCodes.userId, ctx.user.id))
        .limit(1);

      if (existing) {
        await db
          .update(referralCodes)
          .set({ code: input.code })
          .where(eq(referralCodes.id, existing.id));
      } else {
        await db.insert(referralCodes).values({
          userId: ctx.user.id,
          code: input.code,
          discountPct: 10,
          commissionPct: 10,
          isActive: true,
        });
      }

      return { success: true, code: input.code };
    }),

  /** Stats: total referrals, total commission, pending commission */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

    const [codeRow] = await db
      .select({ id: referralCodes.id })
      .from(referralCodes)
      .where(eq(referralCodes.userId, ctx.user.id))
      .limit(1);

    if (!codeRow) {
      return { totalReferrals: 0, totalCommissionHkd: 0, pendingCommissionHkd: 0 };
    }

    const [stats] = await db
      .select({
        totalReferrals: sql<number>`COUNT(*)`,
        totalCommissionHkd: sql<number>`COALESCE(SUM(commission_hkd), 0)`,
        pendingCommissionHkd: sql<number>`COALESCE(SUM(CASE WHEN commission_status = 'pending' THEN commission_hkd ELSE 0 END), 0)`,
      })
      .from(referralCommissions)
      .where(eq(referralCommissions.referrerId, ctx.user.id));

    return {
      totalReferrals: Number(stats?.totalReferrals ?? 0),
      totalCommissionHkd: Number(stats?.totalCommissionHkd ?? 0),
      pendingCommissionHkd: Number(stats?.pendingCommissionHkd ?? 0),
    };
  }),

  /** List the current user's commission records */
  getMyCommissions: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20), offset: z.number().default(0) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const rows = await db
        .select({
          id: referralCommissions.id,
          orderAmountHkd: referralCommissions.orderAmountHkd,
          commissionHkd: referralCommissions.commissionHkd,
          status: referralCommissions.status,
          paidAt: referralCommissions.paidAt,
          createdAt: referralCommissions.createdAt,
          refereeOrderId: referralCommissions.refereeOrderId,
        })
        .from(referralCommissions)
        .where(eq(referralCommissions.referrerId, ctx.user.id))
        .orderBy(desc(referralCommissions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return rows;
    }),

  // ─── Admin procedures ────────────────────────────────────────────────────

  /** Admin: list all commissions with referrer info */
  adminList: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().default(0),
        status: z.enum(["pending", "paid", "cancelled", "all"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      const conditions =
        input.status !== "all"
          ? [eq(referralCommissions.status, input.status as "pending" | "paid" | "cancelled")]
          : [];

      const rows = await db
        .select({
          id: referralCommissions.id,
          referrerId: referralCommissions.referrerId,
          refereeOrderId: referralCommissions.refereeOrderId,
          orderAmountHkd: referralCommissions.orderAmountHkd,
          commissionHkd: referralCommissions.commissionHkd,
          status: referralCommissions.status,
          paidAt: referralCommissions.paidAt,
          createdAt: referralCommissions.createdAt,
          referrerName: users.name,
          referrerEmail: users.email,
          referralCode: referralCodes.code,
        })
        .from(referralCommissions)
        .leftJoin(users, eq(referralCommissions.referrerId, users.id))
        .leftJoin(referralCodes, eq(referralCommissions.referralCodeId, referralCodes.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(referralCommissions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countRow] = await db
        .select({ total: sql<number>`COUNT(*)` })
        .from(referralCommissions)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return { rows, total: Number(countRow?.total ?? 0) };
    }),

  /** Admin: mark a commission as paid */
  adminMarkPaid: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      await db
        .update(referralCommissions)
        .set({ status: "paid", paidAt: new Date() })
        .where(
          and(
            eq(referralCommissions.id, input.id),
            eq(referralCommissions.status, "pending")
          )
        );
      return { success: true };
    }),

  /** Admin: list all referral codes with user info */
  adminListCodes: adminProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
    const rows = await db
      .select({
        id: referralCodes.id,
        code: referralCodes.code,
        userId: referralCodes.userId,
        isActive: referralCodes.isActive,
        discountPct: referralCodes.discountPct,
        commissionPct: referralCodes.commissionPct,
        createdAt: referralCodes.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(referralCodes)
      .leftJoin(users, eq(referralCodes.userId, users.id))
      .orderBy(desc(referralCodes.createdAt));

    return rows;
  }),

  /** Public: validate a referral code and return discount info */
  validate: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const [row] = await db
        .select({
          id: referralCodes.id,
          code: referralCodes.code,
          discountPct: referralCodes.discountPct,
          isActive: referralCodes.isActive,
        })
        .from(referralCodes)
        .where(eq(referralCodes.code, input.code.toUpperCase()))
        .limit(1);

      if (!row || !row.isActive) {
        return { valid: false, discountPct: 0 };
      }
      return { valid: true, discountPct: row.discountPct, codeId: row.id };
    }),
});
