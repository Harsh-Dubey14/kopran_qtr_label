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

/**
 * =============================================
 * 🚀 Service Versioning - Semantic Versioning
 * =============================================
 * - v1.0.0: Initial stable version
 * - v1.1.0: Add new fields
 * - v2.0.0: Major logic or response shape change
 * - v1.0.1: Bug fix or hotfix
 *
 * Update the version and changelog whenever:
 *  - You add or remove fields (minor)
 *  - You change the response structure (major)
 *  - You fix logic without changing the output schema (patch)
 */
const SERVICE_VERSION = "v1.0.0";
const SERVICE_VERSION_TIMESTAMP = new Date().toISOString();

const SERVICE_CHANGELOG = {
  "v1.0.0": {
    note: "Initial version with tax/export invoice structure, dynamic incoterms, batch-wise MB logic, and HSN totals.",
  },
  "v1.1.0": {
    note: "Added structured service versioning metadata to response and changelog timestamps.",
  },
};

module.exports = (srv) => {
  const baseURLConfig = `${baseURL}`;

  const headers = {
    Authorization: `Basic ${auth}`,
    Cookie: "sap-usercontext=sap-client=100",
    Accept: "application/json",
  };

  // ANCHOR - getMaterialDocumentItem
  srv.on("getMaterialDocumentItem", async (req) => {
    try {
      // Request all items (increase $top if needed). Keeping $format=json
      // to ensure JSON payload from the OData service.
      const endpoint =
        "sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem?$format=json&$top=10000";

      // Construct and validate the full URL
      const fullURL = new URL(endpoint, baseURLConfig).toString();
      console.log("🔵 Fetching data from URL:", fullURL);

      const res = await axios.get(fullURL, { headers });

      // Filter results where DebitCreditCode is "H" and sort by MaterialDocument descending (latest first)
      // const sortedResults = (res?.data?.d?.results || [])
      //   .filter((item) => item.DebitCreditCode === "H")
      //   .sort((a, b) => {
      //     const docA = (a.MaterialDocument || "").toString();
      //     const docB = (b.MaterialDocument || "").toString();
      //     return docB.localeCompare(docA, undefined, { numeric: true });
      //   });
      const sortedResults = (res?.data?.d?.results || [])
  .sort((a, b) => {
    const docA = (a.MaterialDocument || "").toString();
    const docB = (b.MaterialDocument || "").toString();
    return docB.localeCompare(docA, undefined, { numeric: true });
  });


      const payloadLength = sortedResults.length;
      console.log(
        `✅ Successfully fetched ${payloadLength} Material Document Items from S/4HANA.`
      );

      // Build a small fields summary if there is at least one result
      const fieldsSummary =
        (payloadLength && Object.keys(sortedResults[0])) || [];

      // Return a structured response including service versioning metadata
      return {
        status: 200,
        serviceVersion: SERVICE_VERSION,
        serviceVersionTimestamp: SERVICE_VERSION_TIMESTAMP,
        changelog: SERVICE_CHANGELOG,
        fetchedAt: new Date().toISOString(),
        requestUrl: fullURL,
        payloadLength,
        fields: fieldsSummary,
        message: "Material documents Items fetched successfully.",
        data: sortedResults,
      };
    } catch (err) {
      console.error("❌ Failed to fetch Material Document Items:");

      if (err.response) {
        console.error("🔴 HTTP Status:", err.response.status);
        console.error(
          "🔴 Response Data:",
          JSON.stringify(err.response.data, null, 2)
        );
      } else if (err.request) {
        console.error("🔴 No response received from the server:", err.request);
      } else {
        console.error("🔴 Error Message:", err.message);
      }

      // Return a meaningful error response
      req.error(500, {
        status: 500,
        message: "Failed to fetch Material Document Items from S/4HANA.",
        details: err.message,
      });
    }
  });
};
