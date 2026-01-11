/* eslint-disable no-console */
const axios = require("axios");
const pug = require("pug");
const path = require("path");
const { toWords } = require("number-to-words");
const cds = require("@sap/cds");

module.exports = (srv) => {
  const { BillingDocuments } = srv.entities;

  // Get filtered billing documents
  srv.on("getBillingDocs", async (req) => {
    const { from, to } = req.data;
    if (!from || !to) req.reject(400, "Missing required parameters: from, to");

    return await SELECT.from(BillingDocuments)
      .where`billingDate BETWEEN ${from} AND ${to}`;
  });

  // Return invoice HTML for given ID
  srv.on("getInvoiceHtml", async (req) => {
    // const { ID } = req.data;
    // if (!ID) req.reject(400, "Missing Billing Document ID");

    const username = "ZAPI_DATA";
    const password = "FonBPYtddwXNF8BXhjkjKtquUpJQfdHMGXMRl#wv";

    if (!username || !password) {
      req.error(404, "API credentials missing");
    }

    const auth = Buffer.from(`${username}:${password}`).toString("base64");

    try {
      const response = await axios.get(
        "https://my414535-api.s4hana.cloud.sap/sap/opu/odata4/sap/zsd_invoice_data_sb/srvd_a2x/sap/zsd_invoice_data_sd/001/zsd_invoice_detailse_cube_view",
        {
          headers: {
            Authorization: `Basic ${auth}`,
            Accept: "application/json",
          },
        }
      );

      const result = response.data?.value;
      if (!result || !Array.isArray(result)) {
        req.reject(502, "Unexpected API response format");
      }

      // const doc = result.find((d) => d.BillingDocument === ID);
      // if (!doc) req.reject(404, "Billing Document not found");

      const invoiceData = {
        invoiceNo: "MPR U3 283/24-25",
        invoiceDate: "17.03.2025",
        items: [
          {
            description: `I) FILLED POLY PROPYLENE COMPOUND
(80% + 1% Filler Content)
KP FUR ECO
H.S.CODE: 3902.90.00
Net Content/kg: Polypropylene Granules 180g, CaCO3 800g, Zinc Stearate 20g`,
            qty: 15750,
            rate: 0.42332,
            amount: 6667.29,
          },
          {
            description: `II) COLOUR MASTER BATCHES
H.S.CODE: 32061900
Net Content/kg: PE 0.55kg, TiO2 0.35kg, Pigments 0.03kg, OB 0.002kg, UV/AO 0.01kg, Wax 0.008kg, CaCO3 0.05kg`,
            qty: 10625,
            rate: 2.73049,
            amount: 29011.46,
          },
        ],
        totalFOB: 34008.75,
        freight: 1650.0,
        insurance: 20.0,
        totalCIF: 35678.75,
        amountWords:
          "THIRTY FIVE THOUSAND SIX HUNDRED SEVENTY EIGHT AND SEVENTY FIVE",
      };

      // Compile and render Pug
      const templatePath = path.join(__dirname, "../views/invoice.pug");
      const html = pug.renderFile(templatePath, invoiceData);

      return html;
    } catch (err) {
      console.error("Invoice fetch error:", err.message);
      req.reject(500, "Failed to fetch invoice data");
    }
  });

  srv.on("getBillingDocsZdata", async (req) => {
    console.log("📥 Received getBillingDocsZdata request");

    const username = "ZAPI_DATA";
    const password = "FonBPYtddwXNF8BXhjkjKtquUpJQfdHMGXMRl#wv";
    // const password = "FonBPYtddwXNF8BXhjkjKtquUpJQfdHMGXMRl#wv";

    if (!username || !password) {
      console.error("❌ Missing credentials");
      return req.error(404, "API credentials missing");
    }

    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    const maskedAuth = `Basic ${auth.slice(0, 5)}...[masked]`;
    console.log("🔐 Basic Auth Header (masked):", maskedAuth);

    const url =
      "https://my414535-api.s4hana.cloud.sap/sap/opu/odata4/sap/zsd_invoice_data_sb/srvd_a2x/sap/zsd_invoice_data_sd/001/zsd_invoice_detailse_cube_view";

    console.log("🌐 Preparing to fetch CSRF token");

    const axiosInstance = axios.create();
    const csrfHeaders = {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "X-CSRF-Token": "Fetch",
      Cookie: "sap-usercontext=sap-client=100",
    };

    let csrfToken;
    let cookies;

    try {
      const csrfRes = await axiosInstance.get(url, { headers: csrfHeaders });

      csrfToken = csrfRes.headers["x-csrf-token"];
      cookies = csrfRes.headers["set-cookie"];

      console.log("✅ CSRF Token fetched:", csrfToken);
    } catch (err) {
      console.error("❌ Failed to fetch CSRF Token");
      console.error("Status:", err.response?.status);
      console.error("Body:", err.response?.data);
      return req.error(500, "CSRF token fetch failed");
    }

    // 🔄 Now make the actual API call with CSRF and cookie
    try {
      const response = await axiosInstance.get(url, {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
          "X-CSRF-Token": csrfToken,
          Cookie: cookies?.join("; "),
        },
      });

      console.log("✅ Received response with status:", response.status);
      console.log(
        "📦 Response preview:",
        JSON.stringify(response.data).slice(0, 300)
      );

      const result = response.data?.value;
      if (!result || !Array.isArray(result)) {
        console.error("⚠️ Unexpected API response format");
        return req.reject(502, "Unexpected API response format");
      }

      console.log(`📊 Returning ${result.length} billing document(s)`);
      return result;
    } catch (err) {
      console.error("❌ Final API call failed");
      console.error("Status:", err.response?.status);
      console.error("Message:", err.message);
      return req.error(500, {
        code: err.response?.status || 500,
        message:
          err.response?.data?.error?.message || err.message || "Unknown error",
      });
    }
  });

  srv.on("getMaterialDocumentItem", async (req) => {
    const auth_username = process.env.AUTH_Username;
    const auth_password = process.env.AUTH_Password;

    const auth = Buffer.from(`${auth_username}:${auth_password}`).toString(
      "base64"
    );
    const baseURL = process.env.BASE_URL_100;

    const headers = {
      Authorization: `Basic ${auth}`,
      Cookie: "sap-usercontext=sap-client=100",
      Accept: "application/json",
    };

    try {
      console.log("📡 Fetching billing documents...");
      const res = await axios.get(
        `${baseURL}/sap/opu/odata4/sap/api_billingdocument/srvd_a2x/sap/billingdocument/0001/BillingDocument?$top=100`,
        { headers }
      );

      // https://my414535-api.s4hana.cloud.sap:443/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument?$top=100&$inlinecount=allpages&$format=json

      const raw = res.data.value || [];

      const mapped = raw.map((doc) => ({
        BillingDocument: doc.BillingDocument,
        BillingDocumentDate: doc.BillingDocumentDate,
        BillingDocumentType: doc.BillingDocumentType,
        CreatedByUser: doc.CreatedByUser,
        SalesOrganization: doc.SalesOrganization,
        TotalNetAmount: doc.TotalNetAmount,
        TransactionCurrency: doc.TransactionCurrency,
        SoldToParty: doc.SoldToParty,
        IncotermsClassification: doc.IncotermsClassification,
        IncotermsLocation1: doc.IncotermsLocation1,
      }));

      // Sort by BillingDocument descending (latest first)
      mapped.sort(
        (a, b) => Number(b.BillingDocument) - Number(a.BillingDocument)
      );

      return mapped;
    } catch (err) {
      console.error("❌ Failed to fetch Billing Documents:");
      if (err.response) {
        console.error("🔴 Status:", err.response.status);
        console.error("🔴 Data:", JSON.stringify(err.response.data, null, 2));
      } else {
        console.error("🔴", err.message);
      }
      req.error(500, "Failed to fetch billing documents from S/4HANA.");
    }
  });

  // Optimized CAPM handler for generateExportInvoiceData

  srv.on("generateExportInvoiceData", async (req) => {
    const billingDocumentId = req.data.billingDocumentId;
    if (!billingDocumentId) return req.error(400, "Missing billingDocumentId");

    const auth_username = process.env.AUTH_Username;
    const auth_password = process.env.AUTH_Password;

    // === 1. Setup Constants and Headers ===
    const baseURL = process.env.BASE_URL_100;
    const auth = Buffer.from(`${auth_username}:${auth_password}`).toString(
      "base64"
    );
    const headers = {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      Cookie: "sap-usercontext=sap-client=100",
    };

    // === 2. Utility: Fetch Business Partner Name & Address ===

    const fetchPartnerDetails = async (partnerId) => {
      if (!partnerId) return { name: "UNKNOWN", address: {} };
      try {
        const { data } = await axios.get(
          `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${partnerId}')?$expand=to_BusinessPartnerAddress,to_Supplier&$format=json`,
          { headers }
        );
        const bp = data?.d;
        const addr = bp?.to_BusinessPartnerAddress?.results?.[0];
        return {
          name: bp?.BusinessPartnerName || bp?.OrganizationBPName1 || "UNKNOWN",
          address: {
            street: addr?.StreetName || "N/A",
            city: addr?.CityName || "N/A",
            region: addr?.Region || "N/A",
            postalCode: addr?.PostalCode || "N/A",
            country: addr?.Country || "N/A",
          },
        };
      } catch (_) {
        return { name: "UNKNOWN", address: {} };
      }
    };

    try {
      // === 3. Fetch Billing Header + Items ===
      const billHeaderURL = `${baseURL}/sap/opu/odata4/sap/api_billingdocument/srvd_a2x/sap/billingdocument/0001/BillingDocument('${billingDocumentId}')?$expand=_Item($expand=_ItemText),_Partner,_Text`;
      const itemURL = `${baseURL}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument('${billingDocumentId}')/to_Item?$format=json`;

      const [billRes, itemRes] = await Promise.all([
        axios.get(billHeaderURL, { headers }),
        axios.get(itemURL, { headers }),
      ]);

      const bill = billRes.data;
      const partnerId = bill._Partner?.find(
        (p) => p.PartnerFunction === "AG"
      )?.Customer;
      const itemsRaw = itemRes.data?.d?.results || [];
      console.log("itemsRaw", itemsRaw);

      if (!itemsRaw.length) return req.error(404, "No billing items found.");

      // === 4. Extract Business Partner IDs ===
      const partners = bill._Partner || [];
      const soldToId = partners.find(
        (p) => p.PartnerFunction === "AG"
      )?.Customer;
      const billToId = partners.find(
        (p) => p.PartnerFunction === "RG"
      )?.Customer;
      const shipToId = partners.find(
        (p) => p.PartnerFunction === "RE"
      )?.Customer;

      // === 5. Fetch Partner Details (Sold-To, Bill-To, etc.) ===
      const [soldTo, billTo, shipTo] = await Promise.all([
        fetchPartnerDetails(soldToId),
        fetchPartnerDetails(billToId),
        fetchPartnerDetails(shipToId),
      ]);

      const [partnerRes, shipToRes] = await Promise.all([
        axios.get(
          `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${partnerId}')?$expand=to_BusinessPartnerAddress/to_MobilePhoneNumber,to_BusinessPartnerTax,to_BusinessPartnerContact&$format=json`,
          { headers }
        ),
        axios.get(
          `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${shipToId}')?$expand=to_BusinessPartnerAddress,to_BusinessPartnerTax,to_BusinessPartnerContact&$format=json`,
          { headers }
        ),
      ]);
      // console.log("✅ Partner and Ship-To details fetched");

      const partner = partnerRes.data?.d;

      console.log("👤 Partner data:", partner);

      const addr = partner?.to_BusinessPartnerAddress?.results?.[0];

      const businessPartnerPhoneNumber =
        partner?.to_BusinessPartnerAddress?.results?.[0]?.to_MobilePhoneNumber
          ?.results?.[0]?.PhoneNumber;
      // console.log("📞 businessPartnerPhoneNumber:", businessPartnerPhoneNumber);
      const gstin = partner?.to_BusinessPartnerTax?.results?.find(
        (t) => t.BPTaxType === "IN3"
      )?.BPTaxNumber;
      const pan = partner?.BusinessPartnerExternalID || "";

      // === 6. Fetch Pricing Elements ===
      const pricingURLs = itemsRaw.map(
        (item) =>
          `${baseURL}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocumentItem(BillingDocument='${billingDocumentId}',BillingDocumentItem='${item.BillingDocumentItem}')/to_PricingElement?$expand=to_BillingDocumentItem&$format=json`
      );

      const pricingResponses = await Promise.all(
        pricingURLs.map((url) => axios.get(url, { headers }))
      );

      const pricingData = pricingResponses.flatMap(
        (res) => res.data?.d?.results || []
      );

      // console.log("📊 Pricing data fetched:", pricingData);
      pricingData.forEach((p) => {
        console.log(
          "Item",
          p.BillingDocumentItem,
          "→",
          p.TransactionCurrency,
          p.AbsltStatisticsExchangeRate
        );
      });

      // === 7. Fetch IRN (E-Invoice) Data ===
      let irnData = {};
      try {
        const irnResponse = await axios.get(
          `${baseURL}/sap/opu/odata4/sap/zui_invrefnum_bind/srvd/sap/zui_invrefnum_srv/0001/RefNum?$filter=Docno eq '${billingDocumentId}'`,
          { headers }
        );
        irnData = irnResponse?.data?.value?.[0] || {};
      } catch (err) {
        console.warn("⚠️ Failed to fetch IRN data:", err.message);
      }

      // === 8. Fetch Payment Terms Text ===
      let CustomerPaymentTermsTextValue = null;
      if (bill?.CustomerPaymentTerms) {
        try {
          const resp = await axios.get(
            `${baseURL}/sap/opu/odata4/sap/z_sd_paymenttermstext/srvd_a2x/sap/z_sd__paymenttermstext_srvdef/0001/PaymentTermsText?$filter=PaymentTerms eq '${bill.CustomerPaymentTerms}' and Language eq 'E'`,
            { headers }
          );
          CustomerPaymentTermsTextValue =
            resp?.data?.value?.[0]?.PaymentTermsDescription || null;
        } catch (err) {
          console.warn("⚠️ Payment terms text fetch failed:", err.message);
        }
      }

      // === 9. Process Items + Totals ===
      let totalAmount = 0,
        totalCGST = 0,
        totalSGST = 0,
        totalIGST = 0;
      let totalFreight = 0,
        totalInsurance = 0,
        totalFOB = 0;
      let totalQty = 0;

      const items = itemsRaw.map((item) => {
        const itemPricing = pricingData.filter(
          (p) => p.BillingDocumentItem === item.BillingDocumentItem
        );
        let base = 0,
          igst = 0,
          cgst = 0,
          sgst = 0;
        let igstRate = 0,
          cgstRate = 0,
          sgstRate = 0;
        let freight = 0,
          insurance = 0,
          fob = 0;

        for (const p of itemPricing) {
          const amt = parseFloat(p.ConditionAmount || 0);
          const rate = parseFloat(p.ConditionRateValue || 0);
          switch (p.ConditionType) {
            case "ZPR0":
            case "ZVAL":
              base += amt;
              break;
            case "JIIG":
            case "JOIG":
              igst += amt;
              igstRate = rate;
              break;
            case "JICG":
            case "JOCG":
              cgst += amt;
              cgstRate = rate;
              break;
            case "JISG":
            case "JOUG":
              sgst += amt;
              sgstRate = rate;
              break;
            case "ZFRE":
              freight += amt;
              break;
            case "ZINS":
              insurance += amt;
              break;
            case "ZFOB":
              fob += amt;
              break;
          }
        }
        // console.log("itemPricing", itemPricing);

        const qty = parseFloat(item.BillingQuantity || 0);
        const rate = qty ? base / qty : 0;

        totalQty += qty;
        totalAmount += base;
        totalCGST += cgst;
        totalSGST += sgst;
        totalIGST += igst;
        totalFreight += freight;
        totalInsurance += insurance;
        totalFOB += fob || base;

        return {
          description: item.BillingDocumentItemText,
          qty,
          rate: rate.toFixed(2),
          amount: base.toFixed(2),
          hsn: item?.MaterialGroup || "NA",
          baseUnit: item.BaseUnit || item.BillingQuantityUnit || "NA", // ✅ Add this line
          transactionCurrency:
            itemPricing?.[0]?.TransactionCurrency ||
            bill?.TransactionCurrency ||
            null,
          exchangeRate: parseFloat(
            itemPricing?.[0]?.to_BillingDocumentItem
              ?.AbsltPriceDetnExchangeRate ??
              bill?.[0]?.to_Item?.AbsltPriceDetnExchangeRate ??
              "0"
          ).toFixed(2),
          tax: {
            igst: igst.toFixed(2),
            cgst: cgst.toFixed(2),
            sgst: sgst.toFixed(2),
            igstRate,
            cgstRate,
            sgstRate,
          },
        };
      });

      // === 10. Tax Summary Grouping by HSN ===
      const taxSummaryMap = {};
      items.forEach((item) => {
        const hsn = item.hsn || "NA";
        const unit = item.baseUnit || "NA";

        if (!taxSummaryMap[hsn]) {
          taxSummaryMap[hsn] = {
            hsn,
            baseUnit: unit,

            taxableAmount: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            igstRate: 0,
            cgstRate: 0,
            sgstRate: 0,
            conditionTypes: [],
            conditionRates: {},
          };
        }

        taxSummaryMap[hsn].taxableAmount += parseFloat(item.amount || 0);
        taxSummaryMap[hsn].igst += parseFloat(item.tax.igst || 0);
        taxSummaryMap[hsn].cgst += parseFloat(item.tax.cgst || 0);
        taxSummaryMap[hsn].sgst += parseFloat(item.tax.sgst || 0);
        taxSummaryMap[hsn].igstRate = item.tax.igstRate;
        taxSummaryMap[hsn].cgstRate = item.tax.cgstRate;
        taxSummaryMap[hsn].sgstRate = item.tax.sgstRate;

        ["igst", "cgst", "sgst"].forEach((type) => {
          const rateKey = `${type}Rate`;
          if (item.tax[rateKey]) {
            taxSummaryMap[hsn].conditionTypes.push(type.toUpperCase());
            taxSummaryMap[hsn].conditionRates[type.toUpperCase()] =
              item.tax[rateKey];
          }
        });
      });

      const taxSummary = Object.values(taxSummaryMap).map((entry) => ({
        hsn: entry.hsn,
        baseUnit: entry.baseUnit,

        taxableAmount: entry.taxableAmount.toFixed(2),
        igst: entry.igst.toFixed(2),
        cgst: entry.cgst.toFixed(2),
        sgst: entry.sgst.toFixed(2),
        igstRate: entry.igstRate ? `${entry.igstRate}%` : null,
        cgstRate: entry.cgstRate ? `${entry.cgstRate}%` : null,
        sgstRate: entry.sgstRate ? `${entry.sgstRate}%` : null,
        totalTaxAmount: (entry.igst + entry.cgst + entry.sgst).toFixed(2),
        conditionTypes: entry.conditionTypes,
        conditionRates: entry.conditionRates,
        exchangeRate:
          items.find((i) => i.hsn === entry.hsn)?.exchangeRate || "0.00",
        transactionCurrency:
          items.find((i) => i.hsn === entry.hsn)?.transactionCurrency || null,
      }));

      // === 11. Totals Calculation ===
      const totalInvoice = totalAmount + totalCGST + totalSGST + totalIGST;
      const totalCIF = totalFOB + totalFreight + totalInsurance + totalIGST;

      // ==== =====
      // Fallbacks if data is missing

      const shipToBusinessPartnerRes = shipToRes?.data?.d;

      const shipToBusinessPartnerResName =
        shipToBusinessPartnerRes?.BusinessPartnerName || null;

      const shipToBusinessPartnerResEmail =
        shipToBusinessPartnerRes?.to_BusinessPartnerContact?.results?.[0]
          ?.EmailAddress || null;

      const buyerGstin = gstin || null;
      const buyerPan = pan || null;
      const buyerContact = businessPartnerPhoneNumber || null;
      const buyerPlaceOfSupply = addr?.Region || null;
      const buyerContactPerson =
        partner?.BusinessPartnerName || partner?.OrganizationBPName1 || null;
      console.log("buyerContactPerson,", buyerContactPerson);
      const buyerEmail = shipToBusinessPartnerResEmail || null;
      const enrichedBuyer = {
        ...billTo,
        gstin: buyerGstin,
        pan: buyerPan,
        placeOfSupply: buyerPlaceOfSupply,
        contactPerson: buyerContactPerson,
        contact: buyerContact,
        email: buyerEmail,
      };

      const enrichedConsignee = {
        ...shipTo,
        gstin: buyerGstin,
        pan: buyerPan,
        placeOfSupply: buyerPlaceOfSupply,
        contactPerson: buyerContactPerson,
        contact: buyerContact,
        email: buyerEmail,
      };

      const baseUnit =
        itemsRaw[0]?.BaseUnit || itemsRaw[0]?.BillingQuantityUnit || "NA";

      console.log("itemsRaw[0]", itemsRaw[0]);

      // === 12. Final Response ===
      return {
        document: {
          type: "EXPORT INVOICE",
          title: "EXPORT INVOICE",
          titleDescription:
            "(SUPPLY MEANT FOR EXPORT/SUPPLY TO SEZ UNIT OR SEZ DEVELOPER FOR AUTHORISED OPERATIONS UNDER BOND OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF IGST)",
          number: bill?.BillingDocument ?? null,
          date: formatDate(bill?.BillingDocumentDate) ?? null,
          numberDate: `${bill?.BillingDocument || ""} Dt.${
            bill?.BillingDocumentDate || ""
          }`,
          currency: bill?.TransactionCurrency ?? null,
          irn: irnData?.Irn ?? null,
          ackNo: irnData?.AckNo ?? null,
          ackDate: irnData?.AckDate ?? null,
          irnStatus: irnData?.IrnStatus ?? null,
          cancelDate: irnData?.CancelDate ?? null,
          eInvoice: !!irnData?.Irn,
          version: irnData?.Version ?? null,
          createdBy: irnData?.Ernam ?? null,
          createdDate: irnData?.Erdat ?? null,
          createdTime: irnData?.Erzet ?? null,
          einvoiceSignedJson: irnData?.SignedInv ?? null,
          einvoiceSignedQr: irnData?.SignedQrcode ?? null,
          officialDocumentNumber: irnData?.Odn ?? null,
          documentYear: irnData?.DocYear ?? null,
          documentType: irnData?.DocType ?? null,
          companyCode: irnData?.Bukrs ?? null,
          gstin: "26AAOCM3634M1ZZ",
        },

        exporter: {
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

        buyer: enrichedBuyer ?? null,
        consignee: enrichedConsignee ?? null,

        shipping: {
          preCarriageBy: bill?.ShippingCondition ?? null,
          placeOfReceipt: "UNKNOWN",
          termsOfDelivery: bill?.IncotermsClassification ?? null,
          termsOfPayment: CustomerPaymentTermsTextValue ?? null,
          portOfDischarge: "IN",
          finalDestination: soldTo?.address?.country ?? null,
          countryInfo: {
            origin: "IN",
            destination: "IN",
          },
        },

        transport: {
          dispatchedThrough: null,
          lrNo: null,
          destination: soldTo?.address?.city ?? null,
          deliveryNoteDate: formatDate(bill?.BillingDocumentDate) ?? null,
          BillingInstructionLongText: bill?.BillingDocument ?? null,
          referenceNo: bill?.BillingDocument ?? null,
          referenceDate: formatDate(bill?.BillingDocumentDate) ?? null,
          buyerOrderNo: null,
          buyerOrderDate: formatDate(bill?.BillingDocumentDate) ?? null,
          termsOfPayment: CustomerPaymentTermsTextValue ?? null,
          otherReferences: null,
        },

        items: items ?? [],
        taxSummary: taxSummary ?? [],

        totals: {
          base: totalAmount?.toFixed(2) ?? "0.00",
          cgst: totalCGST?.toFixed(2) ?? "0.00",
          sgst: totalSGST?.toFixed(2) ?? "0.00",
          igst: totalIGST?.toFixed(2) ?? "0.00",
          freight: totalFreight?.toFixed(2) ?? "0.00",
          insurance: totalInsurance?.toFixed(2) ?? "0.00",
          totalFOB: totalFOB?.toFixed(2) ?? "0.00",
          grandTotal: totalInvoice?.toFixed(2) ?? "0.00",
          totalCIF: totalCIF?.toFixed(2) ?? "0.00",
          totalQty: totalQty?.toFixed(2) ?? "0.00", // ✅ TOTAL QTY
          baseUnit: baseUnit,
          transactionCurrencyAmount:
            totalFOB /
            parseFloat(itemsRaw[0]?.AbsltStatisticsExchangeRate || 0).toFixed(
              2
            ),
          transactionCurrency: itemsRaw[0]?.TransactionCurrency || null,
          exchangeRate: parseFloat(
            itemsRaw[0]?.AbsltStatisticsExchangeRate || 0
          ).toFixed(2),

          amountInWords: totalInvoice
            ? `${toWords(Math.floor(totalInvoice)).toUpperCase()} ONLY`
            : null,
          taxAmountInWords:
            totalCGST + totalSGST + totalIGST
              ? `${toWords(
                  Math.floor(totalCGST + totalSGST + totalIGST)
                ).toUpperCase()} ONLY`
              : null,
        },

        packaging: {
          marksAndNos: "",
          numberAndKindOfPackages: "",
          grossWeight: "",
          netWeight: "",
        },
      };
    } catch (err) {
      console.error(
        "❌ Error during invoice generation:",
        err.response?.data || err.message
      );
      return req.error(500, "Error fetching export invoice data");
    }
  });

  srv.on("generateTaxInvoiceData", async (req) => {
    const billingDocumentId = req.data.billingDocumentId;
    if (!billingDocumentId) return req.error(400, "Missing billingDocumentId");

    const baseURL = process.env.BASE_URL_100;
    const auth = Buffer.from(
      "abhishek1494:lZxlZVBpNDCPrKCk7KUSqdysL%GsyZtyedCtkxfs"
    ).toString("base64");
    const headers = {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      Cookie: "sap-usercontext=sap-client=100",
    };

    try {
      // console.log("🔁 Starting Tax Invoice Generation for:", billingDocumentId);

      // 1. Header + Items
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
      // console.log("✅ Header and Item data fetched");

      const bill = headerRes.data;
      const itemsRaw = itemRes.data?.d?.results || [];

      // console.log("📦 itemsRaw fetched:", itemsRaw);

      if (!itemsRaw.length) {
        console.warn("⚠️ No billing items found");
        return req.error(404, "No billing items found");
      }

      // console.log("bill:", bill);

      const CustomerPaymentTermsId = bill?.CustomerPaymentTerms || "null";
      console.log("CustomerPaymentTermsId", CustomerPaymentTermsId);

      let CustomerPaymentTermsTextValue = null;

      if (CustomerPaymentTermsId) {
        try {
          const CustomerPaymentTermsText = await axios.get(
            `${baseURL}/sap/opu/odata4/sap/z_sd_paymenttermstext/srvd_a2x/sap/z_sd__paymenttermstext_srvdef/0001/PaymentTermsText?$filter=PaymentTerms eq '${CustomerPaymentTermsId}' and Language eq 'E'`,
            { headers }
          );
          console.log("CustomerPaymentTermsText", CustomerPaymentTermsText);

          CustomerPaymentTermsTextValue =
            Array.isArray(CustomerPaymentTermsText?.data?.value) &&
            CustomerPaymentTermsText.data.value.length > 0
              ? CustomerPaymentTermsText.data.value[0].PaymentTermsDescription
              : null;

          console.log(
            "CustomerPaymentTermsTextValue",
            CustomerPaymentTermsTextValue
          );
        } catch (err) {
          console.warn(
            "⚠️ Optional CustomerPaymentTermsTextValue fetch failed:",
            err.message
          );
        }
      }

      // console.log("CustomerPaymentTermsId", CustomerPaymentTermsId);
      // 2. Buyer + Ship-To Details
      const partnerId = bill._Partner?.find(
        (p) => p.PartnerFunction === "AG"
      )?.Customer;
      const shipToId =
        bill._Partner?.find((p) => p.PartnerFunction === "SH")?.Customer ||
        bill._Partner?.find((p) => p.PartnerFunction === "AG")?.Customer;
      // console.log("👥 Partner IDs:", { partnerId, shipToId });

      const [partnerRes, shipToRes] = await Promise.all([
        axios.get(
          `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${partnerId}')?$expand=to_BusinessPartnerAddress/to_MobilePhoneNumber,to_BusinessPartnerTax,to_BusinessPartnerContact&$format=json`,
          { headers }
        ),
        axios.get(
          `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${shipToId}')?$expand=to_BusinessPartnerAddress,to_BusinessPartnerTax,to_BusinessPartnerContact&$format=json`,
          { headers }
        ),
      ]);
      // console.log("✅ Partner and Ship-To details fetched");

      const partner = partnerRes.data?.d;

      // console.log(
      //   "👤 Partner data:",
      //   partner?.to_BusinessPartnerAddress?.results?.[0]?.to_MobilePhoneNumber
      // );

      const addr = partner?.to_BusinessPartnerAddress?.results?.[0];

      const businessPartnerPhoneNumber =
        partner?.to_BusinessPartnerAddress?.results?.[0]?.to_MobilePhoneNumber
          ?.results?.[0]?.PhoneNumber;
      // console.log("📞 businessPartnerPhoneNumber:", businessPartnerPhoneNumber);
      const gstin = partner?.to_BusinessPartnerTax?.results?.find(
        (t) => t.BPTaxType === "IN3"
      )?.BPTaxNumber;
      const pan = partner?.BusinessPartnerExternalID || "";

      const shipTo = shipToRes.data?.d;
      // console.log("shipTo", shipTo);

      const shipToBusinessPartner =
        shipTo?.to_BusinessPartnerContact?.results?.[0]?.BusinessPartnerPerson;

      let shipToBusinessPartnerResName = null;
      let shipToBusinessPartnerResEmail = null;

      if (shipToBusinessPartner) {
        try {
          const shipToBusinessPartnerRes = await axios.get(
            `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${shipToBusinessPartner}')?$format=json&$expand=to_AddressIndependentPhone,to_AddressIndependentEmail`,
            { headers }
          );

          shipToBusinessPartnerResName =
            shipToBusinessPartnerRes?.data?.d?.BusinessPartnerFullName;

          shipToBusinessPartnerResEmail =
            shipToBusinessPartnerRes?.data?.d?.to_AddressIndependentEmail
              ?.results?.[0]?.EmailAddress;
        } catch (err) {
          console.warn(
            "⚠️ Optional shipToBusinessPartner fetch failed:",
            err.message
          );
        }
      }

      // console.log(
      //   "shipToBusinessPartnerResshipToBusinessPartnerResshipToBusinessPartnerRes",
      //   shipToBusinessPartnerRes?.data
      // );

      const shipAddr = shipTo?.to_BusinessPartnerAddress?.results?.[0];
      console.log("shipAddr", shipAddr);

      const stateCodeMap = {
        AN: "35",
        AP: "37",
        AR: "12",
        AS: "18",
        BR: "10",
        CH: "04",
        CT: "22",
        DL: "07",
        DN: "26",
        GA: "30",
        GJ: "24",
        HR: "06",
        HP: "02",
        JK: "01",
        JH: "20",
        KA: "29",
        KL: "32",
        LA: "38",
        LD: "31",
        MH: "27",
        ML: "17",
        MN: "14",
        MP: "23",
        MZ: "15",
        NL: "13",
        OD: "21",
        PB: "03",
        PY: "34",
        RJ: "08",
        SK: "11",
        TN: "33",
        TS: "36",
        TR: "16",
        UP: "09",
        UK: "05",
        WB: "19",
        DNHDD: "26", // For Dadra and Nagar Haveli and Daman and Diu
        DH: "26", // For Dadra and Nagar Haveli and Daman and Diu
        DD: "26", // For Dadra and Nagar Haveli and Daman and Diu
      };

      const regionCode = shipAddr?.Region;
      console.log("shipAddr.Region", regionCode);
      const stateCode = stateCodeMap[regionCode] || "null"; // fallback to "ODATA"
      console.log("stateCode", stateCode);

      const shipGstin = shipTo?.to_BusinessPartnerTax?.results?.find(
        (t) => t.BPTaxType === "IN1"
      )?.BPTaxNumber;

      // console.log("shipToBusinessPartnerResName", shipToBusinessPartnerResName);
      // console.log("shipGstin", shipGstin);

      // 3. Pricing
      const pricingURLs = itemsRaw.map(
        (item) =>
          `${baseURL}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocumentItem(BillingDocument='${billingDocumentId}',BillingDocumentItem='${item.BillingDocumentItem}')/to_PricingElement?$format=json`
      );
      // console.log("🔗 Pricing URLs generated:", pricingURLs.length);

      const pricingResponses = await Promise.all(
        pricingURLs.map((url) => axios.get(url, { headers }))
      );
      // console.log("✅ Pricing data fetched", pricingResponses);

      const pricingData = pricingResponses.flatMap(
        (res) => res.data?.d?.results || []
      );

      // console.log("📊 pricing records:", pricingData);
      let totalAmount = 0;
      let totalCGST = 0;
      let totalSGST = 0;
      let totalIGST = 0;

      const items = itemsRaw.map((item) => {
        const itemPricing = pricingData.filter(
          (p) => p.BillingDocumentItem === item.BillingDocumentItem
        );

        console.log("📦 Processing item:", item.BillingDocumentItem);

        let base = 0,
          igst = 0,
          cgst = 0,
          sgst = 0,
          igstRate = 0,
          cgstRate = 0,
          sgstRate = 0;

        for (const p of itemPricing) {
          const amt = parseFloat(p.ConditionAmount || 0);
          const rate = parseFloat(p.ConditionRateValue || 0);
          console.log("p.ConditionType", p);
          console.log("p.ConditionType.p", p.ConditionType);
          switch (p.ConditionType) {
            case "ZPR0":
            case "ZVAL":
              base += amt;
              break;

            case "JIIG":
            case "JOIG":
              igst += amt;
              igstRate = rate || igstRate;
              break;

            case "JICG":
            case "JOCG": // ← NEW
              cgst += amt;
              cgstRate = rate || cgstRate;
              break;

            case "JISG":
            case "JOUG": // ← NEW
              sgst += amt;
              sgstRate = rate || sgstRate;
              break;
          }
        }

        const qty = parseFloat(item.BillingQuantity || 0);
        const rate = qty !== 0 ? base / qty : 0;

        // Aggregate totals
        totalAmount += base;
        totalCGST += cgst;
        totalSGST += sgst;
        totalIGST += igst;

        return {
          description: item.BillingDocumentItemText,
          qty,
          rate: rate.toFixed(2),
          amount: base.toFixed(2),
          hsn: item?.MaterialGroup || "NA",
          tax: {
            igst: igst.toFixed(2),
            cgst: cgst.toFixed(2),
            sgst: sgst.toFixed(2),
            igstRate: igstRate || 0,
            cgstRate: cgstRate || 0,
            sgstRate: sgstRate || 0,
          },
        };
      });

      console.log("🧾 Items processed:", items);

      const totalInvoice = totalAmount + totalCGST + totalSGST + totalIGST;
      const formattedDate = formatDate(bill.BillingDocumentDate);

      // IRN
      // Initialize IRN-related fields
      let irnNumber = null;
      let acknowledgementNumber = null;
      let acknowledgementDate = null;
      let irnStatus = null;
      let cancellationDate = null;
      let einvoiceSignedJson = null;
      let einvoiceSignedQr = null;
      let createdBy = null;
      let createdDate = null;
      let createdTime = null;
      let officialDocumentNumber = null;
      let documentYear = null;
      let documentType = null;
      let companyCode = null;
      let version = null;

      if (billingDocumentId) {
        try {
          const irnResponse = await axios.get(
            `${baseURL}/sap/opu/odata4/sap/zui_invrefnum_bind/srvd/sap/zui_invrefnum_srv/0001/RefNum?$filter=Docno eq '${billingDocumentId}'`,
            { headers }
          );

          const irnRecords = irnResponse?.data?.value;
          if (Array.isArray(irnRecords) && irnRecords.length > 0) {
            const irnData = irnRecords[0];

            // Save required IRN details
            irnNumber = irnData?.Irn || null;
            acknowledgementNumber = irnData?.AckNo || null;
            acknowledgementDate = irnData?.AckDate || null;
            irnStatus = irnData?.IrnStatus || null;
            cancellationDate = irnData?.CancelDate || null;
            einvoiceSignedJson = irnData?.SignedInv || null;
            einvoiceSignedQr = irnData?.SignedQrcode || null;

            // Additional useful fields
            createdBy = irnData?.Ernam || null;
            createdDate = irnData?.Erdat || null;
            createdTime = irnData?.Erzet || null;
            officialDocumentNumber = irnData?.Odn || null;
            documentYear = irnData?.DocYear || null;
            documentType = irnData?.DocType || null;
            companyCode = irnData?.Bukrs || null;
            version = irnData?.Version || null;
          }
        } catch (err) {
          console.warn("⚠️ Failed to fetch IRN data:", err.message);
        }
      }

      // Group and aggregate tax summary by HSN
      const taxSummaryMap = {};

      items.forEach((item) => {
        const hsn = item.hsn || "NA";
        if (!taxSummaryMap[hsn]) {
          taxSummaryMap[hsn] = {
            hsn,
            taxableAmount: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            igstRate: 0,
            cgstRate: 0,
            sgstRate: 0,
            conditionTypes: [], // New: for ConditionTypes used
            conditionRates: {}, // New: map of {conditionType: rate}
          };
        }

        taxSummaryMap[hsn].taxableAmount += parseFloat(item.amount || 0);
        taxSummaryMap[hsn].igst += parseFloat(item.tax.igst || 0);
        taxSummaryMap[hsn].cgst += parseFloat(item.tax.cgst || 0);
        taxSummaryMap[hsn].sgst += parseFloat(item.tax.sgst || 0);
        taxSummaryMap[hsn].igstRate = item.tax.igstRate || 0;
        taxSummaryMap[hsn].cgstRate = item.tax.cgstRate || 0;
        taxSummaryMap[hsn].sgstRate = item.tax.sgstRate || 0;
        // Track condition types and their rates
        const taxTypes = ["igst", "cgst", "sgst"];
        for (const type of taxTypes) {
          const rateKey = type + "Rate";
          if (item.tax[rateKey]) {
            taxSummaryMap[hsn].conditionTypes.push(type.toUpperCase()); // e.g., IGST
            taxSummaryMap[hsn].conditionRates[type.toUpperCase()] =
              item.tax[rateKey];
          }
        }
      });

      const taxSummary = Object.values(taxSummaryMap).map((entry) => ({
        hsn: entry.hsn,
        taxableAmount: entry.taxableAmount.toFixed(2),
        igst: entry.igst.toFixed(2),
        cgst: entry.cgst.toFixed(2),
        sgst: entry.sgst.toFixed(2),
        igstRate: entry.igstRate ? `${entry.igstRate}%` : null,
        cgstRate: entry.cgstRate ? `${entry.cgstRate}%` : null,
        sgstRate: entry.sgstRate ? `${entry.sgstRate}%` : null,
        totalTaxAmount: (entry.igst + entry.cgst + entry.sgst).toFixed(2),
        // 🔍 Add these for debug/reference:
        conditionTypes: entry.conditionTypes,
        conditionRates: entry.conditionRates,
      }));

      // 🧠 Auto-detect invoice type
      let documentTypeDetect = "";
      let documentTitle = "";

      const isDomestic =
        (addr?.Country || "").toUpperCase() === "IN" &&
        bill?.TransactionCurrency === "INR" &&
        (bill?.CustomerTaxClassification1 === "0" ||
          bill?.CustomerTaxClassification1 === "1");

      const isExportIGST =
        (addr?.Country || "").toUpperCase() !== "IN" &&
        parseFloat(totalIGST) > 0;

      const isExportLUT =
        (addr?.Country || "").toUpperCase() !== "IN" &&
        parseFloat(totalIGST) === 0 &&
        bill?.TransactionCurrency !== "INR";

      console.log("🌍 isDomestic:", isDomestic);
      console.log("🚢 isExportIGST:", isExportIGST);
      console.log("🛫 isExportLUT:", isExportLUT);

      if (isExportIGST) {
        documentTypeDetect = "EXPORT INVOICE - IGST";
        documentTitle = "EXPORT INVOICE";
      } else if (isExportLUT) {
        documentTypeDetect = "EXPORT INVOICE - LUT";
        documentTitle = "EXPORT INVOICE";
      } else if (isDomestic) {
        documentTypeDetect = "TAX INVOICE";
        documentTitle = "TAX INVOICE";
      } else {
        documentTypeDetect = "N/A";
        documentTitle = "N/A";
      }

      console.log("🧾 Detected Document Type:", documentTypeDetect);
      console.log("📄 Document Title:", documentTitle);

      // console.log("📦 Final totals computed", taxSummary);

      return {
        document: {
          type: documentTypeDetect,
          title: documentTitle,
          number: bill?.BillingDocument || null,
          date: formattedDate || null,
          numberDate: `${bill?.BillingDocument || ""} Dt.${
            bill?.BillingDocumentDate || ""
          }`,
          gstin: gstin || null,
          currency: bill?.TransactionCurrency || null,

          // IRN Section
          irn: irnNumber || null,
          ackNo: acknowledgementNumber || null,
          ackDate: acknowledgementDate || null,
          irnStatus: irnStatus || null,
          cancelDate: cancellationDate || null,
          version: version || null,

          eInvoice: !!irnNumber,
          // Additional IRN Metadata
          einvoiceSignedQr: einvoiceSignedQr || null,
          createdBy: createdBy || null,
          createdDate: createdDate || null,
          createdTime: createdTime || null,
          officialDocumentNumber: officialDocumentNumber || null,
          documentYear: documentYear || null,
          documentType: documentType || null,
          companyCode: companyCode || null,
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
            partner?.BusinessPartnerName ||
            partner?.OrganizationBPName1 ||
            null,
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
          contactPerson: shipToBusinessPartnerResName || null,
          contact: businessPartnerPhoneNumber || null,
          email: shipToBusinessPartnerResEmail || null,
        },
        consignee: {
          name:
            shipTo?.BusinessPartnerName || shipTo?.OrganizationBPName1 || null,
          address:
            `${shipAddr?.StreetName || ""}, ${shipAddr?.CityName || ""}, ${
              shipAddr?.Region || ""
            } ${shipAddr?.PostalCode || ""}`.trim() || null,
          gstin: shipGstin || null,
          state: shipAddr?.Region || null,
          stateCode: stateCode || null,
          contactPerson: shipToBusinessPartnerResName || null,
          contact: businessPartnerPhoneNumber || null,
          email: shipToBusinessPartnerResEmail || null,
        },

        transport: {
          dispatchedThrough: null,
          lrNo: null,
          destination: addr?.CityName || null,
          deliveryNoteDate: formattedDate,
          BillingInstructionLongText: bill?.BillingDocument || null,
          referenceNo: bill?.BillingDocument || null,
          referenceDate: formattedDate,
          buyerOrderNo: null,
          buyerOrderDate: formattedDate,
          termsOfPayment: CustomerPaymentTermsTextValue || null,
          otherReferences: null,
        },
        items,
        taxSummary,
        totals: {
          base: totalAmount.toFixed(2),
          cgst: totalCGST.toFixed(2),
          sgst: totalSGST.toFixed(2),
          igst: totalIGST.toFixed(2),
          grandTotal: totalInvoice.toFixed(2),
          amountInWords: totalInvoice
            ? `${toWords(Math.floor(totalInvoice)).toUpperCase()} ONLY`
            : null,
          taxAmountInWords:
            totalCGST + totalSGST + totalIGST
              ? `${toWords(
                  Math.floor(totalCGST + totalSGST + totalIGST)
                ).toUpperCase()} ONLY`
              : null,
        },
        declaration: null,
        jurisdiction: null,
        isComputerGenerated: true,
      };
    } catch (err) {
      console.error(
        "❌ Error in Tax Invoice Generation:",
        err.response?.data || err.message
      );
      return req.error(500, "Error generating tax invoice");
    }
  });

  srv.on("getMaterialDocumentDetails", async (req) => {
    req.data.billingDocumentId =
      req.data.billingDocumentId || req.data.BillingDocument;
    const billingDocumentId = req.data.billingDocumentId;
    if (!billingDocumentId) return req.error(400, "Missing billingDocumentId");

    const auth_username = process.env.AUTH_Username;
    const auth_password = process.env.AUTH_Password;

    const baseURL = process.env.BASE_URL_100;
    const auth = Buffer.from(`${auth_username}:${auth_password}`).toString(
      "base64"
    );
    const headers = {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      Cookie: "sap-usercontext=sap-client=100",
    };

    try {
      // console.log("🔁 Starting Tax Invoice Generation for:", billingDocumentId);

      // 1. Header + Items
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
      // console.log("✅ Header and Item data fetched");

      const bill = headerRes.data;
      const itemsRaw = itemRes.data?.d?.results || [];

      // console.log("📦 itemsRaw fetched:", itemsRaw);

      if (!itemsRaw.length) {
        console.warn("⚠️ No billing items found");
        return req.error(404, "No billing items found");
      }

      // console.log("bill:", bill);

      const CustomerPaymentTermsId = bill?.CustomerPaymentTerms || "null";
      console.log("CustomerPaymentTermsId", CustomerPaymentTermsId);

      let CustomerPaymentTermsTextValue = null;

      if (CustomerPaymentTermsId) {
        try {
          const CustomerPaymentTermsText = await axios.get(
            `${baseURL}/sap/opu/odata4/sap/z_sd_paymenttermstext/srvd_a2x/sap/z_sd__paymenttermstext_srvdef/0001/PaymentTermsText?$filter=PaymentTerms eq '${CustomerPaymentTermsId}' and Language eq 'E'`,
            { headers }
          );
          console.log("CustomerPaymentTermsText", CustomerPaymentTermsText);

          CustomerPaymentTermsTextValue =
            Array.isArray(CustomerPaymentTermsText?.data?.value) &&
            CustomerPaymentTermsText.data.value.length > 0
              ? CustomerPaymentTermsText.data.value[0].PaymentTermsDescription
              : null;

          console.log(
            "CustomerPaymentTermsTextValue",
            CustomerPaymentTermsTextValue
          );
        } catch (err) {
          console.warn(
            "⚠️ Optional CustomerPaymentTermsTextValue fetch failed:",
            err.message
          );
        }
      }

      // console.log("CustomerPaymentTermsId", CustomerPaymentTermsId);
      // 2. Buyer + Ship-To Details
      const partnerId = bill._Partner?.find(
        (p) => p.PartnerFunction === "AG"
      )?.Customer;
      const shipToId =
        bill._Partner?.find((p) => p.PartnerFunction === "SH")?.Customer ||
        bill._Partner?.find((p) => p.PartnerFunction === "AG")?.Customer;
      // console.log("👥 Partner IDs:", { partnerId, shipToId });

      const [partnerRes, shipToRes] = await Promise.all([
        axios.get(
          `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${partnerId}')?$expand=to_BusinessPartnerAddress/to_MobilePhoneNumber,to_BusinessPartnerTax,to_BusinessPartnerContact&$format=json`,
          { headers }
        ),
        axios.get(
          `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${shipToId}')?$expand=to_BusinessPartnerAddress,to_BusinessPartnerTax,to_BusinessPartnerContact&$format=json`,
          { headers }
        ),
      ]);
      // console.log("✅ Partner and Ship-To details fetched");

      const partner = partnerRes.data?.d;

      // console.log(
      //   "👤 Partner data:",
      //   partner?.to_BusinessPartnerAddress?.results?.[0]?.to_MobilePhoneNumber
      // );

      const addr = partner?.to_BusinessPartnerAddress?.results?.[0];

      const businessPartnerPhoneNumber =
        partner?.to_BusinessPartnerAddress?.results?.[0]?.to_MobilePhoneNumber
          ?.results?.[0]?.PhoneNumber;
      // console.log("📞 businessPartnerPhoneNumber:", businessPartnerPhoneNumber);
      const gstin = partner?.to_BusinessPartnerTax?.results?.find(
        (t) => t.BPTaxType === "IN3"
      )?.BPTaxNumber;
      const pan = partner?.BusinessPartnerExternalID || "";

      const shipTo = shipToRes.data?.d;
      // console.log("shipTo", shipTo);

      const shipToBusinessPartner =
        shipTo?.to_BusinessPartnerContact?.results?.[0]?.BusinessPartnerPerson;

      let shipToBusinessPartnerResName = null;
      let shipToBusinessPartnerResEmail = null;

      if (shipToBusinessPartner) {
        try {
          const shipToBusinessPartnerRes = await axios.get(
            `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${shipToBusinessPartner}')?$format=json&$expand=to_AddressIndependentPhone,to_AddressIndependentEmail`,
            { headers }
          );

          shipToBusinessPartnerResName =
            shipToBusinessPartnerRes?.data?.d?.BusinessPartnerFullName;

          shipToBusinessPartnerResEmail =
            shipToBusinessPartnerRes?.data?.d?.to_AddressIndependentEmail
              ?.results?.[0]?.EmailAddress;
        } catch (err) {
          console.warn(
            "⚠️ Optional shipToBusinessPartner fetch failed:",
            err.message
          );
        }
      }

      // console.log(
      //   "shipToBusinessPartnerResshipToBusinessPartnerResshipToBusinessPartnerRes",
      //   shipToBusinessPartnerRes?.data
      // );

      const shipAddr = shipTo?.to_BusinessPartnerAddress?.results?.[0];
      console.log("shipAddr", shipAddr);

      const stateCodeMap = {
        AN: "35",
        AP: "37",
        AR: "12",
        AS: "18",
        BR: "10",
        CH: "04",
        CT: "22",
        DL: "07",
        DN: "26",
        GA: "30",
        GJ: "24",
        HR: "06",
        HP: "02",
        JK: "01",
        JH: "20",
        KA: "29",
        KL: "32",
        LA: "38",
        LD: "31",
        MH: "27",
        ML: "17",
        MN: "14",
        MP: "23",
        MZ: "15",
        NL: "13",
        OD: "21",
        PB: "03",
        PY: "34",
        RJ: "08",
        SK: "11",
        TN: "33",
        TS: "36",
        TR: "16",
        UP: "09",
        UK: "05",
        WB: "19",
        DNHDD: "26", // For Dadra and Nagar Haveli and Daman and Diu
        DH: "26", // For Dadra and Nagar Haveli and Daman and Diu
        DD: "26", // For Dadra and Nagar Haveli and Daman and Diu
      };

      const regionCode = shipAddr?.Region;
      console.log("shipAddr.Region", regionCode);
      const stateCode = stateCodeMap[regionCode] || "null"; // fallback to "ODATA"
      console.log("stateCode", stateCode);

      const shipGstin = shipTo?.to_BusinessPartnerTax?.results?.find(
        (t) => t.BPTaxType === "IN1"
      )?.BPTaxNumber;

      // console.log("shipToBusinessPartnerResName", shipToBusinessPartnerResName);
      // console.log("shipGstin", shipGstin);

      // 3. Pricing
      const pricingURLs = itemsRaw.map(
        (item) =>
          `${baseURL}/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocumentItem(BillingDocument='${billingDocumentId}',BillingDocumentItem='${item.BillingDocumentItem}')/to_PricingElement?$format=json`
      );
      // console.log("🔗 Pricing URLs generated:", pricingURLs.length);

      const pricingResponses = await Promise.all(
        pricingURLs.map((url) => axios.get(url, { headers }))
      );
      // console.log("✅ Pricing data fetched", pricingResponses);

      const pricingData = pricingResponses.flatMap(
        (res) => res.data?.d?.results || []
      );
      // === 9. Process Items + Totals ===
      let totalAmount = 0,
        totalCGST = 0,
        totalSGST = 0,
        totalIGST = 0;
      let totalFreight = 0,
        totalInsurance = 0,
        totalFOB = 0;
      let totalQty = 0;

      const items = itemsRaw.map((item) => {
        const itemPricing = pricingData.filter(
          (p) => p.BillingDocumentItem === item.BillingDocumentItem
        );
        let base = 0,
          igst = 0,
          cgst = 0,
          sgst = 0;
        let igstRate = 0,
          cgstRate = 0,
          sgstRate = 0;
        let freight = 0,
          insurance = 0,
          fob = 0;

        for (const p of itemPricing) {
          const amt = parseFloat(p.ConditionAmount || 0);
          const rate = parseFloat(p.ConditionRateValue || 0);
          switch (p.ConditionType) {
            case "ZPR0":
            case "ZVAL":
              base += amt;
              break;
            case "JIIG":
            case "JOIG":
              igst += amt;
              igstRate = rate;
              break;
            case "JICG":
            case "JOCG":
              cgst += amt;
              cgstRate = rate;
              break;
            case "JISG":
            case "JOUG":
              sgst += amt;
              sgstRate = rate;
              break;
            case "ZFRE":
              freight += amt;
              break;
            case "ZINS":
              insurance += amt;
              break;
            case "ZFOB":
              fob += amt;
              break;
          }
        }
        // console.log("itemPricing", itemPricing);

        const qty = parseFloat(item.BillingQuantity || 0);
        const rate = qty ? base / qty : 0;

        totalQty += qty;
        totalAmount += base;
        totalCGST += cgst;
        totalSGST += sgst;
        totalIGST += igst;
        totalFreight += freight;
        totalInsurance += insurance;
        totalFOB += fob || base;

        return {
          description: item.BillingDocumentItemText,
          qty,
          rate: rate.toFixed(2),
          amount: base.toFixed(2),
          hsn: item?.MaterialGroup || "NA",
          baseUnit: item.BaseUnit || item.BillingQuantityUnit || "NA", // ✅ Add this line
          transactionCurrency:
            itemPricing?.[0]?.TransactionCurrency ||
            bill?.TransactionCurrency ||
            null,
          exchangeRate: parseFloat(
            itemPricing?.[0]?.to_BillingDocumentItem
              ?.AbsltPriceDetnExchangeRate ??
              bill?.[0]?.to_Item?.AbsltPriceDetnExchangeRate ??
              "0"
          ).toFixed(2),
          tax: {
            igst: igst.toFixed(2),
            cgst: cgst.toFixed(2),
            sgst: sgst.toFixed(2),
            igstRate,
            cgstRate,
            sgstRate,
          },
        };
      });

      console.log("🧾 Items processed:", items);

      const totalInvoice = totalAmount + totalCGST + totalSGST + totalIGST;
      const formattedDate = formatDate(bill.BillingDocumentDate);

      // IRN
      // Initialize IRN-related fields
      let irnNumber = null;
      let acknowledgementNumber = null;
      let acknowledgementDate = null;
      let irnStatus = null;
      let cancellationDate = null;
      let einvoiceSignedJson = null;
      let einvoiceSignedQr = null;
      let createdBy = null;
      let createdDate = null;
      let createdTime = null;
      let officialDocumentNumber = null;
      let documentYear = null;
      let documentType = null;
      let companyCode = null;
      let version = null;

      if (billingDocumentId) {
        try {
          const irnResponse = await axios.get(
            `${baseURL}/sap/opu/odata4/sap/zui_invrefnum_bind/srvd/sap/zui_invrefnum_srv/0001/RefNum?$filter=Docno eq '${billingDocumentId}'`,
            { headers }
          );

          const irnRecords = irnResponse?.data?.value;
          if (Array.isArray(irnRecords) && irnRecords.length > 0) {
            const irnData = irnRecords[0];

            // Save required IRN details
            irnNumber = irnData?.Irn || null;
            acknowledgementNumber = irnData?.AckNo || null;
            acknowledgementDate = irnData?.AckDate || null;
            irnStatus = irnData?.IrnStatus || null;
            cancellationDate = irnData?.CancelDate || null;
            einvoiceSignedJson = irnData?.SignedInv || null;
            einvoiceSignedQr = irnData?.SignedQrcode || null;

            // Additional useful fields
            createdBy = irnData?.Ernam || null;
            createdDate = irnData?.Erdat || null;
            createdTime = irnData?.Erzet || null;
            officialDocumentNumber = irnData?.Odn || null;
            documentYear = irnData?.DocYear || null;
            documentType = irnData?.DocType || null;
            companyCode = irnData?.Bukrs || null;
            version = irnData?.Version || null;
          }
        } catch (err) {
          console.warn("⚠️ Failed to fetch IRN data:", err.message);
        }
      }

      // Group and aggregate tax summary by HSN
      const taxSummaryMap = {};

      items.forEach((item) => {
        const hsn = item.hsn || "NA";
        if (!taxSummaryMap[hsn]) {
          taxSummaryMap[hsn] = {
            hsn,
            taxableAmount: 0,
            igst: 0,
            cgst: 0,
            sgst: 0,
            igstRate: 0,
            cgstRate: 0,
            sgstRate: 0,
            conditionTypes: [], // New: for ConditionTypes used
            conditionRates: {}, // New: map of {conditionType: rate}
          };
        }

        taxSummaryMap[hsn].taxableAmount += parseFloat(item.amount || 0);
        taxSummaryMap[hsn].igst += parseFloat(item.tax.igst || 0);
        taxSummaryMap[hsn].cgst += parseFloat(item.tax.cgst || 0);
        taxSummaryMap[hsn].sgst += parseFloat(item.tax.sgst || 0);
        taxSummaryMap[hsn].igstRate = item.tax.igstRate || 0;
        taxSummaryMap[hsn].cgstRate = item.tax.cgstRate || 0;
        taxSummaryMap[hsn].sgstRate = item.tax.sgstRate || 0;
        // Track condition types and their rates
        const taxTypes = ["igst", "cgst", "sgst"];
        for (const type of taxTypes) {
          const rateKey = type + "Rate";
          if (item.tax[rateKey]) {
            taxSummaryMap[hsn].conditionTypes.push(type.toUpperCase()); // e.g., IGST
            taxSummaryMap[hsn].conditionRates[type.toUpperCase()] =
              item.tax[rateKey];
          }
        }
      });

      const taxSummary = Object.values(taxSummaryMap).map((entry) => ({
        hsn: entry.hsn,
        taxableAmount: entry.taxableAmount.toFixed(2),
        igst: entry.igst.toFixed(2),
        cgst: entry.cgst.toFixed(2),
        sgst: entry.sgst.toFixed(2),
        igstRate: entry.igstRate ? `${entry.igstRate}%` : null,
        cgstRate: entry.cgstRate ? `${entry.cgstRate}%` : null,
        sgstRate: entry.sgstRate ? `${entry.sgstRate}%` : null,
        totalTaxAmount: (entry.igst + entry.cgst + entry.sgst).toFixed(2),
        // 🔍 Add these for debug/reference:
        conditionTypes: entry.conditionTypes,
        conditionRates: entry.conditionRates,
      }));

      // 🧠 Auto-detect invoice type
      let documentTypeDetect = "";
      let documentTitle = "";

      const isDomestic =
        (addr?.Country || "").toUpperCase() === "IN" &&
        bill?.TransactionCurrency === "INR" &&
        (bill?.CustomerTaxClassification1 === "0" ||
          bill?.CustomerTaxClassification1 === "1");

      const isExportIGST =
        (addr?.Country || "").toUpperCase() !== "IN" &&
        parseFloat(totalIGST) > 0;

      const isExportLUT =
        (addr?.Country || "").toUpperCase() !== "IN" &&
        parseFloat(totalIGST) === 0 &&
        bill?.TransactionCurrency !== "INR";

      console.log("🌍 isDomestic:", isDomestic);
      console.log("🚢 isExportIGST:", isExportIGST);
      console.log("🛫 isExportLUT:", isExportLUT);

      if (isExportIGST) {
        documentTypeDetect = "EXPORT INVOICE - IGST";
        documentTitle = "EXPORT INVOICE";
      } else if (isExportLUT) {
        documentTypeDetect = "EXPORT INVOICE - LUT";
        documentTitle = "EXPORT INVOICE";
      } else if (isDomestic) {
        documentTypeDetect = "TAX INVOICE";
        documentTitle = "TAX INVOICE";
      } else {
        documentTypeDetect = "N/A";
        documentTitle = "N/A";
      }

      console.log("🧾 Detected Document Type:", documentTypeDetect);
      console.log("📄 Document Title:", documentTitle);
      const partners = bill._Partner || [];
      const soldToId = partners.find(
        (p) => p.PartnerFunction === "AG"
      )?.Customer;
      const billToId = partners.find(
        (p) => p.PartnerFunction === "RG"
      )?.Customer;

      const fetchPartnerDetails = async (partnerId) => {
        if (!partnerId) return { name: "UNKNOWN", address: {} };
        try {
          const { data } = await axios.get(
            `${baseURL}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner('${partnerId}')?$expand=to_BusinessPartnerAddress,to_Supplier&$format=json`,
            { headers }
          );
          const bp = data?.d;
          const addr = bp?.to_BusinessPartnerAddress?.results?.[0];
          return {
            name:
              bp?.BusinessPartnerName || bp?.OrganizationBPName1 || "UNKNOWN",
            address: {
              street: addr?.StreetName || "N/A",
              city: addr?.CityName || "N/A",
              region: addr?.Region || "N/A",
              postalCode: addr?.PostalCode || "N/A",
              country: addr?.Country || "N/A",
            },
          };
        } catch (_) {
          return { name: "UNKNOWN", address: {} };
        }
      };

      // === 5. Fetch Partner Details (Sold-To, Bill-To, etc.) ===
      const [soldTo] = await Promise.all([fetchPartnerDetails(soldToId)]);
      const totalCIF = totalFOB + totalFreight + totalInsurance + totalIGST;
      const baseUnit =
        itemsRaw[0]?.BaseUnit || itemsRaw[0]?.BillingQuantityUnit || "NA";

      // console.log("📦 Final totals computed", taxSummary);

      return {
        type: documentTypeDetect,
        title: documentTitle,
        generateTaxInvoiceData: {
          document: {
            type: documentTypeDetect,
            title: documentTitle,
            number: bill?.BillingDocument || null,
            date: formattedDate || null,
            numberDate: `${bill?.BillingDocument || ""} Dt. ${
              bill?.BillingDocumentDate || ""
            }`,
            gstin: gstin || null,
            currency: bill?.TransactionCurrency || null,

            // IRN Details
            irn: irnNumber || null,
            ackNo: acknowledgementNumber || null,
            ackDate: acknowledgementDate || null,
            irnStatus: irnStatus || null,
            cancelDate: cancellationDate || null,
            eInvoice: !!irnNumber,

            // Metadata
            version: version || null,
            createdBy: createdBy || null,
            createdDate: createdDate || null,
            createdTime: createdTime || null,
            officialDocumentNumber: officialDocumentNumber || null,
            documentYear: documentYear || null,
            documentType: documentType || null,
            companyCode: companyCode || null,
            einvoiceSignedQr: einvoiceSignedQr || null,
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
              partner?.BusinessPartnerName ||
              partner?.OrganizationBPName1 ||
              null,
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
            contactPerson: shipToBusinessPartnerResName || null,
            contact: businessPartnerPhoneNumber || null,
            email: shipToBusinessPartnerResEmail || null,
          },

          consignee: {
            name:
              shipTo?.BusinessPartnerName ||
              shipTo?.OrganizationBPName1 ||
              null,
            address: `${shipAddr?.StreetName || ""}, ${
              shipAddr?.CityName || ""
            }, ${shipAddr?.Region || ""} ${shipAddr?.PostalCode || ""}`.trim(),
            gstin: shipGstin || null,
            state: shipAddr?.Region || null,
            stateCode: stateCode || null,
            contactPerson: shipToBusinessPartnerResName || null,
            contact: businessPartnerPhoneNumber || null,
            email: shipToBusinessPartnerResEmail || null,
          },

          transport: {
            dispatchedThrough: null,
            lrNo: null,
            destination: addr?.CityName || null,
            deliveryNoteDate: formattedDate,
            BillingInstructionLongText: bill?.BillingDocument || null,
            referenceNo: bill?.BillingDocument || null,
            referenceDate: formattedDate,
            buyerOrderNo: null,
            buyerOrderDate: formattedDate,
            termsOfPayment: CustomerPaymentTermsTextValue || null,
            otherReferences: null,
          },

          items, // Already mapped array from pricing logic

          taxSummary, // Already aggregated array from pricing logic

          totals: {
            base: totalAmount.toFixed(2),
            cgst: totalCGST.toFixed(2),
            sgst: totalSGST.toFixed(2),
            igst: totalIGST.toFixed(2),
            grandTotal: totalInvoice.toFixed(2),
            amountInWords: totalInvoice
              ? `${toWords(Math.floor(totalInvoice)).toUpperCase()} ONLY`
              : null,
            taxAmountInWords:
              totalCGST + totalSGST + totalIGST
                ? `${toWords(
                    Math.floor(totalCGST + totalSGST + totalIGST)
                  ).toUpperCase()} ONLY`
                : null,
          },

          declaration: null,
          jurisdiction: null,
          isComputerGenerated: true,
        },
        generateExportInvoiceData: {
          document: {
            type: documentTypeDetect,
            title: documentTitle,
            titleDescription:
              "(SUPPLY MEANT FOR EXPORT/SUPPLY TO SEZ UNIT OR SEZ DEVELOPER FOR AUTHORISED OPERATIONS UNDER BOND OR LETTER OF UNDERTAKING WITHOUT PAYMENT OF IGST)",
            number: bill?.BillingDocument ?? null,
            date: formatDate(bill?.BillingDocumentDate) ?? null,
            numberDate: `${bill?.BillingDocument || ""} Dt.${
              bill?.BillingDocumentDate || ""
            }`,

            gstin: gstin || null,
            currency: bill?.TransactionCurrency || null,

            // IRN Details
            irn: irnNumber || null,
            ackNo: acknowledgementNumber || null,
            ackDate: acknowledgementDate || null,
            irnStatus: irnStatus || null,
            cancelDate: cancellationDate || null,
            eInvoice: !!irnNumber,

            // Metadata
            version: version || null,
            createdBy: createdBy || null,
            createdDate: createdDate || null,
            createdTime: createdTime || null,
            officialDocumentNumber: officialDocumentNumber || null,
            documentYear: documentYear || null,
            documentType: documentType || null,
            companyCode: companyCode || null,
            einvoiceSignedQr: einvoiceSignedQr || null,
          },

          exporter: {
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
              partner?.BusinessPartnerName ||
              partner?.OrganizationBPName1 ||
              null,
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
            contactPerson: shipToBusinessPartnerResName || null,
            contact: businessPartnerPhoneNumber || null,
            email: shipToBusinessPartnerResEmail || null,
          },

          consignee: {
            name:
              shipTo?.BusinessPartnerName ||
              shipTo?.OrganizationBPName1 ||
              null,
            address: `${shipAddr?.StreetName || ""}, ${
              shipAddr?.CityName || ""
            }, ${shipAddr?.Region || ""} ${shipAddr?.PostalCode || ""}`.trim(),
            gstin: shipGstin || null,
            state: shipAddr?.Region || null,
            stateCode: stateCode || null,
            contactPerson: shipToBusinessPartnerResName || null,
            contact: businessPartnerPhoneNumber || null,
            email: shipToBusinessPartnerResEmail || null,
          },

          shipping: {
            preCarriageBy: bill?.ShippingCondition ?? null,
            placeOfReceipt: "UNKNOWN",
            termsOfDelivery: bill?.IncotermsClassification ?? null,
            termsOfPayment: CustomerPaymentTermsTextValue ?? null,
            portOfDischarge: "IN",
            finalDestination: soldTo?.address?.country ?? null,
            countryInfo: {
              origin: "IN",
              destination: "IN",
            },
          },

          transport: {
            dispatchedThrough: null,
            lrNo: null,
            destination: soldTo?.address?.city ?? null,
            deliveryNoteDate: formatDate(bill?.BillingDocumentDate) ?? null,
            BillingInstructionLongText: bill?.BillingDocument ?? null,
            referenceNo: bill?.BillingDocument ?? null,
            referenceDate: formatDate(bill?.BillingDocumentDate) ?? null,
            buyerOrderNo: null,
            buyerOrderDate: formatDate(bill?.BillingDocumentDate) ?? null,
            termsOfPayment: CustomerPaymentTermsTextValue ?? null,
            otherReferences: null,
          },

          items: items ?? [],
          taxSummary: taxSummary ?? [],

          totals: {
            base: totalAmount?.toFixed(2) ?? "0.00",
            cgst: totalCGST?.toFixed(2) ?? "0.00",
            sgst: totalSGST?.toFixed(2) ?? "0.00",
            igst: totalIGST?.toFixed(2) ?? "0.00",
            freight: totalFreight?.toFixed(2) ?? "0.00",
            insurance: totalInsurance?.toFixed(2) ?? "0.00",
            totalFOB: totalFOB?.toFixed(2) ?? "0.00",
            grandTotal: totalInvoice?.toFixed(2) ?? "0.00",
            totalCIF: totalCIF?.toFixed(2) ?? "0.00",
            totalQty: totalQty?.toFixed(2) ?? "0.00", // ✅ TOTAL QTY
            baseUnit: baseUnit,
            transactionCurrencyAmount:
              totalFOB /
              parseFloat(itemsRaw[0]?.AbsltStatisticsExchangeRate || 0).toFixed(
                2
              ),
            transactionCurrency: itemsRaw[0]?.TransactionCurrency || null,
            exchangeRate: parseFloat(
              itemsRaw[0]?.AbsltStatisticsExchangeRate || 0
            ).toFixed(2),

            amountInWords: totalInvoice
              ? `${toWords(Math.floor(totalInvoice)).toUpperCase()} ONLY`
              : null,
            taxAmountInWords:
              totalCGST + totalSGST + totalIGST
                ? `${toWords(
                    Math.floor(totalCGST + totalSGST + totalIGST)
                  ).toUpperCase()} ONLY`
                : null,
          },

          packaging: {
            marksAndNos: "",
            numberAndKindOfPackages: "",
            grossWeight: "",
            netWeight: "",
          },
        },
      };
    } catch (err) {
      console.error(
        "❌ Error in Tax Invoice Generation:",
        err.response?.data || err.message
      );
      return req.error(500, "Error generating tax invoice");
    }
  });

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Export Invoice
};
