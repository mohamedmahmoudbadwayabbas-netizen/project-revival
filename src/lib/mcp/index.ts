import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search-products";
import getProduct from "./tools/get-product";
import listCategories from "./tools/list-categories";
import listMyOrders from "./tools/list-my-orders";

// Use the direct Supabase host as issuer (never the .lovable.cloud proxy).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "al-wadi-al-akhdar-mcp",
  title: "سوبرماركت الوادي الأخضر — MCP",
  version: "0.1.0",
  instructions:
    "Tools for the Al-Wadi Al-Akhdar Supermarket (سوبرماركت الوادي الأخضر) online grocery store. Use search_products / list_categories / get_product to browse the catalog. Signed-in users can view list_my_orders.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProducts, getProduct, listCategories, listMyOrders],
});
