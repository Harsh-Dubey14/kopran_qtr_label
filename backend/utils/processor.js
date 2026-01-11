// utils/processor.js
const { toWords } = require("../utils/numberToWords");

function processItems(itemsRaw, pricingData) {
  const items = itemsRaw.map((item) => {
    const itemPricing = pricingData.filter(
      (p) => p.BillingDocumentItem === item.BillingDocumentItem
    );
    console.log("🔍 Processing Item:", item);
    let base = 0,
      igst = 0,
      cgst = 0,
      sgst = 0;

    for (const p of itemPricing) {
      const amt = parseFloat(p.ConditionAmount || 0);
      switch (p.ConditionType) {
        case "ZPR0":
        case "ZVAL":
          base += amt;
          break;
        case "JIIG":
        case "JOIG":
          igst += amt;
          break;
        case "JICG":
          cgst += amt;
          break;
        case "JISG":
          sgst += amt;
          break;
      }
    }

    const qty = parseFloat(item.BillingQuantity || 0);
    const rate = qty !== 0 ? base / qty : 0;

    return {
      description: item.BillingDocumentItemText,
      qty,
      rate: rate.toFixed(2),
      amount: base.toFixed(2),
      hsn: item?.MaterialGroup || "NA",
      tax: {
        igst,
        cgst,
        sgst,
        igstRate: igst ? `${((igst / base) * 100).toFixed(2)}%` : null,
        cgstRate: cgst ? `${((cgst / base) * 100).toFixed(2)}%` : null,
        sgstRate: sgst ? `${((sgst / base) * 100).toFixed(2)}%` : null,
      },
    };
  });

  const totalBase = items.reduce((sum, i) => sum + parseFloat(i.amount), 0);

  return {
    items,
    totals: {
      base: totalBase,
      cgst: 0,
      sgst: 0,
      igst: 0,
      grandTotal: totalBase, // will be updated later
    },
  };
}

function buildTaxSummary(items) {
  const taxSummaryMap = {};

  console.log("🔍 Starting Tax Summary Build...");
  console.log("📦 Input Items:", items);

  items.forEach((item, index) => {
    const hsn = item.hsn || "NA";
    const amount = parseFloat(item.amount || 0);
    const { igst, cgst, sgst, igstRate, cgstRate, sgstRate } = item.tax;

    if (!taxSummaryMap[hsn]) {
      taxSummaryMap[hsn] = {
        hsn,
        taxableAmount: 0,
        igst: 0,
        cgst: 0,
        sgst: 0,
        igstRate: null,
        cgstRate: null,
        sgstRate: null,
      };
    }

    taxSummaryMap[hsn].taxableAmount += amount;
    taxSummaryMap[hsn].igst += igst;
    taxSummaryMap[hsn].cgst += cgst;
    taxSummaryMap[hsn].sgst += sgst;
    taxSummaryMap[hsn].igstRate = igstRate;
    taxSummaryMap[hsn].cgstRate = cgstRate;
    taxSummaryMap[hsn].sgstRate = sgstRate;

    console.log(`📊 Updated Summary for HSN ${hsn}`, taxSummaryMap[hsn]);
  });

  const summaryArray = Object.values(taxSummaryMap).map((entry) => ({
    hsn: entry.hsn,
    taxableAmount: entry.taxableAmount.toFixed(2),
    igst: entry.igst.toFixed(2),
    cgst: entry.cgst.toFixed(2),
    sgst: entry.sgst.toFixed(2),
    igstRate: entry.igstRate,
    cgstRate: entry.cgstRate,
    sgstRate: entry.sgstRate,
    totalTaxAmount: (entry.igst + entry.cgst + entry.sgst).toFixed(2),
  }));

  console.log("✅ Final Tax Summary:", summaryArray);
  return summaryArray;
}

function buildResponse({
  bill,
  formattedDate,
  irnData,
  partner,
  shipTo,
  items,
  taxSummary,
  totals,
}) {
  const addr = partner?.to_BusinessPartnerAddress?.results?.[0];
  const gstin = partner?.to_BusinessPartnerTax?.results?.find(
    (t) => t.BPTaxType === "IN3"
  )?.BPTaxNumber;
  const pan = partner?.BusinessPartnerExternalID || "";
  const shipAddr = shipTo?.to_BusinessPartnerAddress?.results?.[0];
  const shipGstin = shipTo?.to_BusinessPartnerTax?.results?.find(
    (t) => t.BPTaxType === "IN1"
  )?.BPTaxNumber;

  // Derive IGST total from tax summary for consistency
  const totalIGSTFromSummary = taxSummary.reduce(
    (sum, entry) => sum + parseFloat(entry.igst || 0),
    0
  );

  totals.igst = totalIGSTFromSummary;
  totals.grandTotal = totals.base + totals.cgst + totals.sgst + totals.igst;

  return {
    document: {
      type: "TAX INVOICE",
      title: "INVOICE",
      number: bill.BillingDocument,
      date: formattedDate,
      numberDate: `${bill.BillingDocument} Dt.${bill.BillingDocumentDate}`,
      gstin: gstin || null,
      currency: bill.TransactionCurrency || null,
      irn: irnData.IRN || null,
      ackNo: irnData.AckNo || null,
      ackDate: irnData.AckDate || null,
      eInvoice: !!irnData.IRN,
    },
    seller: {
      name: "MERIT POLYMERS PRIVATE LIMITED",
      address:
        "Survey No - 370/1/2, Vapi - Kachigam Road, Village Kachigam, Daman",
      gstin: "26AAOCM3634M1ZZ",
      state: "Dadra & Nagar Haveli and Daman & Diu",
      stateCode: "26",
      email: "sales@meritpolymers.com",
      pan: "AAOCM3634M",
      bankDetails: {
        accountHolder: "Kopran Packing Slips Prints Private Limited",
        bank: "Kotak Mahindra Bank (India)",
        accountNumber: "7945133213",
        branchIFSC: "BORIVALI & KKBK0000653",
      },
    },
    buyer: {
      name:
        partner?.BusinessPartnerName || partner?.OrganizationBPName1 || null,
      address: {
        street: addr?.StreetName || null,
        city: addr?.CityName || null,
        region: addr?.Region || null,
        postalCode: addr?.PostalCode || null,
        country: addr?.Country || null,
      },
      gstin: gstin || null,
      pan: pan || null,
      placeOfSupply: addr?.Region || null,
      contactPerson: null,
      contact: null,
      email: null,
    },
    consignee: {
      name: shipTo?.BusinessPartnerName || shipTo?.OrganizationBPName1 || null,
      address:
        `${shipAddr?.StreetName || ""}, ${shipAddr?.CityName || ""}, ${
          shipAddr?.Region || ""
        } ${shipAddr?.PostalCode || ""}`.trim() || null,
      gstin: shipGstin || null,
      state: shipAddr?.Region || null,
      stateCode: null,
      contactPerson: null,
      contact:
        shipAddr?.to_PhoneNumber?.results?.[0]?.PhoneNumber?.trim() || null,
      email:
        shipAddr?.to_EmailAddress?.results?.[0]?.EmailAddress?.trim() || null,
    },
    transport: {
      dispatchedThrough: null,
      lrNo: null,
      destination: null,
      deliveryNoteDate: null,
      BillingInstructionLongText: bill?.BillingDocument || null,
      referenceNo: bill?.BillingDocument || null,
      referenceDate: formattedDate,
      buyerOrderNo: null,
      buyerOrderDate: null,
      modeOfPayment: null,
      otherReferences: null,
    },
    items,
    taxSummary,
    totals: {
      base: totals.base.toFixed(2),
      cgst: totals.cgst.toFixed(2),
      sgst: totals.sgst.toFixed(2),
      igst: totals.igst.toFixed(2),
      grandTotal: totals.grandTotal.toFixed(2),
      amountInWords: totals.grandTotal
        ? `${toWords(Math.floor(totals.grandTotal)).toUpperCase()} ONLY`
        : null,
      taxAmountInWords: totals.igst
        ? `${toWords(Math.floor(totals.igst)).toUpperCase()} ONLY`
        : null,
    },
    declaration: null,
    jurisdiction: null,
    isComputerGenerated: true,
  };
}

module.exports = {
  processItems,
  buildTaxSummary,
  buildResponse,
};
