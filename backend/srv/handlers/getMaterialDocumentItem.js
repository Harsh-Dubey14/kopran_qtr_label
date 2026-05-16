const axios = require("axios");
const { ToWords } = require("to-words");
const { auth, baseURL } = require("../../utils/constants");

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: {
    currency: false,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
  },
});

const SERVICE_VERSION = "v1.3.0";
const SERVICE_VERSION_TIMESTAMP = new Date().toISOString();

const SERVICE_CHANGELOG = {
  "v1.0.0": {
    note: "Initial version",
  },
  "v1.1.0": {
    note: "Filtered GoodsMovementType = 101 and added pagination.",
  },
  "v1.2.0": {
    note: "Shows all MaterialDocument values where GoodsMovementType = 101.",
  },
  "v1.3.0": {
    note: "Removed pagination logic and fetches all records directly.",
  },
};

module.exports = (srv) => {
  const baseURLConfig = `${baseURL}`;

  const headers = {
    Authorization: `Basic ${auth}`,
    Cookie: "sap-usercontext=sap-client=100",
    Accept: "application/json",
  };

  srv.on("getMaterialDocumentItem", async (req) => {
    try {
      const endpoint =
        `sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem` +
        `?$format=json` +
        `&$filter=GoodsMovementType eq '101'` +
        `&$orderby=MaterialDocument desc`;

      const fullURL = new URL(endpoint, baseURLConfig).toString();

      console.log("🔵 Fetching:", fullURL);

      const res = await axios.get(fullURL, { headers });

      const results = res?.data?.d?.results || [];

      const uniqueDocs = [
        ...new Map(
          results.map((item) => [item.MaterialDocument, item])
        ).values(),
      ];

      return {
        status: 200,
        serviceVersion: SERVICE_VERSION,
        serviceVersionTimestamp: SERVICE_VERSION_TIMESTAMP,
        changelog: SERVICE_CHANGELOG,
        fetchedAt: new Date().toISOString(),

        payloadLength: uniqueDocs.length,
        message:
          uniqueDocs.length > 0
            ? "Material documents fetched successfully."
            : "No records found.",

        data: uniqueDocs,
      };
    } catch (err) {
      console.error("❌ Error:", err.message);

      req.error(500, {
        status: 500,
        message: "Failed to fetch Material Documents.",
        details: err.message,
      });
    }
  });
};