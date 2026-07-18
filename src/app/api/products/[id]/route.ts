import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { 
  products, 
  productVariants, 
  inventoryItems, 
  inventoryTransactions, 
  orderItems, 
  reviews 
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { authorize } from "@/middleware/auth";

// DELETE /api/products/[id] - Delete a product if it has no sales or inventory history (Admin only)
import { verifySensitiveAction, logAdminAudit } from "@/lib/auth/security";
import { sendMail } from "@/services/email/email.service";
import { getPrivilegedActionEmailTemplate } from "@/services/email/templates/security.template";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authorize(req, "admin");
    if (!auth.authorized) {
      return auth.response!;
    }

    const { id: productId } = await params;

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // 1. Check if the product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // 2. Sensitive Action Re-Authentication Check
    const securityCheck = await verifySensitiveAction(req, auth.user!, "delete_product", productId);
    if (!securityCheck.verified) {
      return securityCheck.errorResponse!;
    }

    // 3. Fetch variants & inventory items associated with this product
    const variantsList = await db.query.productVariants.findMany({
      where: eq(productVariants.productId, productId),
    });
    const variantIds = variantsList.map(v => v.id);

    const inventoryList = variantIds.length > 0
      ? await db.query.inventoryItems.findMany({
          where: inArray(inventoryItems.variantId, variantIds),
        })
      : [];
    const inventoryItemIds = inventoryList.map(inv => inv.id);

    // 4. Perform existence checks for orders, reviews, and inventory transactions
    let blockReason = "";

    // A. Check reviews
    const reviewsExist = await db.query.reviews.findFirst({
      where: eq(reviews.productId, productId),
    });
    if (reviewsExist) {
      blockReason = "This product has customer reviews associated with it.";
    }

    // B. Check order items
    if (!blockReason && variantIds.length > 0) {
      const orderItemsExist = await db.query.orderItems.findFirst({
        where: inArray(orderItems.variantId, variantIds),
      });
      if (orderItemsExist) {
        blockReason = "This product has sales history (associated order items).";
      }
    }

    // C. Check inventory transactions (excluding the auto-generated 0 quantity initial setups if we want,
    // but the requirement says if inventory transactions exist. Let's look for quantity != 0 or any transaction)
    if (!blockReason && inventoryItemIds.length > 0) {
      const transactionsExist = await db.query.inventoryTransactions.findFirst({
        where: inArray(inventoryTransactions.inventoryItemId, inventoryItemIds),
      });
      if (transactionsExist) {
        blockReason = "This product has inventory logs (stock transactions).";
      }
    }

    if (blockReason) {
      return NextResponse.json({
        error: `Cannot delete product: ${blockReason} We recommend archiving this product instead to preserve historical records.`,
      }, { status: 400 });
    }

    // 5. Cascade delete is handled at SQLite DB schema foreign key level
    await db.delete(products).where(eq(products.id, productId));

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const browser = req.headers.get("user-agent") || "Unknown";

    // Write to audit trail
    await logAdminAudit({
      adminId: auth.user!.id,
      adminName: auth.user!.name || auth.user!.phoneNumber,
      action: "delete_product",
      targetUserId: null,
      verificationStatus: "verified",
      ipAddress,
      browser,
    });

    // Send confirmation email
    if (auth.user!.email) {
      const adminEmailHtml = getPrivilegedActionEmailTemplate(
        auth.user!.name || "Administrator",
        "Delete Product",
        product.name || `Product ID: ${productId}`,
        ipAddress,
        browser
      );
      await sendMail({
        to: auth.user!.email,
        subject: `[Security Alert] Successful Privileged Action - Snail Studio`,
        html: adminEmailHtml,
        templateName: "admin_privileged_action",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Product deleted successfully",
    }, { status: 200 });

  } catch (error: any) {
    console.error("DELETE /api/products/[id] error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message || String(error) },
      { status: 500 }
    );
  }
}
