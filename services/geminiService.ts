import { GoogleGenAI, Type } from "@google/genai";
import type { DynamicQuestion, Product, Role, Industry, Profile, DeliveryMethod, ProductType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export interface IFilters {
    role: Role | null;
    industry: Industry | null;
    profile: Profile | null;
    deliveryMethod: DeliveryMethod | null;
    productType: ProductType | null;
}

export async function generateDynamicQuestions(filters: IFilters, products: Product[]): Promise<DynamicQuestion[]> {
  const productListString = products.map(p => p.productName).join(', ');
  const { role, industry, profile, deliveryMethod, productType } = filters;

  const filterDescriptions = [];
  if (role) filterDescriptions.push(`their role is "${role}"`);
  if (industry) filterDescriptions.push(`they operate in the "${industry}" industry`);
  if (profile) filterDescriptions.push(`their company profile is "${profile}"`);
  if (deliveryMethod) filterDescriptions.push(`they are interested in a "${deliveryMethod}" delivery model`);
  if (productType) filterDescriptions.push(`they are looking for a "${productType}" product type`);
  
  const promptContext = filterDescriptions.length > 0 
    ? `A potential lead has been filtered based on the following criteria: ${filterDescriptions.join(', ')}.`
    : "A potential lead has shown interest in our solutions.";

  const prompt = `
You are an expert Business Development Representative (BDR) at ION, a commodity management software company.
${promptContext}
Based on this, we have recommended the following ION products to them: ${productListString}.

Your task is to generate 3 short, insightful questions to further qualify this lead. These questions will help our BDR team understand the lead's primary needs and pain points.

Guidelines for the questions:
- **Be Concise:** Keep the question text under 20 words.
- **Be Insightful:** Focus on challenges, goals, or current system limitations. Avoid generic questions.
- **Multi-select:** Frame questions so the user can select multiple options (e.g., "What are your biggest challenges with...?").
- **Relevance:** Ensure questions are directly relevant to the user's profile and the suggested products.
- **No Redundancy:** Do not ask about company size or team size if that information is already provided.

Provide 3-4 distinct, easy-to-understand options for each question.
Return ONLY a JSON object that matches the provided schema. Do not include any other text or markdown.
`;

  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        questionText: {
          type: Type.STRING,
          description: "The text of the question to ask the user."
        },
        options: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          },
          description: "A list of 3 to 4 potential answers."
        }
      },
      required: ["questionText", "options"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });
    
    const jsonText = response.text.trim();
    const parsedJson = JSON.parse(jsonText);
    return parsedJson as DynamicQuestion[];

  } catch (error) {
    console.error("Error generating dynamic questions:", error);
    // Return an empty array or some default questions in case of an error
    return [];
  }
}