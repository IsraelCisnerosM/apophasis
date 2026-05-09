import { GoogleGenAI } from '@google/genai'

export interface DrawingInterpretation {
  description: string // Detailed description of what was drawn
  searchType: 'music' | 'video' | 'book' | 'product' | 'place' | 'generic' // Type of search to perform
  searchQuery: string // Query to use for searching
  additionalContext?: Record<string, string | number> // Extra params for specific search types
}

/**
 * Send a drawing image to Gemini Vision to interpret what was drawn
 * and return a structured interpretation for searching/rendering.
 */
export async function interpretDrawing(
  imageBase64: string,
  userDescription?: string,
): Promise<DrawingInterpretation> {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

  if (!GEMINI_API_KEY) {
    console.error('VITE_GEMINI_API_KEY is not set')
    return {
      description: userDescription || 'Drawing submitted',
      searchType: 'generic',
      searchQuery: userDescription || 'drawing',
    }
  }

  try {
    const client = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    })

    const prompt = userDescription
      ? `The user drew something and wrote: "${userDescription}". Based on the drawing and their note, interpret what they're trying to find or create. Respond in JSON format with: { "description": "detailed description", "searchType": "music|video|book|product|place|generic", "searchQuery": "search query", "additionalContext": {...} }`
      : `Interpret this drawing. What is the user trying to represent or find? Respond in JSON format with: { "description": "detailed description of the drawing", "searchType": "music|video|book|product|place|generic", "searchQuery": "search query", "additionalContext": {...} }`

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: imageBase64.replace(/^data:image\/png;base64,/, ''),
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    })

    const textContent = response.candidates?.[0]?.content?.parts?.[0]
    if (!textContent || !('text' in textContent)) {
      throw new Error('No text response from Gemini Vision')
    }

    const text = textContent.text
    // Extract JSON from response (in case it has extra text)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from response')
    }

    const parsed = JSON.parse(jsonMatch[0]) as DrawingInterpretation

    return {
      description: parsed.description || 'A drawing',
      searchType: parsed.searchType || 'generic',
      searchQuery: parsed.searchQuery || 'drawing',
      additionalContext: parsed.additionalContext,
    }
  } catch (error) {
    console.error('Error interpreting drawing:', error)
    // Fallback: use user description or generic interpretation
    return {
      description: userDescription || 'User drew something',
      searchType: 'generic',
      searchQuery: userDescription || 'drawing',
    }
  }
}

/**
 * Builds tool call parameters based on drawing interpretation
 * to directly trigger the appropriate search or surface rendering.
 */
export function buildToolCallFromInterpretation(
  interpretation: DrawingInterpretation,
): {
  toolName: string
  params: Record<string, unknown>
} {
  switch (interpretation.searchType) {
    case 'music':
      return {
        toolName: 'search_music',
        params: {
          fragment: interpretation.searchQuery,
          ...interpretation.additionalContext,
        },
      }

    case 'video':
      return {
        toolName: 'search_video',
        params: {
          query: interpretation.searchQuery,
          ...interpretation.additionalContext,
        },
      }

    case 'book':
      return {
        toolName: 'search_books',
        params: {
          query: interpretation.searchQuery,
          ...interpretation.additionalContext,
        },
      }

    case 'product':
      return {
        toolName: 'search_products',
        params: {
          query: interpretation.searchQuery,
          ...interpretation.additionalContext,
        },
      }

    case 'place':
      return {
        toolName: 'search_places_google',
        params: {
          query: interpretation.searchQuery,
          ...interpretation.additionalContext,
        },
      }

    case 'generic':
    default:
      // Return a render_surface to let Lucy ask clarifying questions
      return {
        toolName: 'render_surface',
        params: {
          surface_id: 'drawing_clarify',
          components: [
            {
              id: 'root',
              component: 'Column',
              children: ['title', 'description', 'question'],
            },
            {
              id: 'title',
              component: 'Text',
              text: 'You drew: ' + interpretation.description,
            },
            {
              id: 'description',
              component: 'Text',
              text: 'What are you looking for?',
              styleLevel: 'secondary',
            },
            {
              id: 'question',
              component: 'ChoicePicker',
              options: [
                { label: 'Music / Song', value: 'music' },
                { label: 'Video / Movie', value: 'video' },
                { label: 'Book', value: 'book' },
                { label: 'Product', value: 'product' },
                { label: 'Place', value: 'place' },
              ],
            },
          ],
          data_model: {
            '/title': interpretation.description,
            '/selection': '',
          },
        },
      }
  }
}
