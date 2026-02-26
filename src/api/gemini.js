const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export async function processImageWithGemini(base64Image, mimeType, providedModel = null) {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    // Clean up the base64 string if it contains the data URI prefix
    const base64Data = base64Image.split(',')[1] || base64Image;

    let modelOverrideInstruction = '';
    if (providedModel) {
        modelOverrideInstruction = `\nCRITICAL: The user has explicitly stated that the broken product model is "${providedModel}". Use this context strongly to accurately determine the repairability and highly specific Youtube_query.\n`;
    }

    const prompt = `
You are an expert AI triage assistant for discarded household and electronic items.${modelOverrideInstruction}
Analyze the provided image of an item and output a STRICT JSON object answering the following criteria. No markdown blocks, just raw JSON.

Format exactly like this:
{
  "item_name": "Short descriptive name of the item",
  "product_model": "Specific brand and model if identifiable, otherwise 'Generic' (Output '${providedModel || 'Generic'}' if you can't identify to be sure)",
  "primary_materials": ["Material 1", "Material 2"],
  "repairability_score": 7, // Integer 1-10 where 1 is total scrap and 10 is very easy to fix
  "upcycle_ideas": ["Creative idea 1", "Creative idea 2", "Creative idea 3"],
  "Youtube_query": "How to fix [specific issue observed or likely issue] for [product_model or item_name]"
}
`;

    const payload = {
        contents: [
            {
                parts: [
                    { text: prompt },
                    {
                        inline_data: {
                            mime_type: mimeType,
                            data: base64Data
                        }
                    }
                ]
            }
        ],
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
        }
    };

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const textOutput = data.candidates[0].content.parts[0].text;

        return JSON.parse(textOutput);
    } catch (error) {
        console.error("Error in processImageWithGemini:", error);
        throw error;
    }
}

export async function chatWithRepairAssistant(chatHistory, userMessage, contextData) {
    if (!GEMINI_API_KEY) {
        throw new Error("Gemini API key is not configured.");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const systemContext = `
[SYSTEM CONTEXT - You are an expert repair assistant helping the user fix an item.]
Item Details:
- Name: ${contextData.item_name}
- Model: ${contextData.product_model || 'Generic'}
- Primary Materials: ${contextData.primary_materials?.join(', ')}

Please respond to the latest user message. Be concise, actionable, and encouraging.
If the discussion reveals a new specific issue requiring a different tutorial, provide a "refined_youtube_query". Otherwise leave it null.
You MUST respond with a STRICT JSON object:
{
  "reply": "Your helpful response to the user's latest message",
  "refined_youtube_query": "new search query or null"
}
`;

    // Build the contents array
    const contents = [];

    // We append the system context to the first message
    if (chatHistory.length === 0) {
        contents.push({
            role: "user",
            parts: [{ text: systemContext + "\nUser Message: " + userMessage }]
        });
    } else {
        // Rebuild history safely
        chatHistory.forEach(msg => {
            // Role must be "user" or "model"
            const apiRole = msg.role === 'user' ? 'user' : 'model';
            contents.push({
                role: apiRole,
                parts: [{ text: msg.role === 'model' ? JSON.stringify({ reply: msg.text, refined_youtube_query: null }) : msg.text }]
            });
        });
        // Add new message with context reminder
        contents.push({
            role: "user",
            parts: [{ text: "[Context reminder: Keep responding in JSON format as defined earlier]\nUser Message: " + userMessage }]
        });
    }

    const payload = {
        contents: contents,
        generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json"
        }
    };

    try {
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const textOutput = data.candidates[0].content.parts[0].text;
        return JSON.parse(textOutput);
    } catch (error) {
        console.error("Error in chatWithRepairAssistant:", error);
        throw error;
    }
}
