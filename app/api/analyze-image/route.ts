import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { getModels, addModel } from '@/lib/models-db';

export const dynamic = 'force-dynamic';

const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY, 
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } 
});

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }

    const models = await getModels();
    
    let knownModelsText = "No known models yet.";
    if (models.length > 0) {
        knownModelsText = `Known models:\n${models.map(m => `- ID: ${m.id}, Codename: ${m.codename}, Height: ${m.estimatedHeight}, Description: ${m.visualDescription}`).join('\n')}`;
    }

    const promptText = `
You are an expert fashion AI visual analyst. I will provide you with an image of a model wearing a garment.
Your task is to:
1. Estimate the size of the garment being worn using strictly whole standard sizes (e.g., "XS", "S", "M", "L", "XL"). NEVER use in-between sizes like "S/M" or "M/L". If the size seems to be between two sizes, ALWAYS lean towards the SMALLER size. Provide a concise standardized size label.
2. Determine if the model in the image matches any of our "Known models" listed below based on their facial features, body type, hair color, and overall appearance.
3. If they match a known model, you MUST use their known ID, codename, and known height. Set isNewModel to false.
4. If they DO NOT match any known model, you must estimate their height (e.g., "5'4\"", "5'10\"", "6'1\""). If you are uncertain about the height or it appears to be between estimates, you MUST lean towards the TALLER estimate. Write a brief visual description to help identify them next time, and generate a new memorable codename. Set isNewModel to true.

${knownModelsText}

Return a precise JSON structure exactly matching the schema.
`;

    // Only sending the raw base64 string after the data URI prefix if it exists
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: {
        parts: [
           { text: promptText },
           { inlineData: { mimeType: "image/jpeg", data: base64Data } }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
             isNewModel: { type: Type.BOOLEAN, description: "True if this person does not match any known models." },
             modelId: { type: Type.STRING, description: "The ID of the known model, or a newly generated unique ID (like model_uid_123)." },
             codename: { type: Type.STRING, description: "Codename for this model." },
             estimatedHeight: { type: Type.STRING, description: "The recognized height or new estimated height, leaning taller if unsure (e.g., 5'4\")." },
             garmentSize: { type: Type.STRING, description: "The estimated standard size of the garment (e.g. S, M, L). No in-between sizes." },
             visualDescription: { type: Type.STRING, description: "Brief visual description if new model." }
          },
          required: ["isNewModel", "modelId", "codename", "estimatedHeight", "garmentSize", "visualDescription"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");
    
    const result = JSON.parse(text);

    if (result.isNewModel) {
      await addModel({
        id: result.modelId,
        codename: result.codename,
        estimatedHeight: result.estimatedHeight,
        visualDescription: result.visualDescription || "No description provided."
      });
    }

    return NextResponse.json({
        size: result.garmentSize,
        height: result.estimatedHeight,
        isNewModel: result.isNewModel,
        codename: result.codename,
        modelId: result.modelId
    });

  } catch (error: any) {
    console.error("Error analyzing image:", error);
    return NextResponse.json({ error: error.message || 'Failed to analyze' }, { status: 500 });
  }
}
