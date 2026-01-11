import axios from "axios";

// Smart base URL handling
export const BASE =
  process.env.NODE_ENV === "development"
    ? "http://localhost:4004/rest/billing" // only for local mock dev (optional)
    : "/rest/billing"; // for deployed via Approuter

// export const BASE = "http://localhost:4004/rest/billing";
// API functions
export async function fetchBillingDocs() {
  const res = await axios.get(`${BASE}/BillingDocuments`);
  return res.data;
}

export async function fetchBillingDocsZapi() {
  const res = await axios.get(`${BASE}/getBillingDocsZdata`);
  return res.data;
}

export async function fetchgetMaterialDocumentItem() {
  const res = await axios.get(`${BASE}/getMaterialDocumentItem`);
  return res.data;
}

export async function fetchInvoiceHtml(ID) {
  const res = await axios.get(`${BASE}/getInvoiceHtml`, {
    params: { ID },
  });
  return res.data;
}

// Fetch material document details for label printing
export async function getMaterialDocumentDetails(selections) {
  // selections may be an array of MaterialDocument strings (legacy),
  // or composite ids like '12345-10' (MaterialDocument-MaterialDocumentItem),
  // or objects { MaterialDocument, MaterialDocumentItem }.
  if (!Array.isArray(selections)) selections = [];

  // If composite strings, convert to objects
  const materialDocumentItems = selections
    .map((s) => {
      if (!s) return null;
      if (typeof s === "string" && s.includes("-")) {
        const [doc, item] = s.split("-");
        return { MaterialDocument: doc, MaterialDocumentItem: item };
      }
      if (typeof s === "object") {
        // allow direct pass-through
        return {
          MaterialDocument: s.MaterialDocument || s.materialDocument,
          MaterialDocumentItem:
            s.MaterialDocumentItem || s.materialDocumentItem,
        };
      }
      // fallback: treat as whole-document selection
      return { MaterialDocument: s };
    })
    .filter(Boolean);

  const payload = { MaterialDocumentItems: materialDocumentItems };
  const res = await axios.post(`${BASE}/getMaterialDocumentDetails`, payload);
  return res.data;
}

// Server-side PDF generation: sends mappedData and optional qrImages, returns blob
// export async function generateLabelPdf(mappedData, qrImages = []) {
//   const res = await axios.post(
//     `${BASE}/generateLabelPdf`,
//     { mappedData, qrImages },
//     { responseType: "blob" }
//   );
//   return res.data;
// }

export async function generateLabelPdf(mappedData, qrImages = []) {
  const res = await axios.post(
    `${BASE}/generateLabelPdf`,
    { mappedData, qrImages },
    {
      responseType: "blob", // 🔥 REQUIRED
      headers: {
        Accept: "application/pdf",
      },
    }
  );

  return res.data;
}

export async function fetchGetMaterialDocumentHeader() {
  const res = await axios.get(`${BASE}/getMaterialDocument`);
  return res.data;
}
