import { generateGeminiContent } from "@/lib/gemini.functions";
export type ImageAspectRatio = "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
export type ImageSize = "512px" | "1K" | "2K";

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio?: ImageAspectRatio;
  imageSize?: ImageSize;
  sourceImageBase64?: string;
  sourceImageMimeType?: string;
  model?: "gemini-3.1-flash-lite-image" | "gemini-3.1-flash-image";
}

export interface GenerateImageResult {
  success: boolean;
  imageUrl?: string;
  modelUsed?: string;
  error?: string;
}

/**
 * Generate or edit an image using the latest Google Gemini Image Models (Nano Banana series: gemini-3.1-flash-image / gemini-3.1-flash-lite-image)
 */
export async function generateAdminImage(
  options: GenerateImageOptions,
): Promise<GenerateImageResult> {
  const {
    prompt,
    aspectRatio = "1:1",
    imageSize = "1K",
    sourceImageBase64,
    sourceImageMimeType = "image/png",
    model = "gemini-3.1-flash-image",
  } = options;

  if (!prompt || !prompt.trim()) {
    return { success: false, error: "يرجى إدخال وصف للصورة المطلوب إنشاؤها" };
  }

  try {
    // If editing existing image
    if (sourceImageBase64) {
      // Clean base64 header if present
      const cleanBase64 = sourceImageBase64.includes("base64,")
        ? sourceImageBase64.split("base64,")[1]
        : sourceImageBase64;

      const response = await generateGeminiContent({
        data: {
          purpose: "image",
          model: model || "gemini-3.1-flash-lite-image",
          contents: {
            parts: [
              {
                inlineData: {
                  data: cleanBase64,
                  mimeType: sourceImageMimeType,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts && Array.isArray(parts)) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || "image/png";
            const imageUrl = `data:${mime};base64,${part.inlineData.data}`;
            return {
              success: true,
              imageUrl,
              modelUsed: model || "gemini-3.1-flash-lite-image",
            };
          }
        }
      }
    } else {
      // Direct Text-to-Image generation using gemini-3.1-flash-image
      const response = await generateGeminiContent({
        data: {
          purpose: "image",
          model,
          contents: {
            parts: [
              {
                text: `High quality, commercial supermarket and grocery studio product photo: ${prompt}. Professional lighting, ultra sharp focus, appetizing presentation, 8k resolution style.`,
              },
            ],
          },
          config: {
            imageConfig: {
              aspectRatio,
              imageSize,
            },
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts;
      if (parts && Array.isArray(parts)) {
        for (const part of parts) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || "image/png";
            const imageUrl = `data:${mime};base64,${part.inlineData.data}`;
            return {
              success: true,
              imageUrl,
              modelUsed: model,
            };
          }
        }
      }
    }

    return {
      success: false,
      error: "لم يُرجع Gemini صورة، لذلك لم يتم حفظ أي صورة بديلة.",
    };
  } catch (err: any) {
    console.warn("Gemini image generation API request failed.");
    return {
      success: false,
      error: "فشل توليد الصورة من Gemini؛ لم يتم إنشاء صورة بديلة أو حفظها.",
    };
  }
}
