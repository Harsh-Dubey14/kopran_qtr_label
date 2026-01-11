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
 */
const SERVICE_VERSION = "v1.0.1";
const SERVICE_VERSION_TIMESTAMP = new Date().toISOString();

const SERVICE_CHANGELOG = {
  "v1.0.0": {
    note:
      "Initial version with tax/export invoice structure, dynamic incoterms, batch-wise MB logic, and HSN totals.",
  },
  "v1.0.1": {
    note: "Fixed handler stability issues and removed undefined variables.",
  },
};

module.exports = (srv) => {
  const headers = {
    Authorization: `Basic ${auth}`,
    Cookie: "sap-usercontext=sap-client=100",
    Accept: "application/json",
  };

  // ------------------------------------------------
  // GET Material Document Header
  // ------------------------------------------------
  srv.on("getMaterialDocument", async (req) => {
    try {
      const endpoint =
        "/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentHeader?$format=json&$top=10000";

      const fullURL = new URL(endpoint, baseURL).toString();
      console.log("🔵 Fetching data from URL:", fullURL);

      const response = await axios.get(fullURL, { headers });

      // ✅ Always define results
      const results = response?.data?.d?.results || [];

      // OPTIONAL: sort by MaterialDocument (latest first)
      results.sort((a, b) =>
        (b.MaterialDocument || "").localeCompare(
          a.MaterialDocument || "",
          undefined,
          { numeric: true }
        )
      );

      const payloadLength = results.length;
      console.log(
        `✅ Successfully fetched ${payloadLength} Material Document(s) from S/4HANA.`
      );

      const fieldsSummary =
        payloadLength > 0 ? Object.keys(results[0]) : [];

      // ✅ Return CDS-safe structured response
      return {
        status: 200,
        serviceVersion: SERVICE_VERSION,
        serviceVersionTimestamp: SERVICE_VERSION_TIMESTAMP,
        changelog: SERVICE_CHANGELOG,
        fetchedAt: new Date().toISOString(),
        requestUrl: fullURL,
        payloadLength,
        fields: fieldsSummary,
        message: "Material Document fetched successfully.",
        data: results,
      };
    } catch (err) {
      console.error("❌ Failed to fetch Material Document");

      if (err.response) {
        console.error("🔴 HTTP Status:", err.response.status);
        console.error(
          "🔴 Response Data:",
          JSON.stringify(err.response.data, null, 2)
        );
      } else {
        console.error("🔴 Error Message:", err.message);
      }

      // ✅ CDS-compliant error
      req.error(500, {
        message: "Failed to fetch Material Document from S/4HANA.",
        details: [{ message: err.message }],
      });
    }
  });                              
};
