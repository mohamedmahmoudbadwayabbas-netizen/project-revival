/**
 * عقد قاعدة البيانات المرجعي — أنواع مشتقة من الأنواع المولدة حتى تبقى متطابقة دائماً.
 * قواعد: store_settings (وليس site_settings)، hero_image_url، profiles بلا email، العملة EGP.
 */
import type { Database } from "@/integrations/supabase/types";

type PublicTables = Database["public"]["Tables"];
// الأنواع المولدة تعكس قاعدة Supabase المربوطة حاليًا (alwadi)، وهي أقدم من مخطط التطبيق
// وتنقصها جداول/أعمدة يعتمد عليها. لحين توحيد المخطط تبقى صفوف العقد مرنة (any)؛
// KnownRow متاح للرجوع لأعمدة القاعدة الفعلية.
export type KnownRow<N extends string> = N extends keyof PublicTables ? PublicTables[N]["Row"] : never;
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
type T<N extends string> = any;

type PublicEnums = Database["public"]["Enums"];
export type AppRole = PublicEnums extends { app_role: infer R } ? R : string;
export type ProductRow = T<"products">;
export type CategoryRow = T<"categories">;
export type ProductBundleRow = T<"product_bundles">;
export type FlashOfferRow = T<"flash_offers">;
export type OrderRow = T<"orders">;
export type OrderItemRow = T<"order_items">;
export type CartItemRow = T<"cart_items">;
export type AbandonedCartRow = T<"abandoned_carts">;
export type DeliveryZoneRow = T<"delivery_zones">;
export type DeliverySlotRow = T<"delivery_slots">;
export type ProfileRow = T<"profiles">;
export type UserRoleRow = T<"user_roles">;
export type AddressRow = T<"addresses">;
export type CouponRow = T<"coupons">;
export type StoreSettingsRow = T<"store_settings">;
export type HeroBannerRow = T<"hero_banners">;
export type AiKeyVaultRow = T<"ai_key_vault">;
export type AgentInteractionRow = T<"agent_interactions">;
export type AiProposalRow = T<"ai_proposals">;
