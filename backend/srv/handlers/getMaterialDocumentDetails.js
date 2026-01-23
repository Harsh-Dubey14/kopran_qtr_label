const axios = require("axios");
const { auth, baseURL } = require("../../utils/constants");

// Simple in-memory caches to avoid repeated network calls during and across requests
const productCache = new Map(); // key: `${material}-${plant}` -> product description object
const supplierCache = new Map(); // key: supplierCode -> supplier data
const headerCache = new Map(); // key: `${doc}-${year}` -> header object or parsed XML
const manufacturerCache = new Map();
const businessUserCache = new Map();
// key: MaterialDocument -> business user record

// key: ManfNo -> ManfoDtls record

// Function to parse Atom XML response for header
function parseHeaderXML(xmlString) {
  const postingDateMatch = xmlString.match(
    /<d:PostingDate>(.*?)<\/d:PostingDate>/,
  );
  const manufactureDateMatch = xmlString.match(
    /<d:ManufactureDate>(.*?)<\/d:ManufactureDate>/,
  );
  const expiryDateMatch = xmlString.match(
    /<d:ShelfLifeExpirationDate>(.*?)<\/d:ShelfLifeExpirationDate>/,
  );
  return {
    PostingDate: postingDateMatch ? postingDateMatch[1] : "",
    ManufactureDate: manufactureDateMatch ? manufactureDateMatch[1] : "",
    ShelfLifeExpirationDate: expiryDateMatch ? expiryDateMatch[1] : "",
  };
}

// Function to format date to dd/MM/YYYY
function formatDate(dateStr) {
  if (!dateStr) return "";
  let date;
  if (dateStr.startsWith("/Date(") && dateStr.endsWith(")/")) {
    const ms = parseInt(dateStr.slice(6, -2));
    date = new Date(ms);
  } else {
    date = new Date(dateStr);
  }
  if (isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper function to chunk array
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
const purchaseOrderHeaderCache = new Map(); // key: PurchaseOrder
// Build OData $batch multipart/mixed body for an array of relative GET URLs
function buildBatchBody(getPaths, boundary) {
  const CRLF = "\r\n";
  let body = "";
  getPaths.forEach((path) => {
    body += `--${boundary}${CRLF}`;
    body += `GET ${path} HTTP/1.1${CRLF}`;
    body += `Accept: application/json${CRLF}${CRLF}`;
  });
  body += `--${boundary}--` + CRLF;
  return body;
}

// Parse multipart/mixed batch response and extract JSON bodies (best-effort)
function parseBatchResponse(text, boundary) {
  const parts = text.split(`--${boundary}`);
  const jsonBodies = [];
  for (const part of parts) {
    const firstBrace = part.indexOf("{");
    const lastBrace = part.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonText = part.slice(firstBrace, lastBrace + 1);
      try {
        const obj = JSON.parse(jsonText);
        jsonBodies.push(obj);
      } catch (e) {
        // ignore parse errors for this part
      }
    }
  }
  return jsonBodies;
}

module.exports = (srv) => {
  const baseURLConfig = `${baseURL}`;

  const headers = {
    Authorization: `Basic ${auth}`,
    Cookie: "sap-usercontext=sap-client=100",
    Accept: "application/json",
  };

  // Simple Material Document fetch for invoice generation
  srv.on("getMaterialDocumentDetails", async (req) => {
    // Accept either:
    // - MaterialDocuments: [ '123', '456' ] (legacy)
    // - MaterialDocumentItems: [ { MaterialDocument, MaterialDocumentItem }, ... ]
    // - composite strings posted by client via api client: [ '123-10', ... ]
    const {
      MaterialDocuments,
      MaterialDocumentItems,
      MaterialDocument,
      MaterialDocumentYear,
    } = req.data || {};

    let docItems = [];

    // ✅ NEW: Single document + year support
    if (MaterialDocument && MaterialDocumentYear) {
      docItems = [
        {
          doc: String(MaterialDocument),
          year: String(MaterialDocumentYear),
          item: null,
        },
      ];
    }

    // Existing: multiple items
    else if (
      Array.isArray(MaterialDocumentItems) &&
      MaterialDocumentItems.length > 0
    ) {
      docItems = MaterialDocumentItems.map((it) => ({
        doc: String(it.MaterialDocument || it.materialDocument || ""),
        year: String(it.MaterialDocumentYear || it.materialDocumentYear || ""),
        item: String(it.MaterialDocumentItem || it.materialDocumentItem || ""),
      }));
    }

    // Existing: legacy documents only
    else if (Array.isArray(MaterialDocuments) && MaterialDocuments.length > 0) {
      docItems = MaterialDocuments.map((d) => ({
        doc: String(d),
        item: null,
      }));
    } else {
      return req.error(
        400,
        "Provide MaterialDocument + MaterialDocumentYear OR MaterialDocumentItems OR MaterialDocuments",
      );
    }

    try {
      // Timing instrumentation for debugging performance
      const timings = {};
      const overallStart = Date.now();
      const batchSize = 50; // Reduced batch size to avoid URI too long errors
      const batchPromises = [];

      // Build batches of filters; when item is present, filter by both doc and item
      for (let i = 0; i < docItems.length; i += batchSize) {
        const batch = docItems.slice(i, i + batchSize);
        const docFilters = batch
          .map(({ doc, year, item }) => {
            if (item && item !== "null" && item !== "undefined") {
              return `(MaterialDocument eq '${doc}' and MaterialDocumentItem eq '${item}')`;
            }
            if (year) {
              return `(MaterialDocument eq '${doc}' and MaterialDocumentYear eq '${year}')`;
            }
            return `MaterialDocument eq '${doc}'`;
          })
          .join(" or ");

        const endpoint = `sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentItem?$format=json&$filter=(${docFilters})`;
        const fullURL = new URL(endpoint, baseURLConfig).toString();

        batchPromises.push(axios.get(fullURL, { headers }));
      }

      timings.itemsStart = Date.now();
      const batchResponses = await Promise.all(batchPromises);
      timings.itemsMs = Date.now() - timings.itemsStart;
      let allItems = [];
      batchResponses.forEach((response) => {
        const items = response.data?.d?.results || [];
        allItems = allItems.concat(items);
      });

      let items = allItems;

      // Sorting deferred: we'll sort after headers are fetched so we can use PostingDate (newest first)

      // Get unique material-plant combinations (only if plant exists)
      const uniqueMaterialPlants = [
        ...new Set(
          items
            .filter((item) => item.Plant && item.Plant.trim())
            .map((item) => `${item.Material}-${item.Plant}`)
            .filter(Boolean),
        ),
      ];

      const itemsWithoutPlant = items.filter(
        (item) => !item.Plant || !item.Plant.trim(),
      );
      if (itemsWithoutPlant.length > 0) {
      }

      // Fetch product description for each unique material
      const materialDetailsMap = {};
      // Check cache first; only fetch missing product descriptions
      const missingMaterialPlants = uniqueMaterialPlants.filter(
        (mp) => !productCache.has(mp),
      );
      const concurrency = 50; // higher concurrency to reduce total rounds
      const materialChunks = chunkArray(missingMaterialPlants, concurrency);
      timings.materialsStart = Date.now();
      for (const chunk of materialChunks) {
        await Promise.all(
          chunk.map(async (matPlant) => {
            const [materialId] = matPlant.split("-");
            const product = materialId.trim();
            if (!product) {
              productCache.set(matPlant, {});
              return;
            }
            try {
              const paddedProduct = product.padStart(18, "0");
              const url = `${baseURLConfig}/sap/opu/odata4/sap/api_product/srvd_a2x/sap/product/0002/ProductDescription(Product='${paddedProduct}',Language='EN')`;
              const matRes = await axios.get(url, { headers });
              const value = matRes.data || {};
              productCache.set(matPlant, value);
            } catch (err) {
              console.error(
                `Failed to fetch product description for ${matPlant}:`,
                err.response?.status,
                err.response?.data || err.message,
              );
              productCache.set(matPlant, {});
            }
          }),
        );
      }
      timings.materialsMs = Date.now() - timings.materialsStart;
      // Populate materialDetailsMap from   cache
      uniqueMaterialPlants.forEach((mp) => {
        materialDetailsMap[mp] = productCache.get(mp) || {};
      });
      // Get unique suppliers
      const uniqueSuppliers = [
        ...new Set(items.map((item) => item.Supplier).filter(Boolean)),
      ];

      // Fetch supplier details for each unique supplier
      const supplierDetailsMap = {};
      // Only fetch missing suppliers (use cache)
      const missingSuppliers = uniqueSuppliers.filter(
        (s) => !supplierCache.has(s),
      );
      const supplierChunks = chunkArray(missingSuppliers, concurrency);
      timings.suppliersStart = Date.now();
      for (const chunk of supplierChunks) {
        await Promise.all(
          chunk.map(async (supplierCode) => {
            if (!supplierCode) {
              supplierCache.set(supplierCode, {});
              return;
            }
            try {
              const supplierPath = `A_Supplier('${encodeURIComponent(
                supplierCode,
              )}')`;
              const url = `${baseURLConfig}/sap/opu/odata/sap/API_BUSINESS_PARTNER/${supplierPath}`;
              const params = { $format: "json", $select: "SupplierName" };
              const supRes = await axios.get(url, { headers, params });
              supplierCache.set(supplierCode, supRes.data?.d || {});
            } catch (err) {
              console.error(
                `Failed to fetch supplier details for ${supplierCode}:`,
                err.response?.status,
                err.response?.data || err.message,
              );
              supplierCache.set(supplierCode, {});
            }
          }),
        );
      }
      timings.suppliersMs = Date.now() - timings.suppliersStart;
      // Populate from cache
      uniqueSuppliers.forEach((s) => {
        supplierDetailsMap[s] = supplierCache.get(s) || {};
      });
      // Get unique material documents for header fetch
      const uniqueDocYears = [
        ...new Map(
          items
            .filter(
              (item) => item.MaterialDocument && item.MaterialDocumentYear,
            )
            .map((item) => [
              `${item.MaterialDocument}-${item.MaterialDocumentYear}`,
              { doc: item.MaterialDocument, year: item.MaterialDocumentYear },
            ]),
        ).values(),
      ];
      // Fetch material document header details for each unique document
      const headerDetailsMap = {};
      // Only fetch missing headers
      const missingDocYears = uniqueDocYears.filter(
        ({ doc, year }) => !headerCache.has(`${doc}-${year}`),
      );
      // Use OData $batch to reduce HTTP overhead for header fetches
      const headerBatchSize = 50;
      const headerBatches = chunkArray(missingDocYears, headerBatchSize);
      timings.headersStart = Date.now();
      for (const batch of headerBatches) {
        try {
          const boundary = `batch_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;
          const getPaths = batch.map(
            ({ doc, year }) =>
              `/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/A_MaterialDocumentHeader(MaterialDocument='${encodeURIComponent(
                doc,
              )}',MaterialDocumentYear='${encodeURIComponent(
                year,
              )}')?$format=json`,
          );
          const batchBody = buildBatchBody(getPaths, boundary);
          const batchUrl = new URL(
            `/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/$batch`,
            baseURLConfig,
          ).toString();
          const batchHeaders = Object.assign({}, headers, {
            "Content-Type": `multipart/mixed; boundary=${boundary}`,
            Accept: "multipart/mixed",
          });
          const res = await axios.post(batchUrl, batchBody, {
            headers: batchHeaders,
            responseType: "text",
          });
          const parts = parseBatchResponse(res.data, boundary);
          for (let i = 0; i < batch.length; i++) {
            const { doc, year } = batch[i];
            const parsed = parts[i] || {};
            const value =
              typeof parsed === "string"
                ? parseHeaderXML(parsed)
                : parsed?.d || parsed || {};
            headerCache.set(`${doc}-${year}`, value);
          }
        } catch (err) {
          // fallback to individual requests for this batch on failure
          for (const { doc, year } of batch) {
            try {
              const headerPath = `A_MaterialDocumentHeader(MaterialDocument='${doc}',MaterialDocumentYear='${year}')`;
              const url = `${baseURLConfig}/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/${headerPath}`;
              const params = { $format: "json" };
              const hdrRes = await axios.get(url, { headers, params });
              if (typeof hdrRes.data === "string") {
                headerCache.set(`${doc}-${year}`, parseHeaderXML(hdrRes.data));
              } else {
                headerCache.set(`${doc}-${year}`, hdrRes.data?.d || {});
              }
            } catch (err2) {
              console.error(
                `Failed to fetch header details for ${doc}-${year}:`,
                err2.response?.status,
                err2.response?.data || err2.message,
              );
              headerCache.set(`${doc}-${year}`, {});
            }
          }
        }
      }
      timings.headersMs = Date.now() - timings.headersStart;
      // Populate headerDetailsMap from cache
      uniqueDocYears.forEach(({ doc, year }) => {
        headerDetailsMap[`${doc}-${year}`] =
          headerCache.get(`${doc}-${year}`) || {};
      });

      // --- Fetch material description for items without Plant (fallback) ---
      const uniqueMaterialsWithoutPlant = [
        ...new Set(itemsWithoutPlant.map((it) => it.Material).filter(Boolean)),
      ];
      const missingMaterialsOnly = uniqueMaterialsWithoutPlant.filter(
        (m) => !productCache.has(m),
      );
      const materialOnlyChunks = chunkArray(missingMaterialsOnly, concurrency);
      for (const chunk of materialOnlyChunks) {
        await Promise.all(
          chunk.map(async (material) => {
            if (!material) {
              productCache.set(material, {});
              return;
            }
            try {
              const paddedProduct = material.trim().padStart(18, "0");
              const url = `${baseURLConfig}/sap/opu/odata4/sap/api_product/srvd_a2x/sap/product/0002/ProductDescription(Product='${paddedProduct}',Language='EN')`;
              const matRes = await axios.get(url, { headers });
              productCache.set(material, matRes.data || {});
            } catch (err) {
              console.error(
                `Failed to fetch product description for material-only ${material}:`,
                err.response?.status,
                err.response?.data || err.message,
              );
              productCache.set(material, {});
            }
          }),
        );
      }

      const uniquePOItems = [
        ...new Map(
          items
            .filter((i) => i.PurchaseOrder && i.PurchaseOrderItem)
            .map((i) => [
              `${i.PurchaseOrder}-${i.PurchaseOrderItem}`,
              {
                po: i.PurchaseOrder,
                poItem: i.PurchaseOrderItem,
              },
            ]),
        ).values(),
      ];
      const missingPOItems = uniquePOItems.filter(
        ({ po, poItem }) => !purchaseOrderHeaderCache.has(`${po}-${poItem}`),
      );

      const poBatchSize = 50;
      const poBatches = chunkArray(missingPOItems, poBatchSize);

      for (const batch of poBatches) {
        try {
          const boundary = `batch_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;

          const getPaths = batch.map(
            ({ po, poItem }) =>
              `/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/` +
              `A_PurchaseOrderItem(` +
              `PurchaseOrder='${encodeURIComponent(po)}',` +
              `PurchaseOrderItem='${encodeURIComponent(poItem)}'` +
              `)?$format=json`,
          );

          const batchBody = buildBatchBody(getPaths, boundary);

          const batchUrl = new URL(
            `/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/$batch`,
            baseURLConfig,
          ).toString();

          const batchHeaders = {
            ...headers,
            "Content-Type": `multipart/mixed; boundary=${boundary}`,
            Accept: "multipart/mixed",
          };

          const res = await axios.post(batchUrl, batchBody, {
            headers: batchHeaders,
            responseType: "text",
          });

          const parts = parseBatchResponse(res.data, boundary);

          batch.forEach(({ po, poItem }, index) => {
            purchaseOrderHeaderCache.set(
              `${po}-${poItem}`,
              parts[index]?.d || {},
            );
          });
        } catch (err) {
          // 🔁 Fallback: individual GET
          for (const { po, poItem } of batch) {
            try {
              const url =
                `${baseURLConfig}/sap/opu/odata/sap/API_PURCHASEORDER_PROCESS_SRV/` +
                `A_PurchaseOrderItem(` +
                `PurchaseOrder='${po}',PurchaseOrderItem='${poItem}'` +
                `)`;

              const res = await axios.get(url, { headers });

              purchaseOrderHeaderCache.set(
                `${po}-${poItem}`,
                res.data?.d || {},
              );
            } catch (err2) {
              console.error(`Failed PO item ${po}-${poItem}`, err2.message);
              purchaseOrderHeaderCache.set(`${po}-${poItem}`, {});
            }
          }
        }
      }
      const purchaseOrderDetailsMap = {};

      uniquePOItems.forEach(({ po, poItem }) => {
        purchaseOrderDetailsMap[`${po}-${poItem}`] =
          purchaseOrderHeaderCache.get(`${po}-${poItem}`) || {};
      });

      // ===============================
      // LOAD MANUFACTURER MASTER (ONCE)
      // ===============================
      if (!manufacturerCache.has("__ALL__")) {
        try {
          const url = `${baseURLConfig}/sap/opu/odata/sap/ZSB_MANUF_APP/ManfoDtls?$format=json`;

          const res = await axios.get(url, { headers });

          const results = res.data?.d?.results || [];

          results.forEach((row) => {
            manufacturerCache.set(String(row.ManfNo).trim(), row);
          });

          manufacturerCache.set("__ALL__", true);
        } catch (err) {
          console.error("Failed to load ManfoDtls master data", err.message);
        }
      }

      const uniqueMaterialDocs = [
        ...new Set(items.map((i) => i.MaterialDocument).filter(Boolean)),
      ];
      const missingDocs = uniqueMaterialDocs.filter(
        (doc) => !businessUserCache.has(doc),
      );

      const buBatchSize = 50;
      const buBatches = chunkArray(missingDocs, buBatchSize);

      for (const batch of buBatches) {
        try {
          const boundary = `batch_${Date.now()}_${Math.random()
            .toString(36)
            .slice(2, 8)}`;

          const getPaths = batch.map(
            (doc) =>
              `/sap/opu/odata4/sap/zsb_bussinee_user/srvd/sap/zsd_bussiness_user/0001/` +
              `zi_bussinessuer?$filter=MaterialDocument eq '${encodeURIComponent(doc)}'`,
          );

          const batchBody = buildBatchBody(getPaths, boundary);

          const batchUrl = new URL(
            `/sap/opu/odata4/sap/zsb_bussinee_user/srvd/sap/zsd_bussiness_user/0001/$batch`,
            baseURLConfig,
          ).toString();

          const batchHeaders = {
            ...headers,
            "Content-Type": `multipart/mixed; boundary=${boundary}`,
            Accept: "multipart/mixed",
          };

          const res = await axios.post(batchUrl, batchBody, {
            headers: batchHeaders,
            responseType: "text",
          });

          const parts = parseBatchResponse(res.data, boundary);

          batch.forEach((doc, index) => {
            const records = parts[index]?.value || [];
            businessUserCache.set(doc, records[0] || {});
          });
        } catch (err) {
          // 🔁 fallback: individual calls
          for (const doc of batch) {
            try {
              const url =
                `${baseURLConfig}/sap/opu/odata4/sap/zsb_bussinee_user/srvd/` +
                `sap/zsd_bussiness_user/0001/zi_bussinessuer` +
                `?$filter=MaterialDocument eq '${doc}'`;

              const res = await axios.get(url, { headers });
              businessUserCache.set(doc, res.data?.value?.[0] || {});
            } catch (e) {
              businessUserCache.set(doc, {});
            }
          }
        }
      }

      // Populate materialDetailsMap from cache (both material-plant and material-only keys)
      uniqueMaterialPlants.forEach((mp) => {
        materialDetailsMap[mp] = productCache.get(mp) || {};
      });
      uniqueMaterialsWithoutPlant.forEach((m) => {
        materialDetailsMap[m] = productCache.get(m) || {};
      });

      // --- New: sort items by PostingDate (newest first), fallback to doc/item ordering ---
      items.sort((a, b) => {
        const keyA = `${a.MaterialDocument}-${a.MaterialDocumentYear}`;
        const keyB = `${b.MaterialDocument}-${b.MaterialDocumentYear}`;
        const dateA = headerDetailsMap[keyA]?.PostingDate
          ? new Date(headerDetailsMap[keyA].PostingDate).getTime()
          : 0;
        const dateB = headerDetailsMap[keyB]?.PostingDate
          ? new Date(headerDetailsMap[keyB].PostingDate).getTime()
          : 0;
        if (dateA !== dateB) return dateB - dateA; // newest first
        // fallback to existing document/item ordering
        const docA = (a.MaterialDocument || "").toString();
        const docB = (b.MaterialDocument || "").toString();
        const docCompare = docB.localeCompare(docA, undefined, {
          numeric: true,
        });
        if (docCompare !== 0) return docCompare;
        const itemA = (a.MaterialDocumentItem || "").toString();
        const itemB = (b.MaterialDocumentItem || "").toString();
        return itemA.localeCompare(itemB, undefined, { numeric: true });
      });
      const grnItemCountMap = {};

      const uniqueGrns = [
        ...new Map(
          items.map((item) => [
            `${item.MaterialDocument}-${item.MaterialDocumentYear}`,
            {
              doc: item.MaterialDocument,
              year: item.MaterialDocumentYear,
            },
          ]),
        ).values(),
      ];

      const grnQtyMap = {};

      for (const { doc, year } of uniqueGrns) {
        try {
          const url =
            `${baseURLConfig}/sap/opu/odata/sap/API_MATERIAL_DOCUMENT_SRV/` +
            `A_MaterialDocumentItem?$format=json&` +
            `$filter=(MaterialDocument eq '${doc}' and MaterialDocumentYear eq '${year}')`;

          const res = await axios.get(url, { headers });

          const allGrnItems = res.data?.d?.results || [];

          grnItemCountMap[`${doc}-${year}`] = allGrnItems.length;

          grnQtyMap[`${doc}-${year}`] = allGrnItems.reduce(
            (sum, it) => sum + (Number(it.QuantityInBaseUnit) || 0),
            0,
          );
        } catch (err) {
          console.error(`Failed to calculate GRN total for ${doc}-${year}`);
          grnQtyMap[`${doc}-${year}`] = 0;
        }
      }

      // Map to required fields (use material-only fallback when plant-based description is missing)
      const result = items.map((item) => {
        const headerKey = `${item.MaterialDocument}-${item.MaterialDocumentYear}`;
        const header = headerDetailsMap[headerKey] || {};

        const grnKey = `${item.MaterialDocument}-${item.MaterialDocumentYear}`;

        const poKey = `${item.PurchaseOrder}-${item.PurchaseOrderItem}`;
        const poItemData = purchaseOrderDetailsMap[poKey] || {};
        const manfNo = String(poItemData.YY1_ManufacturerNO1_PDI || "").trim();

        // Lookup from cached Z API data
        const manfData = manufacturerCache.get(manfNo) || {};
        console.log(
          "PO ITEM CHECK:",
          poItemData.PurchaseOrder,
          poItemData.PurchaseOrderItem,
          poItemData.YY1_ManufacturerNO1_PDI,
        );
        // derive product description (I_ProductDescription -> ProductDescription)
        const productDesc =
          materialDetailsMap[`${item.Material}-${item.Plant}`]
            ?.ProductDescription ||
          materialDetailsMap[item.Material]?.ProductDescription ||
          header?.ProductDescription ||
          "";
        // normalize weight values (use QuantityInBaseUnit as priority for net weight)
        const normalizedNet =
          item.QuantityInBaseUnit ||
          item.netWeightKgs ||
          item.nwt ||
          item.NW ||
          item.netWeight ||
          "";
        const normalizedGross = item.gwt || item.grossWeight || item.GW || "";
        const normalizedTare = item.twt || item.tareWeight || item.TW || "";
        const businessUser = businessUserCache.get(item.MaterialDocument) || {};

        return {
          materialDocument: item.MaterialDocument || "",
          materialDocumentItem: item.MaterialDocumentItem || "",

          // b~Material -> RM_Code
          RM_Code: item.Material || "",
          // keep materialCode for backwards compatibility
          materialCode: item.Material || "",
          // c~ProductDescription -> raw material (use productDesc)
          rawMaterial: productDesc || "",
          // keep rawMaterialDesc (previous name) as well for compatibility
          rawMaterialDesc: productDesc || "",
          // b~MaterialDocumentItemText -> materialName (prefer explicit item text)
          materialName: productDesc || "",

          supplierName:
            supplierDetailsMap[item.Supplier]?.SupplierName ||
            item.Supplier ||
            "",
          supplierBatch:
            item.BatchBySupplier || item.YY1_supplier_batch1_MMI || "",
          icplBatch: item.MaterialDocumentItemText || productDesc || "",

          receivedDate: formatDate(header?.PostingDate || ""),
          mfgDate: formatDate(item.ManufactureDate || ""),
          expiryDate: formatDate(item.ShelfLifeExpirationDate || ""),

          // b~QuantityInBaseUnit -> n.wt and netWeightKgs
          netWeightKgs: normalizedNet,
          nwt: normalizedNet,

          procurementType: "",

          // a~MaterialDocument -> grn_no (prefer header if available, else item)
          grn_no: header?.MaterialDocument || item.MaterialDocument || "",
          // include GRN year for templates that want both number/year
          grn_date: formatDate(header?.PostingDate || ""),
          grn_year:
            header?.MaterialDocumentYear || item.MaterialDocumentYear || "",
          Batch_QTY: item.QuantityInBaseUnit || "",
          // grn_Qty :grnQtyMap || " ",

          grn_Qty: grnQtyMap[grnKey],

          grn: {
            purchaseOrder: item.PurchaseOrder || "",
            purchaseOrderItem: item.PurchaseOrderItem || "",
          },
          // AR.NO = MaterialDocument
          arNo: item.MaterialDocument || "",
          // a~PostingDate -> issue_dt
          issue_dt: formatDate(header?.PostingDate || ""),

          // Weight fields
          gwt: normalizedGross,
          twt: normalizedTare,
          // nwt already provided above

          // FOR PRODUCT / BATCH
          forProduct: "",
          forBatchNo: item.Batch || item.icplBatch || item.supplierBatch || "",
          batchNo: item.Batch || item.icplBatch || item.supplierBatch || "",

          // OPERATOR NAME
          operatorName:
            item.Operator || item.OperatorName || item.operator || "",

          // ISSUED BY & DATE => header-level PostingDate and EntryDate
          issued: {
            postingDate: formatDate(header?.PostingDate || ""),
            entryDate: formatDate(header?.EntryDate || item.EntryDate || ""),
          },
          PersonFullName: businessUser.PersonFullName || " ",
          MaterialBaseUnit: item.MaterialBaseUnit,
          manufaturer_no: poItemData.YY1_ManufacturerNO1_PDI || " ",
          YY1_AA16_MMI: item.YY1_AA16_MMI || " ",
          YY1_AA1_MMI: item.YY1_AA1_MMI || " ",
          YY1_AA2_MMI: item.YY1_AA2_MMI || " ",
          YY1_AA16_MMIT: item.YY1_AA16_MMIT || " ",
          manufaturer_no: manfNo || " ",
          MaterialDocumentItem: item.MaterialDocumentItem || " ",

          ManfNm: manfData.ManfNm || "",
          ManfAddr: manfData.ManfAddr || "",
          ManfStat: manfData.ManfStat || "",
          grn_item_count: grnItemCountMap[grnKey] || 0,

          container:
            item.MaterialDocumentItem && grnItemCountMap[grnKey]
              ? `${item.MaterialDocumentItem}/${grnItemCountMap[grnKey]}`
              : item.MaterialDocumentItem || grnItemCountMap[grnKey] || "",
          dec: item.YY1_AA16_MMIT?.trim()
  ? `(${item.YY1_AA16_MMIT.trim()})`
  : "",


        };
      });
      const overallMs = Date.now() - overallStart;
      timings.overallMs = overallMs;
      // Log timings server-side for quick inspection
      console.info("getMaterialDocumentDetails timings (ms):", timings);

      const responsePayload = {
        res: "success",
        message: "Material document details fetched successfully",
        statusCode: 200,
        length: result.length,
        data: result,
      };
      // Include timings in response only when explicitly requested by client for debugging
      if (req.data && req.data._debug) responsePayload.timings = timings;
      return responsePayload;
    } catch (err) {
      return req.error(
        500,
        `Failed to fetch Material Document details: ${err.message}`,
      );
    }
  });
};
