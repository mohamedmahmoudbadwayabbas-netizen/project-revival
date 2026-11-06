/* =========================================================================
   GOOGLE MAPS CONFIGURATION & GRACEFUL RUNTIME FALLBACKS
   Safely resolves browser keys and provides instant static/offline fallbacks.
   ========================================================================= */

export const getGoogleMapsBrowserKey = (): string => {
  try {
    return (
      import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY ||
      import.meta.env.VITE_GOOGLE_MAPS_API_KEY ||
      ""
    );
  } catch {}
  return "";
};

export const getGoogleMapsTrackingId = (): string => {
  try {
    return (
      import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID ||
      import.meta.env.VITE_GOOGLE_MAPS_CHANNEL ||
      ""
    );
  } catch {}
  return "";
};

export const isGoogleMapsKeyConfigured = (): boolean => {
  const key = getGoogleMapsBrowserKey();
  return Boolean(key && key.trim().length > 5 && !key.includes("placeholder"));
};

export interface QuickLocationPreset {
  id: string;
  name: string;
  district: string;
  city: string;
  lat: number;
  lng: number;
  estimatedDeliveryTime: string;
  deliveryFee: number;
}

export const POPULAR_EGYPT_DISTRICTS: QuickLocationPreset[] = [
  {
    id: "loc-dokki",
    name: "فرع الدقي والمهندسين الرئيسي",
    district: "الدقي",
    city: "الجيزة",
    lat: 30.0385,
    lng: 31.2118,
    estimatedDeliveryTime: "25 - 35 دقيقة ⚡",
    deliveryFee: 15,
  },
  {
    id: "loc-mohandessin",
    name: "شارع جامعة الدول وميدان لبنان",
    district: "المهندسين",
    city: "الجيزة",
    lat: 30.0558,
    lng: 31.2001,
    estimatedDeliveryTime: "30 - 45 دقيقة ⚡",
    deliveryFee: 20,
  },
  {
    id: "loc-zamalek",
    name: "جزيرة الزمالك وشارع 26 يوليو",
    district: "الزمالك",
    city: "القاهرة",
    lat: 30.0617,
    lng: 31.2198,
    estimatedDeliveryTime: "30 - 40 دقيقة ⚡",
    deliveryFee: 25,
  },
  {
    id: "loc-maadi",
    name: "المعادي القديمة ودجلة",
    district: "المعادي",
    city: "القاهرة",
    lat: 29.9602,
    lng: 31.2569,
    estimatedDeliveryTime: "40 - 55 دقيقة 🚗",
    deliveryFee: 30,
  },
  {
    id: "loc-tagamoa",
    name: "التجمع الخامس وشارع التسعين",
    district: "القاهرة الجديدة",
    city: "القاهرة",
    lat: 30.0131,
    lng: 31.4289,
    estimatedDeliveryTime: "45 - 60 دقيقة 🚗",
    deliveryFee: 35,
  },
  {
    id: "loc-nasr-city",
    name: "مدينة نصر ومكرم عبيد وعباس العقاد",
    district: "مدينة نصر",
    city: "القاهرة",
    lat: 30.0561,
    lng: 31.3444,
    estimatedDeliveryTime: "35 - 50 دقيقة 🚗",
    deliveryFee: 25,
  },
  {
    id: "loc-heliopolis",
    name: "مصر الجديدة وروكسي والكوربة",
    district: "مصر الجديدة",
    city: "القاهرة",
    lat: 30.0911,
    lng: 31.3235,
    estimatedDeliveryTime: "35 - 50 دقيقة 🚗",
    deliveryFee: 25,
  },
  {
    id: "loc-zayed",
    name: "الشيخ زايد وبيفرلي هيلز ومول العرب",
    district: "الشيخ زايد",
    city: "الجيزة",
    lat: 30.0489,
    lng: 30.9856,
    estimatedDeliveryTime: "50 - 70 دقيقة 🚚",
    deliveryFee: 40,
  },
];
