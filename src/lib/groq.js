const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.2-11b-vision-preview'

const SYSTEM_PROMPT = `You are an expert medical invoice OCR system for Indian pharmaceutical distributors.
Extract all medicine/drug line items from the bill image and return ONLY a valid JSON array.
No markdown, no explanation — pure JSON only.

Each item must have these exact keys:
{
  "medicine_name": "Full medicine name with strength (e.g. Paracetamol 650mg)",
  "batch_no": "Batch number (e.g. PAR65023A) or null",
  "expiry_date": "MM/YYYY format (e.g. 05/2026) or null",
  "qty": "Quantity as number (e.g. 100)",
  "mrp": "MRP price per unit as number (e.g. 2.50)",
  "gst_percent": "GST percentage as number (e.g. 12) or null"
}

Rules:
- Extract ALL line items from the invoice
- Convert expiry dates to MM/YYYY format
- If a field is unclear, use null
- qty must be integer
- mrp must be decimal number
- Return ONLY the JSON array, nothing else`

/**
 * Convert image file to base64 string
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Send image to Groq Vision API for OCR extraction
 * @param {string} base64Image - base64 encoded image
 * @param {string} mimeType - image mime type
 * @returns {Promise<Array>} - extracted medicine items
 */
export async function scanBillWithGroq(base64Image, mimeType = 'image/jpeg') {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured. Add VITE_GROQ_API_KEY to .env')
  }

  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2048,
      temperature: 0.1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
              }
            },
            {
              type: 'text',
              text: SYSTEM_PROMPT
            }
          ]
        }
      ]
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `Groq API error: ${response.status}`)
  }

  const data = await response.json()
  const raw = data.choices?.[0]?.message?.content || ''

  // Parse JSON — strip any accidental markdown fences
  const clean = raw
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/gi, '')
    .trim()

  const parsed = JSON.parse(clean)

  if (!Array.isArray(parsed)) {
    throw new Error('Groq returned unexpected format')
  }

  // Validate and sanitize each item
  return parsed.map(item => ({
    medicine_name: String(item.medicine_name || '').trim(),
    batch_no: item.batch_no ? String(item.batch_no).trim() : null,
    expiry_date: item.expiry_date ? parseExpiryToISO(item.expiry_date) : null,
    expiry_display: item.expiry_date || null,
    qty: parseInt(item.qty) || 0,
    mrp: parseFloat(item.mrp) || 0,
    gst_percent: item.gst_percent ? parseFloat(item.gst_percent) : null,
  }))
}

/**
 * Convert MM/YYYY to YYYY-MM-DD (last day of month) for Supabase
 */
function parseExpiryToISO(expiryStr) {
  if (!expiryStr) return null
  const parts = String(expiryStr).split('/')
  if (parts.length === 2) {
    const [month, year] = parts
    // Last day of month
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
    return `${year}-${month.padStart(2, '0')}-${lastDay}`
  }
  return null
}

/**
 * Demo fallback data when no API key is set
 */
export function getDemoScanResult() {
  return [
    { medicine_name: 'Paracetamol 650mg', batch_no: 'PAR65023A', expiry_date: '2026-05-31', expiry_display: '05/2026', qty: 500, mrp: 2.50, gst_percent: 12 },
    { medicine_name: 'Amoxicillin 500mg', batch_no: 'AMX50024B', expiry_date: '2025-09-30', expiry_display: '09/2025', qty: 200, mrp: 8.75, gst_percent: 12 },
    { medicine_name: 'Pantoprazole 40mg', batch_no: 'PANT4024E', expiry_date: '2026-11-30', expiry_display: '11/2026', qty: 300, mrp: 5.20, gst_percent: 5 },
  ]
}
