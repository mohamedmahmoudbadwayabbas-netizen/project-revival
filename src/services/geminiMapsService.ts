import { generateGeminiContent } from "@/lib/gemini.functions";
import { DEFAULT_GEMINI_MAPS_MODEL } from "@/lib/gemini-config";

export interface PlaceGroundingResult {
  title?: string;
  uri?: string;
  address?: string;
  reviewSnippet?: string;
}

export interface MapsGroundingResponse {
  answer: string;
  places: PlaceGroundingResult[];
  modelUsed: string;
}

/**
 * Queries Google Maps Grounding via Gemini 3.5 Flash / 3.7 Flash with googleMaps tool
 */
export async function queryGoogleMapsGrounding(
  prompt: string,
  userLocation?: { latitude: number; longitude: number },
): Promise<MapsGroundingResponse> {
  try {
    const configObj: {
      tools: Array<{ googleMaps: Record<string, never> }>;
      toolConfig?: {
        retrievalConfig?: {
          latLng?: { latitude: number; longitude: number };
        };
      };
    } = {
      tools: [{ googleMaps: {} }],
    };

    if (userLocation) {
      configObj.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
          },
        },
      };
    }

    const response = await generateGeminiContent({
      data: {
        purpose: "maps",
        model: DEFAULT_GEMINI_MAPS_MODEL,
        contents: prompt,
        config: configObj,
      },
    });

    const places: PlaceGroundingResult[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;

    if (chunks && Array.isArray(chunks)) {
      for (const chunk of chunks) {
        const mapsObj = (chunk as any).maps;
        if (mapsObj?.uri) {
          places.push({
            title: mapsObj.title || "موقع على خرائط Google",
            uri: mapsObj.uri,
            address: mapsObj.address,
            reviewSnippet: mapsObj.placeAnswerSources?.reviewSnippets?.[0]?.content,
          });
        }
        const webObj = (chunk as any).web;
        if (webObj?.uri && webObj.uri.includes("google.com/maps")) {
          places.push({
            title: webObj.title || "رابط خرائط Google",
            uri: webObj.uri,
          });
        }
      }
    }

    return {
      answer:
        places.length > 0
          ? response.text || "أعادت خرائط Google المواقع الظاهرة أدناه."
          : "لم تُرجع خرائط Google أي موقع موثق لهذا البحث، لذلك لا أستطيع تأكيد موقع أو نطاق توصيل.",
      places,
      modelUsed: DEFAULT_GEMINI_MAPS_MODEL,
    };
  } catch (err) {
    console.warn("Google Maps Grounding API request failed.");
    return {
      answer: "فشل الاتصال بخرائط Google، لذلك لم أتمكن من التحقق من المواقع أو التوصيل.",
      places: [],
      modelUsed: "unavailable",
    };
  }
}
