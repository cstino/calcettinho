import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    message: "Backend API funziona! (Pages Router)",
    timestamp: new Date().toISOString(),
    method: req.method,
    env: {
      hasAirtableKey: !!process.env.AIRTABLE_API_KEY,
      hasBaseId: !!process.env.AIRTABLE_BASE_ID
    }
  })
} 