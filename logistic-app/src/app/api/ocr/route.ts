function parseInvoiceText(text: string) {
  // Split into individual lines and remove empty blank lines
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  let orderNumber = '';
  let phoneNumber = '';
  let companyName = '';
  let deliveryAddress = '';
  let forcedDeliveryDate = '';
  const rightSideColumns: Array<{ rawRow: string; styleMatched: string }> = [];

  // State flags to track where the parser is on the page
  let readingDeliveryInstructions = false;

  // Regex patterns
  const phoneRegex = /(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/;
  const dateRegex = /\b(?:\d{1,2}[-/(]\d{1,2}[-/(]\d{2,4}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 1. Order Number
    if (!orderNumber && /(?:order|invoice|inv)\s*(?:num|\b#|no\.?)?\s*:?\s*(\d+)/i.test(line)) {
      orderNumber = line.match(/(?:order|invoice|inv)\s*(?:num|\b#|no\.?)?\s*:?\s*(\d+)/i)?.[1] || '';
    }

    // 2. Phone Number & Company Name (Company is directly below Phone)
    if (!phoneNumber && phoneRegex.test(line)) {
      phoneNumber = line.match(phoneRegex)?.[0] || '';
      // Grab the very next line as the Company Name, assuming it's under AR Address
      if (i + 1 < lines.length) {
        companyName = lines[i + 1];
      }
    }

    // 3. Trigger Delivery Instructions Block
    if (/delivery instructions/i.test(line)) {
      readingDeliveryInstructions = true;
      continue; // Skip to the next line to start recording
    }

    if (readingDeliveryInstructions) {
      // Stop recording if we hit standard table headers or line items
      if (/qty|item|description|amount|total/i.test(line) || /Caymon|Colonist|Carrara|Berkeley/i.test(line)) {
        readingDeliveryInstructions = false;
      } else {
        // We are inside the delivery instructions block. Look for a date.
        const dateMatch = line.match(dateRegex);
        if (dateMatch) {
          forcedDeliveryDate = dateMatch[0];
        } else {
          // If it is not a date, it is part of the address. Append it cleanly.
          deliveryAddress += (deliveryAddress ? ", " : "") + line;
        }
      }
    }

    // 4. Right Side Columns (Line Items)
    // To grab the entire row accurately across all columns, we lock onto your known inventory styles
    const doorStyles = ['Caymon', 'Colonist', 'Carrara', 'Berkeley'];
    for (const style of doorStyles) {
      if (new RegExp(style, 'i').test(line)) {
        rightSideColumns.push({
          rawRow: line, // Captures the entire horizontal string (Qty, Size, Price, etc.)
          styleMatched: style
        });
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
  };
}