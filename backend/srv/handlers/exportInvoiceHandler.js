// getMaterialDocumentDetails.js

const axios = require("axios");
const { formatDate, formatAmountInWords } = require("../utils/formatters"); // externalize if needed
const { stateCodeMap } = require("../utils/stateCodeMap");
const {
  DEFAULT_DECLARATION,
  DEFAULT_JURISDICTION,
  IS_COMPUTER_GENERATED,
  DEFAULT_PACKAGING,
  DEFAULT_TITLE_DESCRIPTION,
} = require("../utils/invoiceDefaults");

// 🔧 Utility
const safe = (val) => (parseFloat(val) > 0 ? parseFloat(val) : 0);

// Shared: Get Partner Address, GST, PAN, Contact
async function fetchBusinessPartnerDetails(partnerId, headers, baseURL) {
  if (!partnerId) return null;
  const { data } = await axios.get(
    `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${partnerId}')?$expand=to_BusinessPartnerAddress,to_BusinessPartnerTax,to_BusinessPartnerContact,to_MobilePhoneNumber,to_AddressIndependentEmail&$format=json`,
    { headers }
  );
  return data?.d;
}

// Shared: Fetch HSN map
async function fetchHSNMap(uniqueMaterials, headers, baseURL) {
  const hsnMap = {};
  await Promise.all(
    uniqueMaterials.map(async (materialId) => {
      try {
        const matRes = await axios.get(
          `${baseURL}/sap/opu/odata/sap/API_PRODUCT_SRV/A_Product('${materialId}')/to_Plant?$format=json`,
          { headers }
        );
        hsnMap[materialId] =
          matRes?.data?.d?.results?.[0]?.ConsumptionTaxCtrlCode || null;
      } catch {
        hsnMap[materialId] = null;
      }
    })
  );
  return hsnMap;
}

// Shared: Determine invoice type (Domestic / Export IGST / Export LUT)
function detectInvoiceType(bill, addr, totalIGST) {
  const country = (addr?.Country || "").toUpperCase();
  const currency = bill?.TransactionCurrency;

  if (country !== "IN" && parseFloat(totalIGST) > 0) {
    return { type: "EXPORT INVOICE - IGST", title: "EXPORT INVOICE" };
  }
  if (country !== "IN" && parseFloat(totalIGST) === 0 && currency !== "INR") {
    return { type: "EXPORT INVOICE - LUT", title: "EXPORT INVOICE" };
  }
  if (country === "IN" && currency === "INR") {
    return { type: "TAX INVOICE", title: "TAX INVOICE" };
  }
  return { type: "N/A", title: "N/A" };
}

// Shared: Create Buyer/Consignee structure
function buildPartyStructure(
  partyData,
  addr,
  taxInfo,
  contactInfo,
  stateCodeName,
  stateCodeNum
) {
  return {
    name:
      partyData?.BusinessPartnerName || partyData?.OrganizationBPName1 || null,
    address: {
      street: `${addr?.StreetPrefixName || ""}, ${
        addr?.StreetName || ""
      }`.trim(),
      city: addr?.CityName || null,
      region: stateCodeName || addr?.Region?.toString() || null,
      postalCode: addr?.PostalCode || null,
      country: addr?.Country || null,
    },
    gstin: taxInfo?.gstin || null,
    pan: taxInfo?.pan || null,
    placeOfSupply: stateCodeName || addr?.Region?.toString() || null,
    stateCode: stateCodeNum || null,
    contactPerson: contactInfo?.name || null,
    contact: contactInfo?.phone || null,
    email: contactInfo?.email || null,
  };
}

// ✅ DOMESTIC Invoice Generator
function generateTaxInvoiceJSON({
  bill,
  seller,
  buyer,
  consignee,
  transport,
  shipping,
  items,
  taxSummary,
  totals,
  irnData,
  paymentTerms,
  jurisdictionText,
}) {
  const formattedDate = formatDate(bill?.BillingDocumentDate);
  return {
    document: {
      type: bill?.documentType || "TAX INVOICE",
      title: "TAX INVOICE",
      number: bill?.BillingDocument || null,
      date: formattedDate,
      numberDate: `${bill?.BillingDocument || ""} Dt. ${
        bill?.BillingDocumentDate || ""
      }`,
      gstin: buyer?.gstin,
      currency: bill?.TransactionCurrency || null,
      ...irnData,
    },
    subjectToJurisdiction: jurisdictionText,
    seller,
    buyer,
    consignee,
    transport,
    shipping,
    items,
    taxSummary,
    totals,
    declaration: DEFAULT_DECLARATION,
    jurisdiction: DEFAULT_JURISDICTION,
    isComputerGenerated: IS_COMPUTER_GENERATED,
  };
}

// ✅ EXPORT Invoice Generator
function generateExportInvoiceJSON({
  bill,
  seller,
  buyer,
  consignee,
  transport,
  shipping,
  items,
  taxSummary,
  totals,
  irnData,
  jurisdictionText,
}) {
  const formattedDate = formatDate(bill?.BillingDocumentDate);
  return {
    document: {
      type: bill?.documentType || "EXPORT INVOICE",
      title: "EXPORT INVOICE",
      titleDescription: DEFAULT_TITLE_DESCRIPTION,
      number: bill?.BillingDocument || null,
      date: formattedDate,
      numberDate: `${bill?.BillingDocument || ""} Dt.${
        bill?.BillingDocumentDate || ""
      }`,
      gstin: buyer?.gstin,
      currency: bill?.TransactionCurrency || null,
      ...irnData,
    },
    exporter: seller,
    seller,
    subjectToJurisdiction: jurisdictionText,
    buyer,
    consignee,
    transport,
    shipping,
    items,
    taxSummary,
    totals,
    packaging: DEFAULT_PACKAGING,
  };
}

module.exports = {
  safe,
  detectInvoiceType,
  fetchBusinessPartnerDetails,
  fetchHSNMap,
  buildPartyStructure,
  generateTaxInvoiceJSON,
  generateExportInvoiceJSON,
};
