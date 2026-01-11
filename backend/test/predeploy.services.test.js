/**
 * Minimal pre-deploy Mocha test (localhost-friendly)
 *
 * - GET  http://localhost:4004/rest/billing/getMaterialDocumentItem  -> must return 200
 * - Extract at least 5 documentIds from the GET body, pick 5 at random
 * - POST http://localhost:4004/rest/billing/getMaterialDocumentDetails for each id -> expect 200
 * - If any POST fails, the test fails and lists failing documentId(s)
 */

const axios = require("axios");
const { expect } = require("chai");

const TIMEOUT_MS = 20000;
const HOST = process.env.BASE_URL
  ? process.env.BASE_URL.replace(/\/+$/, "")
  : "http://localhost:4004";

const GET_URL = `${HOST}/rest/billing/getMaterialDocumentItem`;
const POST_URL = `${HOST}/rest/billing/getMaterialDocumentDetails`;

const headers = {
  Accept: "application/json",
  "Content-Type": "application/json",
  // Optional: set Authorization or Cookie via env when needed
  Authorization:
    process.env.BASIC_AUTH ||
    (process.env.AUTH_TOKEN ? `Bearer ${process.env.AUTH_TOKEN}` : undefined),
  Cookie: process.env.COOKIE || undefined,
};

function maskHeaders(h) {
  const out = {};
  Object.keys(h || {}).forEach((k) => {
    if (!h[k] && h[k] !== "") return;
    if (/authorization/i.test(k) && h[k])
      out[k] = String(h[k]).slice(0, 10) + "...";
    else if (/cookie/i.test(k) && h[k])
      out[k] =
        String(h[k]).slice(0, 30) + (String(h[k]).length > 30 ? "..." : "");
    else out[k] = h[k];
  });
  return out;
}

function findDocumentsContainer(body) {
  if (!body) return [];
  if (Array.isArray(body)) return body;
  const candidates = [
    "documents",
    "items",
    "data",
    "results",
    "rows",
    "d",
    "value",
  ];
  for (const k of candidates)
    if (k in body && Array.isArray(body[k])) return body[k];
  for (const k of Object.keys(body)) if (Array.isArray(body[k])) return body[k];
  if (typeof body === "object") return [body];
  return [];
}

function extractIdFromDoc(doc) {
  if (!doc || typeof doc !== "object") return null;
  const idKeys = [
    "documentId",
    "BillingDocument",
    "id",
    "documentNumber",
    "docId",
    "DocumentId",
  ];
  for (const k of idKeys) if (k in doc && doc[k] != null) return String(doc[k]);
  for (const k of Object.keys(doc))
    if (typeof doc[k] === "string" || typeof doc[k] === "number")
      return String(doc[k]);
  return null;
}

function pickLatestDocumentIdsFromBody(body) {
  const docs = findDocumentsContainer(body);
  if (!docs || docs.length === 0) return [];
  const mapped = docs
    .map((doc, idx) => ({ doc, id: extractIdFromDoc(doc), idx }))
    .filter((m) => m.id !== null)
    .map((m) => m.id);
  return mapped;
}

function shuffle(array) {
  // Fisher-Yates shuffle (in-place)
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

describe("Minimal pre-deploy — get 5 random docs and generate invoices", function () {
  this.timeout(TIMEOUT_MS * 3);

  it("GET must return 200, return at least 5 ids, pick 5 random, and each POST must return 200", async function () {
    console.log("Using GET URL:", GET_URL);
    console.log("Using POST URL:", POST_URL);
    console.log("Request headers:", JSON.stringify(maskHeaders(headers)));

    // GET
    const getRes = await axios.get(GET_URL, {
      timeout: TIMEOUT_MS,
      validateStatus: null,
      headers,
    });

    console.log("GET status:", getRes.status);
    if (getRes.status !== 200) {
      const snippet =
        typeof getRes.data === "string"
          ? getRes.data.slice(0, 1000)
          : JSON.stringify(getRes.data).slice(0, 1000);
      expect(getRes.status).to.equal(
        200,
        `GET did not return 200. Status: ${getRes.status}\nSnippet: ${snippet}`
      );
    }

    // extract ids (all available)
    const allIds = pickLatestDocumentIdsFromBody(getRes.data);
    console.log("Total extracted documentIds:", allIds.length);

    // require at least 5 docs available
    expect(
      Array.isArray(allIds) && allIds.length >= 5,
      `Expected at least 5 documentIds but got ${allIds.length || 0}`
    ).to.equal(true);

    // pick 5 random unique ids
    const shuffled = shuffle([...allIds]);
    const ids = shuffled.slice(0, 5);
    console.log("Picked random documentIds (5):", JSON.stringify(ids));

    // POST each id sequentially and collect failures
    const failures = [];
    for (const docId of ids) {
      const payload = { billingDocumentId: docId };
      console.log(`POST -> ${POST_URL} billingDocumentId=${docId}`);
      const res = await axios.post(POST_URL, payload, {
        timeout: TIMEOUT_MS,
        validateStatus: null,
        headers,
      });

      const snippet =
        typeof res.data === "string"
          ? res.data.slice(0, 800)
          : JSON.stringify(res.data).slice(0, 800);
      console.log(`POST status for ${docId}:`, res.status);
      if (res.status !== 200) {
        failures.push({ docId, status: res.status, snippet });
        continue;
      }

      // optional lightweight shape checks
      try {
        expect(res.headers["content-type"] || "").to.match(
          /application\/json|json/i
        );
        expect(res.data).to.be.an("object");
      } catch (err) {
        failures.push({
          docId,
          status: res.status,
          snippet: `Invalid body shape: ${err.message}`,
        });
      }
    }

    if (failures.length > 0) {
      const lines = failures.map(
        (f) =>
          `documentId=${f.docId} status=${f.status} snippet=${String(
            f.snippet
          )}`
      );
      const msg =
        "One or more getMaterialDocumentDetails POSTs failed:\n" +
        lines.join("\n");
      expect.fail(msg);
    }

    console.log(
      "All 5 getMaterialDocumentDetails calls returned 200 and passed basic checks."
    );
  });
});
