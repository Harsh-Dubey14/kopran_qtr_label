const axios = require("axios");

exports.fetchBillingData = async (baseURL, billingDocumentId, headers) => {
  const [headerRes, itemRes] = await Promise.all([
    axios.get(
      `${baseURL}/sap/opu/odata4/sap/api_billingdocument/srvd_a2x/sap/billingdocument/0001/BillingDocument('${billingDocumentId}')?$expand=_Item($expand=_ItemText),_Partner`,
      { headers }
    ),
    axios.get(
      `${baseURL}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument('${billingDocumentId}')/to_Item?$format=json`,
      { headers }
    ),
  ]);
  return { bill: headerRes.data, itemsRaw: itemRes.data?.d?.results || [] };
};

exports.fetchPartners = async (baseURL, partnerId, shipToId, headers) => {
  const [partnerRes, shipToRes] = await Promise.all([
    axios.get(
      `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${partnerId}')?$expand=to_BusinessPartnerAddress,to_BusinessPartnerTax&$format=json`,
      { headers }
    ),
    axios.get(
      `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${shipToId}')?$expand=to_BusinessPartnerAddress,to_BusinessPartnerTax&$format=json`,
      { headers }
    ),
  ]);
  return { partner: partnerRes.data?.d, shipTo: shipToRes.data?.d };
};

exports.fetchPricing = async (
  baseURL,
  billingDocumentId,
  itemsRaw,
  headers
) => {
  const pricingURLs = itemsRaw.map(
    (item) =>
      `${baseURL}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocumentItem(BillingDocument='${billingDocumentId}',BillingDocumentItem='${item.BillingDocumentItem}')/to_PricingElement?$format=json`
  );

  const responses = await Promise.all(
    pricingURLs.map((url) => axios.get(url, { headers }))
  );
  return responses.flatMap((res) => res.data?.d?.results || []);
};
