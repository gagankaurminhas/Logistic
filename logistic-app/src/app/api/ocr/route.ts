import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as Blob;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 1. Prepare data for OCR.space API
    const ocrFormData = new FormData();
    ocrFormData.append('file', file);
    ocrFormData.append('language', 'eng');
    ocrFormData.append('isOverlayRequired', 'false');
    ocrFormData.append('FileType', '.Auto');
    ocrFormData.append('scale', 'true'); // Improves accuracy for printed invoices

    // Use the free community key
    const apiKey = process.env.OCR_SPACE_API_KEY || 'K87439268888957'; 

    const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'apikey': apiKey },
      body: ocrFormData,
    });

    const ocrData = await ocrResponse.json();

    if (ocrData.IsErroredOnProcessing) {
      return NextResponse.json({ error: ocrData.ErrorMessage }, { status: 500 });
    }

    const parsedText = ocrData.ParsedResults?.[0]?.ParsedText || '';

    // 2. Extract specific logistics fields using state-based parsing
    const logisticsData = parseInvoiceText(parsedText);

    return NextResponse.json({ success: true, data: logisticsData });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

function parseInvoiceText(text: string) {
  // Split into individual lines and remove empty blank lines
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let orderNumber = '';
  let phoneNumber = '';
  let companyName = '';
  let deliveryAddress = '';
  let forcedDeliveryDate = '';
  const rightSideColumns: Array<{ rawRow: string; styleMatched: string }> = [];

  let readingDeliveryInstructions = false;

  const phoneRegex = /(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;
  const dateRegex = /\b(?:\d{1,2}[-/(]\d{1,2}[-/(]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Order Number
    if (!orderNumber && /(?:order|invoice|inv)\s*(?:num|\b#|no\.?)?\s*:?\s*(\d+)/i.test(line)) {
      orderNumber = line.match(/(?:order|invoice|inv)\s*(?:num|\b#|no\.?)?\s*:?\s*(\d+)/i)?.[1] || '';
    }

    // 2. Phone Number & Company Name
    if (!phoneNumber && phoneRegex.test(line)) {
      phoneNumber = line.match(phoneRegex)?.[0] || '';
      if (i + 1 < lines.length) {
        companyName = lines[i + 1];
      }
    }

    // 3. Trigger Delivery Instructions Block
    if (/delivery instructions/i.test(line)) {
      readingDeliveryInstructions = true;
      continue; 
    }

    if (readingDeliveryInstructions) {
      // Stop recording if we hit standard table headers or line items
      if (/qty|item|description|amount|total|product/i.test(line) || /Caymon|Colonist|Carrara|Berkeley|Weiser|Schlage|MDF/i.test(line)) {
        readingDeliveryInstructions = false;
      } else {
        const dateMatch = line.match(dateRegex);
        if (dateMatch) {
          forcedDeliveryDate = dateMatch[0];
        } else if (!/DEL-/i.test(line)) {
          deliveryAddress += (deliveryAddress ? ", " : "") + line;
        }
      }
    }

    // 4. Right Side Columns (Line Items)
    const productKeywords = ['Caymon', 'Colonist', 'Carrara', 'Berkeley', 'Weiser', 'Schlage', 'MDF', 'Baseboard', 'Casing'];
    for (const keyword of productKeywords) {
      if (new RegExp(keyword, 'i').test(line)) {
        rightSideColumns.push({
          rawRow: line,
          styleMatched: keyword
        });
        break; // Stop checking keywords for this line once one matches
      }
    }
  }

  return {
    orderNumber,
    companyName,
    phoneNumber,
    deliveryAddress,
    forcedDeliveryDate,
    rightSideColumns,
    rawTextPreview: text.substring(0, 500)
  }
}