const express = require("express");
const cds = require("@sap/cds");
const cors = require("cors");
const path = require("path");

const router = express.Router();

const fs = require("fs");
// Try to load a logo from the frontend public folder (if present)
const possibleLogoPath = path.join(
  __dirname,
  "..",
  "..",
  "app",
  "public",
  "kopran_logo.png"
);
let logoBuffer = null;
try {
  if (fs.existsSync(possibleLogoPath)) {
    logoBuffer = fs.readFileSync(possibleLogoPath);
    console.info("Loaded logo for PDF generation:", possibleLogoPath);
  } else {
    // Try alternate common location
    const alt = path.join(
      __dirname,
      "..",
      "..",
      "app",
      "src",
      "assets",
      "kopran_logo.png"
    );
    if (fs.existsSync(alt)) {
      logoBuffer = fs.readFileSync(alt);
      console.info("Loaded logo for PDF generation:", alt);
    }
    // If still not found, look in the current srv folder for common names
    if (!logoBuffer) {
      const localPng = path.join(__dirname, "kopran_logo.png");
      const localJpg = path.join(__dirname, "kopran_logo.jpg");
      const localJpeg = path.join(__dirname, "kopran_logo.jpeg");
      if (fs.existsSync(localPng)) {
        logoBuffer = fs.readFileSync(localPng);
        console.info("Loaded local logo for PDF generation:", localPng);
      } else if (fs.existsSync(localJpg)) {
        logoBuffer = fs.readFileSync(localJpg);
        console.info("Loaded local logo for PDF generation:", localJpg);
      } else if (fs.existsSync(localJpeg)) {
        logoBuffer = fs.readFileSync(localJpeg);
        console.info("Loaded local logo for PDF generation:", localJpeg);
      }
    }
  }
} catch (e) {
  console.warn("Could not load logo for PDF generation:", e.message || e);
}

// ✅ Your env endpoint
router.get("/rest/billing/env", (req, res) => {
  res.json({ env: process.env.DEPLOYMENT_ENV || "UNKNOWN" });
});

cds.on("bootstrap", (app) => {
  console.log("Environment Running:", process.env.DEPLOYMENT_ENV);

  // Enable CORS
  app.use(cors());
  // Parse JSON bodies for our PDF endpoint
  app.use(express.json({ limit: "10mb" }));

  // Health check
  app.get("/", (_, res) => {
    res.send("CAP backend is running 🚀");
  });

  // Static files
  app.use("/pdfs", express.static("pdfs"));

  // Attach env route
  app.use(router);

  // Server-side PDF generation endpoint (streams PDF back)
  app.post("/rest/billing/generateLabelPdf", async (req, res) => {
    try {
      // Try to load QR generator; optional dependency
      let QRCode = null;
      try {
        QRCode = require("qrcode");
      } catch (e) {
        QRCode = null;
        console.info(
          "qrcode module not available, expecting client-provided qrImages"
        );
      }
// 🔹 If mappedData is NOT sent, but MaterialDocument + Year is sent
if (
  (!Array.isArray(mappedData) || mappedData.length === 0) &&
  MaterialDocument &&
  MaterialDocumentYear
) {
  try {
    const srv = await cds.connect.to("CatalogService"); // <-- use your service name
    const result = await srv.run(
      SELECT.from("getMaterialDocumentDetails").columns("*"),
      {
        MaterialDocument,
        MaterialDocumentYear,
      }
    );

    mappedData = result?.data || result || [];
  } catch (e) {
    console.error("Failed to fetch material document details:", e);
    return res.status(500).json({
      error: "Failed to fetch Material Document data",
    });
  }
}

      const PDFDocument = require("pdfkit");
      // create PDF stream
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=labels.pdf");
      const doc = new PDFDocument({ autoFirstPage: false, compress: true });
      doc.pipe(res);

      const PAGE_W = 360; // 5 inches * 72
      const PAGE_H = 288; // 4 inches * 72
      const M = 8; // margin (slightly larger for visual breathing room)
      const CONTENT_W = PAGE_W - M * 2;

      // Pre-decode QR data URIs to buffers to avoid repeated decoding cost per page.
      // If not provided by client, generate server-side QR (if `qrcode` available).
      const qrBuffers = new Array(mappedData.length).fill(null);
      for (let i = 0; i < mappedData.length; i++) {
        const q = qrImages && qrImages[i];
        if (q && typeof q === "string" && q.startsWith("data:")) {
          try {
            const b = q.split(",")[1];
            qrBuffers[i] = Buffer.from(b, "base64");
            continue;
          } catch (e) {
            qrBuffers[i] = null;
          }
        }
        // If no client QR and QRCode lib is available, generate from material|batch|netWeight
        if (QRCode) {
          try {
            const item = mappedData[i] || {};
            const mat = item.materialCode || item.materialName || "";
            const batch = item.icplBatch || item.supplierBatch || "";
            const net = item.netWeightKgs || item.QuantityInBaseUnit || "";
            // Build a labeled, multiline QR payload so scanning shows readable labels
            const qrText = `Material Code: ${mat}\nICPL Batch: ${batch}\nNet Wt. in Kgs: ${net}`;
            // produce a reasonably-sized PNG buffer (width 160px)
            // await is safe here since handler is async
            qrBuffers[i] = await QRCode.toBuffer(qrText || "", {
              type: "png",
              width: 160,
              errorCorrectionLevel: "M",
            });
          } catch (e) {
            qrBuffers[i] = null;
          }
        } else {
          qrBuffers[i] = null;
        }
      }
if (!Array.isArray(mappedData) || mappedData.length === 0) {
  return res.status(400).json({
    error:
      "No data available to generate PDF. Provide mappedData or MaterialDocument + MaterialDocumentYear.",
  });
}
      mappedData.forEach((item, idx) => {
        // add a page without pdfkit's automatic margins so we control layout
        doc.addPage({ size: [PAGE_W, PAGE_H], margin: 0 });

        // white background + thin black border to match photo
        try {
          doc.save();
          doc.rect(0, 0, PAGE_W, PAGE_H).fill("white");
          doc.restore();
          doc.save();
          doc
            .lineWidth(1)
            .rect(4, 4, PAGE_W - 8, PAGE_H - 8)
            .stroke("black");
          doc.restore();
        } catch (e) {
          // ignore background/border errors
        }

        // top area positions
        const leftX = M;
        let y = M + 2;

        // Header box: logo (20%) on left and company/band/dispensed (80%) on right
        const headerH = 64; // tightened height
        const headerW = PAGE_W - leftX * 2;
        const headerX = leftX;
        const headerY = y;
        try {
          doc.save();
          // draw header box border
          doc.rect(headerX, headerY, headerW, headerH).stroke("black");
          doc.restore();
        } catch (e) {}

        const leftColW = Math.round(headerW * 0.2);
        const rightColW = headerW - leftColW;
        const leftColX = headerX;
        const hdrRightX = headerX + leftColW;

        // Format number at top-right inside header (smaller)
        doc.fillColor("black").font("Helvetica").fontSize(6);
        const formatNo = item.formatNo || item.format || "";
        if (formatNo) {
          doc.text(
            `Format No : ${formatNo}`,
            headerX + headerW - 90,
            headerY + 4,
            {
              width: 90,
              align: "right",
            }
          );
        }

        // draw logo centered in left column (fit within left column)
        const logoMaxW = Math.max(24, leftColW - 8);
        const logoMaxH = Math.max(24, headerH - 16);
        if (logoBuffer) {
          try {
            const logoX = leftColX + Math.round((leftColW - logoMaxW) / 2);
            const logoY = headerY + Math.round((headerH - logoMaxH) / 2);
            doc.image(logoBuffer, logoX, logoY, { fit: [logoMaxW, logoMaxH] });
          } catch (e) {}
        }

        // Right column: company name, black band, and DISPENSED stacked and
        // vertically centered as a single block within the header box.
        const compName = (
          item.companyName || "Kopran Research Laboratories Limited"
        ).toUpperCase();

        // Fonts/sizes
        const compFont = "Helvetica-Bold";
        const compSize = 9;
        const bandW = Math.round(rightColW * 0.68);
        const bandH = 20;
        // center the band across the whole header (not only the right column)
        const bandX = headerX + Math.round((headerW - bandW) / 2);
         const bandText = "Mahad";
        const bandFont = "Helvetica-Bold";
        const bandSize = 9;
         const dispText = item.dispensedText || " ";
        const dispFont = "Helvetica-Bold";
        const dispSize = 9;

        // Measure heights so we can center the entire stack
        doc.font(compFont).fontSize(compSize);
        const compHeight = doc.heightOfString(compName, { width: rightColW });
        doc.font(bandFont).fontSize(bandSize);
        const bandTextHeight = doc.heightOfString(bandText, { width: bandW });
        doc.font(dispFont).fontSize(dispSize);
        const dispHeight = doc.heightOfString(dispText, { width: rightColW });

        const gap1 = 4; // space between company and band
        const gap2 = 4; // space between band and dispensed

        // Place the company name near the top of the header (small top padding)
        const compTopY = headerY + 6;

        // draw company name centered across the entire header box
        doc.fillColor("black").font(compFont).fontSize(compSize);
        doc.text(compName, headerX, compTopY, {
          width: headerW,
          align: "center",
        });

        // draw black band below the company name
        const bandY = compTopY + compHeight + gap1;
        try {
          doc.save();
          doc.rect(bandX, bandY, bandW, bandH).fill("#000000");
          doc.restore();
        } catch (e) {}
        doc.fillColor("white").font(bandFont).fontSize(bandSize);
        doc.text(
          bandText,
          bandX,
          bandY + Math.round((bandH - bandTextHeight) / 2),
          { width: bandW, align: "center" }
        );

        // DISPENSED centered below band across the header
        const dispY = bandY + bandH + gap2;
        doc.fillColor("black").font(dispFont).fontSize(dispSize);
        doc.text(dispText, headerX, dispY, { width: headerW, align: "center" });

        // advance y past header
        y = headerY + headerH + 6;

        // Field rows - left aligned labels and values
        const labelFont = "Helvetica-Bold";
        const valueFont = "Helvetica";
        const labSize = 9;
        const valSize = 8;

        const fieldGapY = 14;
        // fixed label/value columns
        const LABEL_W = 82;
        const VAL_X = leftX + LABEL_W + 8;
        const rightColX = PAGE_W - leftX - 160; // right label column
        const rightValX = rightColX + LABEL_W + 8;

        // RM CODE
        const rmCodeDisplay =
          item.RM_Code ||
          item.RMCode ||
          item.materialCode ||
          item.materialNo ||
          "";
        doc.fillColor("black").font(labelFont).fontSize(labSize);
        doc.text("RM Code :", leftX, y);
        doc.font(valueFont).fontSize(valSize).text(rmCodeDisplay, VAL_X, y);
        y += fieldGapY;

        // RAW MATERIAL
        const rawMaterialDisplay = item.materialName || "N/A";
        doc.font(labelFont).fontSize(labSize).text("Raw Material :", leftX, y);
        doc
          .font(valueFont)
          .fontSize(valSize)
          .text(rawMaterialDisplay, VAL_X, y);
        y += fieldGapY;

        // GRN NO and Batch No row
        // Prefer GRN number (MaterialDocument) + year. Do NOT show PurchaseOrder as GRN.
        const grnNo =
          item.grn_no ||
          item.grnNo ||
          item.grn ||
          item.GRN ||
          item.materialDocument ||
          item.MaterialDocument ||
          "";
        const grnYear =
          item.grn_year ||
          item.MaterialDocumentYear ||
          item.materialDocumentYear ||
          "";
        const grnDisplay = grnNo
          ? grnYear
            ? `${grnNo}/${grnYear}`
            : `${grnNo}`
          : "";
        const batchDisplay =
          item.forBatchNo ||
          item.supplierBatch ||
          item.icplBatch ||
          item.batchNo ||
          item.batch ||
          "";

        doc.font(labelFont).fontSize(labSize).text("Grn. No :", leftX, y);
        doc.font(valueFont).fontSize(valSize).text(grnDisplay, VAL_X, y);
        doc.font(labelFont).fontSize(labSize).text("Batch No :", rightColX, y);
        doc.font(valueFont).fontSize(valSize).text(batchDisplay, rightValX, y);
        y += fieldGapY;

        // G. Wt., T. Wt., N. Wt. row (aligned columns)
        const col1X = leftX;
        const col1ValX = col1X + 36;
        const col2X = leftX + 120;
        const col2ValX = col2X + 36;
        const col3X = leftX + 220;
        const col3ValX = col3X + 36;
        const grossDisplay = item.gwt || item.grossWeight || item.GW || "";
        const tareDisplay = item.twt || item.tareWeight || item.TW || "";
        const netDisplay =
          item.netWeightKgs || item.nwt || item.NW || item.netWeight || "";

        doc.font(labelFont).fontSize(labSize).text("G. Wt.", col1X, y);
        doc.font(valueFont).fontSize(valSize).text(grossDisplay, col1ValX, y);
        doc.font(labelFont).fontSize(labSize).text("T. Wt.", col2X, y);
        doc.font(valueFont).fontSize(valSize).text(tareDisplay, col2ValX, y);
        doc.font(labelFont).fontSize(labSize).text("N. Wt.", col3X, y);
        doc.font(valueFont).fontSize(valSize).text(netDisplay, col3ValX, y);
        y += fieldGapY + 2;

        // For Batch/Product (single combined line)
        doc
          .font(labelFont)
          .fontSize(labSize)
          .text("For Batch/Product :", leftX, y);
        doc
          .font(valueFont)
          .fontSize(valSize)
          .text(item.icplBatch || "", VAL_X, y, {
            width: rightValX - VAL_X - 8,
            align: "left",
          });
        y += fieldGapY;

        // OPERATOR NAME
        doc.font(labelFont).fontSize(labSize).text("Operator Name :", leftX, y);
        doc
          .font(valueFont)
          .fontSize(valSize)
          .text(item.operatorName || item.operator || "", VAL_X, y);
        y += fieldGapY + 6;

        // ISSUED BY & DATE at bottom-left area
        const bottomY = PAGE_H - M - 36;
        doc
          .font(labelFont)
          .fontSize(labSize)
          .text("Issued By & Date :", leftX, bottomY);
        const issuedPosting =
          item.issued && item.issued.postingDate
            ? item.issued.postingDate
            : item.issuedDate;
        const issuedEntry =
          item.issued && item.issued.entryDate
            ? item.issued.entryDate
            : item.entryDate;
        const dateStr =
          issuedPosting || item.date || new Date().toLocaleDateString();
        const entryStr = issuedEntry ? ` (Entry: ${issuedEntry})` : "";
        doc
          .font(valueFont)
          .fontSize(valSize)
          .text(`${dateStr}${entryStr}`, leftX + 110, bottomY);
      });

      doc.end();
    } catch (err) {
      console.error("generateLabelPdf error:", err);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Optional pug templates
  app.set("views", path.join(__dirname, "views"));
  app.set("view engine", "pug");

  // Warm-up pdfkit on bootstrap to reduce first-request latency
  try {
    setImmediate(() => {
      try {
        const PDFDocument = require("pdfkit");
        const { PassThrough } = require("stream");
        const s = new PassThrough();
        const d = new PDFDocument();
        d.pipe(s);
        d.addPage({ size: [100, 100] });
        d.font("Helvetica");
        d.text("warming up fonts", 8, 8);
        d.end();
        // Drain stream quickly
        s.on("data", () => {});
        s.on("end", () => console.info("PDFKit warm-up complete"));
        // If the stream doesn't end quickly, destroy after short timeout
        setTimeout(() => {
          try {
            s.destroy();
          } catch (e) {}
        }, 2000);
      } catch (e) {
        console.warn("pdfkit warm-up failed:", e && e.message);
      }
    });
  } catch (e) {
    console.warn("Could not schedule PDF warm-up:", e && e.message);
  }
});

module.exports = cds.server;
