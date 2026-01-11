import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontSize: 8,
    padding: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.3,
  },
  bold: { fontWeight: "bold" },
  row: { flexDirection: "row" },
  col: { flexGrow: 1, padding: 1, border: "0.6px solid #777" },
  table: {
    display: "table",
    width: "100%",
    border: "0.6px solid #777",
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: "row",
  },

  colNoBorder: {
    padding: 1,
    border: "0px solid #777",
  },

  tableColHeader: {
    padding: 1,
    borderRight: "0.6px solid #777",
    fontWeight: "bold",
  },
  itemRow: {
    flexDirection: "row",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "0.3 solid #ccc",
  },
  itemLine: {
    marginBottom: 4, // Adjust spacing as needed
  },
  tableCol: {
    padding: 1,
    borderRight: "0.6px solid #777",
  },
  tableCell: {
    padding: 1,
  },
  footer: {
    fontSize: 8,
    borderTop: "0.6px solid #777",
    textAlign: "left",
    backgroundColor: "#fff",
    marginTop: 0,
    bottom: 0,
    padding: "1rem",
  },

  borderBoxStyle: {
    border: "0.6px solid #777",
    padding: 1,
    backgroundColor: "#fff",
  },
  logo: {
    width: 70,
    height: 60,
  },
});

const DomesticExportInvoicePdfViewV1 = ({ data = {}, qrImage }) => {
  console.log({ data });
  console.log({ qrImage });
  const NotAvailabaleValue = "N/A";
  const val = (v) =>
    typeof v === "object"
      ? NotAvailabaleValue
      : v !== undefined && v !== null && String(v).trim() !== ""
      ? String(v)
      : NotAvailabaleValue;

  const A4_HEIGHT = 842;
  const SAFE_MARGIN = 20;
  const HEADER_HEIGHT = 300;
  const FOOTER_HEIGHT = 240;
  const AVAILABLE_HEIGHT =
    A4_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT - SAFE_MARGIN;

  const ROW_HEIGHT = 15;
  const maxRows = Math.floor(AVAILABLE_HEIGHT / ROW_HEIGHT);
  // const blankRows = Math.max(maxRows - (data?.items?.length || 0), 0);
  const blankRows = (data?.items?.length || 0) < maxRows ? 1 : 0; // only one filler row if there’s space
  /* put this near top of file or reuse existing constants */
  const HEADER_BOX_HEIGHT = 130; // numeric height for header area in points (px-equivalent)
  const QR_BOX_SIZE = HEADER_BOX_HEIGHT - 10; // square box where QR should fit
  const columnWidths = [
    "6%", // Sl
    "10%", // Pkg
    "35%", // Description
    "8%", // HSN
    "10%", // Qty
    "8%", // Rate
    "10%", // Discount
    "13%", // Amount
  ];
  const COLS = {
    sl: "6%",
    pkg: "10%",
    desc: "35%",
    hsn: "8%",
    qty: "10%",
    rate: "8%",
    disc: "10%",
    amt: "13%",
  };

  const num = (v) => Number((v ?? 0).toString().replace(/,/g, "")) || 0;
  const fix2 = (v) => num(v).toFixed(2);

  // Build synchronized rows so both columns have identical line boxes
  // REPLACE buildSummaryRows with this
  const buildSummaryRows = () => {
    const rows = [];
    const flat = num(data?.totals?.discountFlat);
    const percent = num(data?.totals?.discountPercent);
    const discountValue = flat > 0 ? flat : percent > 0 ? percent : 0;

    if (discountValue > 0) {
      rows.push({ type: "row", label: "Discount", value: discountValue });
    }

    const freight = num(data?.totals?.freight);
    if (freight > 0)
      rows.push({ type: "row", label: "Freight", value: freight });

    const insurance = num(data?.totals?.insurance);
    if (insurance > 0)
      rows.push({ type: "row", label: "Insurance", value: insurance });

    const packing = num(data?.totals?.packing);
    if (packing > 0)
      rows.push({ type: "row", label: "Packing", value: packing });

    // divider always included
    rows.push({ type: "hr" });

    // Taxable: show always (but keep numeric)
    rows.push({
      type: "row",
      label: "Taxable",
      value: num(data?.totals?.taxable || data?.totals?.taxable || 0),
    });

    // Taxes — prefer IGST else CGST + (UGST|SGST)
    if (data?.totals) {
      const t = data.totals;
      if (num(t.igst) > 0) {
        rows.push({ type: "row", label: "IGST", value: num(t.igst) });
      } else {
        if (num(t.cgst) > 0)
          rows.push({ type: "row", label: "CGST", value: num(t.cgst) });
        const ugOrSgVal = num(t.ugst) > 0 ? num(t.ugst) : num(t.sgst);
        const ugOrSgLabel = num(t.ugst) > 0 ? "UGST" : "SGST";
        if (ugOrSgVal > 0)
          rows.push({ type: "row", label: ugOrSgLabel, value: ugOrSgVal });
      }
    }

    // Round off — show only if non-zero (if you want always show, remove the >0 guard)
    const roundOff = num(data?.totals?.roundOffZrof);
    if (roundOff !== 0) {
      rows.push({ type: "row", label: "Round Off", value: roundOff });
    }

    return rows;
  };

  const sumRows = buildSummaryRows();
  const sumLine = {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 12, // keep identical vertical rhythm
    paddingVertical: 1,
  };
  const sumHR = {
    // borderBottom: "0.6px solid   #000",
    height: 0,
    marginVertical: 2,
  };
  const sumHRBorder = {
    borderBottom: "0.6px solid   #000",
    // height: 0,
    // marginVertical: 2,
  };

  // default copy labels when nothing provided
  const DEFAULT_COPIES = [
    "Original for Recipient",
    "Duplicate for Transporter",
    "Triplicate for Supplier",
    "Extra Copy",
  ];

  // copies: prefer explicit array in data.document.copies,
  // else prefer single titleDescription (if present),
  // otherwise fall back to the standard defaults above.
  const copies =
    Array.isArray(data?.document?.copies) && data.document.copies.length
      ? data.document.copies
      : data?.document?.titleDescription &&
        String(data.document.titleDescription).trim()
      ? [data.document.titleDescription]
      : DEFAULT_COPIES;

  const formatCopyTitle = (label) => {
    if (!label) return "";
    return `${String(label).toUpperCase()}`;
  };

  const cleanTitleDescription = (txt) => {
    if (!txt) return "";
    return String(txt).trim().replace(/^\(+/, "").replace(/\)+$/, "");
  };

  const titleDesc = cleanTitleDescription(
    data?.document?.titleDescription || ""
  );

  // --- Header ---
  const renderHeaderBlock = (copyTitle, pageIndex, totalPages) => (
    <div>
      <div
        style={{
          boxSizing: "border-box",
          height: "125px", // shrink to fit content
          maxHeight: "125px", // ensure it never exceeds content height
          // overflow: "hidden",
          position: "relative",
          // padding: 8,
          background: "#fff",
        }}
      >
        {/* top row: logo | title+description | qr */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            height: HEADER_BOX_HEIGHT,
            paddingHorizontal: 6,
          }}
        >
          {/* LEFT: logo + small IRN block (keeps left area reserved) */}
          <View style={{ width: "30%", paddingTop: 2 }}>
            <Image
              src="/kopran_logo.png"
              style={{ width: 70, height: 66, marginBottom: 2 }}
            />
          </View>

          {/* CENTER: Title + (optional) titleDescription + page info */}
          <View
            style={{
              width: "40%",
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 6,
            }}
          >
            <Text
              style={{ fontSize: 12, fontWeight: "bold", textAlign: "center" }}
            >
              {data?.document?.type || "TAX INVOICE"}
            </Text>

            {/* copyTitle OR description — prefer copyTitle if present, else description */}
            <Text
              style={{
                fontSize: 8,
                textAlign: "center",
                marginTop: 4,
                lineHeight: 1.1,
              }}
            >
              {formatCopyTitle(copyTitle) || (titleDesc ? titleDesc : "")}
            </Text>

            <Text style={{ fontSize: 7, marginTop: 4 }}>
              {`Page ${pageIndex + 1} of ${totalPages}`}
            </Text>
          </View>

          {/* RIGHT: QR box — reserved area so center text never overlaps */}
          <View
            style={{
              width: "30%",
              alignItems: "flex-end",
              paddingTop: 2,
              paddingRight: 6,
            }}
          >
            <View
              style={{
                width: QR_BOX_SIZE,
                height: QR_BOX_SIZE,
                border: "0.5px solid #aaa",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {qrImage ? (
                <Image
                  src={qrImage}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              ) : (
                <Text style={{ fontSize: 7, color: "#888" }}>
                  QR Not Available
                </Text>
              )}
            </View>
          </View>
        </View>
      </div>

      <div>
        {/* Full-width two-column IRN / Ack block (grid-style with borders) */}
        <View
          style={{
            width: "100%",
            borderLeft: "0.6px solid #777",
            borderRight: "0.6px solid #777",
            borderBottom: "0.6px solid #777",
            borderTop: "0.6px solid #777",
          }}
        >
          {/* ROW 1 */}
          <View style={{ flexDirection: "row", width: "100%" }}>
            <View
              style={{
                width: "50%",
                padding: 2,
                borderRight: "0.6px solid #777",
                borderBottom: "0.6px solid #777",
              }}
            >
              <Text style={{ fontSize: 7 }}>
                <Text style={{ fontWeight: "bold" }}>IRN:</Text>{" "}
                {val(data?.document?.irn)}
              </Text>
            </View>
            <View
              style={{
                width: "50%",
                padding: 2,
                borderBottom: "0.6px solid #777",
              }}
            >
              <Text style={{ fontSize: 7 }}>
                <Text style={{ fontWeight: "bold" }}>IRN Status:</Text>{" "}
                {val(data?.document?.irnStatus)}
              </Text>
            </View>
          </View>

          {/* ROW 2 */}
          <View style={{ flexDirection: "row", width: "100%" }}>
            <View
              style={{
                width: "50%",
                padding: 2,
                borderRight: "0.6px solid #777",
              }}
            >
              <Text style={{ fontSize: 7 }}>
                <Text style={{ fontWeight: "bold" }}>Ack No.:</Text>{" "}
                {val(data?.document?.ackNo)}
              </Text>
              <Text style={{ fontSize: 7, marginTop: 1 }}>
                <Text style={{ fontWeight: "bold" }}>Ack Date:</Text>{" "}
                {val(data?.document?.ackDate)}
              </Text>
            </View>
            <View style={{ width: "50%", padding: 2 }}>
              <Text style={{ fontSize: 7 }}>
                <Text style={{ fontWeight: "bold" }}>Cancel Date:</Text>{" "}
                {val(data?.document?.cancelDate)}
              </Text>
              <Text style={{ fontSize: 7, marginTop: 1 }}>
                <Text style={{ fontWeight: "bold" }}>EWay Bill:</Text>{" "}
                {val(data?.document?.eWayBillNo)}
              </Text>
            </View>
          </View>
        </View>

        {/* Seller, Right Invoice Info (unchanged) */}
        <View style={{ flexDirection: "row", width: "100%", marginBottom: 0 }}>
          <View
            style={{
              width: "50%",
              borderTop: "0.6px solid #777",
              borderLeft: "0.6px solid #777",
              borderRight: "0px solid #777",
              borderBottom: "0px solid #777",
              padding: 1,
            }}
          >
            <Text style={styles.bold}>{data?.seller.name}</Text>
            <Text>{data?.seller.address}</Text>
            <Text>GSTIN/UIN: {data?.seller.gstin}</Text>
            <Text>
              State Name : {data?.seller?.state}, Code :{" "}
              {data?.seller?.stateCode}
            </Text>
            <Text>E-Mail : {data?.seller.email}</Text>
          </View>

          {/* RIGHT: Invoice Info Block */}
          <View style={{ width: "50%" }}>
            {[
              [
                "Invoice No.",
                data?.document.number,
                "Dated",
                data?.document.date,
              ],
              [
                "Purchase Order Date",
                data?.transport.poDate || NotAvailabaleValue,
                "Mode/Terms of Payment",
                data?.transport?.termsOfPayment || NotAvailabaleValue,
              ],
            ].map(([label1, value1, label2, value2], idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text
                  style={{
                    padding: "2px",
                    borderTop: "0.6px solid #777",
                    borderLeft: "0.6px solid #777",
                    borderRight: "0px solid #777",
                    borderBottom: "0px solid #777",
                    width: "50%",
                  }}
                >
                  {label1}
                  {"\n"}
                  <Text
                    style={{ fontWeight: value1?.trim() ? "bold" : "normal" }}
                  >
                    {value1}
                  </Text>
                </Text>
                <Text
                  style={{
                    padding: "2px",
                    borderTop: "0.6px solid #777",
                    borderLeft: "0.6px solid #777",
                    borderRight: "0.6px solid #777",
                    borderBottom: "0px solid #777",
                    width: "50%",
                  }}
                >
                  {label2}
                  {"\n"}
                  <Text
                    style={{ fontWeight: value2?.trim() ? "bold" : "normal" }}
                  >
                    {value2}
                  </Text>
                </Text>
              </View>
            ))}

            {/* Buyer Order Number as full width row */}
            <View style={styles.tableRow}>
              <Text
                style={{
                  padding: "2px",
                  borderTop: "0.6px solid #777",
                  borderLeft: "0.6px solid #777",
                  borderRight: "0.6px solid #777",
                  borderBottom: "0px solid #777",
                  width: "100%",
                }}
              >
                Buyer Order Number{"\n"}
                <Text
                  style={{
                    fontWeight: data?.transport.buyerOrderNo?.trim()
                      ? "bold"
                      : "normal",
                  }}
                >
                  {data?.transport.buyerOrderNo || NotAvailabaleValue}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Consignee / Dispatch (unchanged) */}
        <View style={{ flexDirection: "row", width: "100%", marginBottom: 0 }}>
          <View
            style={{
              width: "50%",
              borderTop: "0.6px solid #777",
              borderLeft: "0.6px solid #777",
              borderRight: "0px solid #777",
              borderBottom: "0px solid #777",
              padding: 1,
            }}
          >
            <Text style={styles.bold}>Consignee (Ship To)</Text>
            <Text style={styles.bold}>
              {data?.consignee.name || NotAvailabaleValue}
            </Text>
            <Text>{data?.consignee.address || NotAvailabaleValue}</Text>
            <Text>
              GSTIN/UIN: {data?.consignee.gstin || NotAvailabaleValue}
            </Text>
            <Text>
              State Name : {data?.consignee.state || NotAvailabaleValue} Code :{" "}
              {data?.consignee?.stateCode}
            </Text>
            <Text>
              Contact person :{" "}
              {data?.consignee.contactPerson || NotAvailabaleValue}
            </Text>
            <Text>
              Contact : {data?.consignee.contact || NotAvailabaleValue}
            </Text>
            <Text>E-Mail : {data?.consignee.email || NotAvailabaleValue}</Text>
          </View>

          <View style={{ width: "50%" }}>
            <View
              style={{
                borderLeft: "0.6px solid #777",
                borderRight: "0.6px solid #777",
              }}
            >
              {[
                [
                  data?.document?.type === "CREDIT NOTE"
                    ? "Return Delivery No."
                    : "Delivery Note No.",
                  data?.transport.referenceNo || "    ",
                  "Delivery Note Date",
                  "    ",
                ],
                [
                  "Dispatched through",
                  data?.transport.dispatchedThrough || "   ",
                  "Destination",
                  data?.transport.destination || NotAvailabaleValue,
                ],
                [
                  "Motor Vehicle No.",
                  data?.transport.motorVehicleNo || NotAvailabaleValue,
                  "Country",
                  data?.shipping?.countryInfo?.destination ||
                    NotAvailabaleValue,
                ],
              ].map(([label1, value1, label2, value2], idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text
                    style={{
                      padding: "2px",
                      width: "50%",
                      borderTop: "0.6px solid #777",
                      borderRight: "0px solid #777",
                      borderBottom: "0px solid #777",
                    }}
                  >
                    {label1}
                    {"\n"}
                    <Text
                      style={{ fontWeight: value1?.trim() ? "bold" : "normal" }}
                    >
                      {value1}
                    </Text>
                  </Text>
                  <Text
                    style={{
                      padding: "2px",
                      width: "50%",
                      borderTop: "0.6px solid #777",
                      borderLeft: "0.6px solid #777",
                    }}
                  >
                    {label2}
                    {"\n"}
                    <Text
                      style={{ fontWeight: value2?.trim() ? "bold" : "normal" }}
                    >
                      {value2}
                    </Text>
                  </Text>
                </View>
              ))}
            </View>

            <View
              style={{
                borderLeft: "0.6px solid #777",
                borderRight: "0.6px solid #777",
                borderTop: "0.6px solid #777",
                borderBottom: "0.6px solid #777",
                alignSelf: "stretch",
                justifyContent: "flex-start",
              }}
            >
              <View style={styles.tableRow}>
                <Text
                  style={[
                    styles.col,
                    {
                      width: "100%",
                      borderLeft: "0px solid #777",
                      borderRight: "0px solid #777",
                      borderTop: "0px solid #777",
                      borderBottom: "0px solid #777",
                    },
                  ]}
                >
                  {"\n"}
                  {"\n"}
                  <Text style={{ fontWeight: "bold" }}>
                    {data?.transport.BillingInstructionLongText1 || ""}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Buyer / Terms */}
        <View style={{ flexDirection: "row", width: "100%", marginBottom: 0 }}>
          <View
            style={{
              width: "50%",
              borderTop: "0.6px solid #777",
              borderLeft: "0.6px solid #777",
              borderRight: "0px solid #777",
              borderBottom: "0.6px solid #777",
              padding: 1,
            }}
          >
            <Text style={styles.bold}>Buyer (Bill To)</Text>
            <Text style={styles.bold}>
              {data?.buyer.name || NotAvailabaleValue}
            </Text>
            <Text>
              {data?.buyer.address?.street || NotAvailabaleValue},{" "}
              {data?.buyer.address?.city || NotAvailabaleValue},{" "}
              {data?.buyer.address?.region || NotAvailabaleValue},{" "}
              {data?.buyer.address?.postalCode || NotAvailabaleValue}
            </Text>
            <Text>GSTIN/UIN: {data?.buyer.gstin || NotAvailabaleValue}</Text>
            <Text>
              State Name : {data?.buyer.address?.region || NotAvailabaleValue}{" "}
              Code : {data?.buyer?.stateCode}
            </Text>
            <Text>
              Place of Supply :{" "}
              {data?.buyer.placeOfSupply || NotAvailabaleValue}
            </Text>
            <Text>
              Contact person : {data?.buyer.contactPerson || NotAvailabaleValue}
            </Text>
            <Text>Contact : {data?.buyer.contact || NotAvailabaleValue}</Text>
            <Text>E-Mail : {data?.buyer.email || NotAvailabaleValue}</Text>
          </View>

          <View
            style={{
              width: "50%",
              borderTop: "0.6px solid #777",
              borderLeft: "0.6px solid #777",
              borderRight: "0.6px solid #777",
              borderBottom: "0.6px solid #777",
              alignSelf: "stretch",
              justifyContent: "flex-start",
            }}
          >
            <View style={styles.tableRow}>
              <Text
                style={[
                  styles.col,
                  { width: "100%", border: "0px solid black" },
                ]}
              >
                Billing Instructions:{"\n"}
                <Text style={{ fontWeight: "bold" }}>
                  {data?.transport.BillingInstructionLongText || ""}
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </div>
    </div>
  );

  // --- Footer (full content copied from your original FooterBlock) ---
  const FooterBlock = () => {
    // taxSummary totals helper
    const totals = (function () {
      const t = data.taxSummary || [];
      return t.reduce(
        (a, p) => {
          const numVal = (v) =>
            Number((v ?? 0).toString().replace(/,/g, "")) || 0;
          a.taxableINR += numVal(
            p.taxableAmountINR ?? p.taxableAmount ?? p.totalCIFINR
          );
          a.totalCIFINR += numVal(
            p.totalCIFINR ?? p.taxableAmountINR ?? p.taxableAmount
          );
          a.igst += numVal(p.igst);
          a.cgst += numVal(p.cgst);
          a.sgst += numVal(p.sgst);
          a.ugst += numVal(p.ugst);
          a.totalTaxAmount +=
            numVal(p.igst) + numVal(p.cgst) + numVal(p.sgst) + numVal(p.ugst);
          return a;
        },
        {
          taxableINR: 0,
          totalCIFINR: 0,
          igst: 0,
          cgst: 0,
          sgst: 0,
          ugst: 0,
          totalTaxAmount: 0,
        }
      );
    })();

    const showIGST = (data.taxSummary || []).some((t) => num(t?.igst) > 0);
    const showUGST = (data.taxSummary || []).some((t) => num(t?.ugst) > 0);

    return (
      <>
        {/* FIX FOOTER */}
        <View
          style={[
            styles.table,
            {
              marginTop: 0,
              borderLeft: "0.6px solid #777",
              borderRight: "0.6px solid #777",
              borderBottom: "0.6px solid #777",
              borderTop: "0.6px solid #777",
            },
          ]}
        >
          <View style={styles.tableRow}>
            {columnWidths?.map((width, idx) => (
              <Text
                key={idx}
                style={[
                  styles.tableCol,
                  {
                    width,
                    textAlign: idx === 0 ? "center" : "right",
                    borderTop: "0.6px solid #777",
                    borderBottom: "0.6px solid #777",
                    borderLeft: idx === 0 ? "0.6px solid #777" : "none",
                    borderRight: "0.6px solid #777",
                    fontWeight: "bold",
                    padding: 2,
                  },
                ]}
              >
                {(() => {
                  switch (idx) {
                    case 0:
                      return "Total";
                    case 4:
                      return val(data?.totals?.totalQty); // Quantity
                    case 7:
                      return val(data?.totals?.grandTotal); // grandTotal
                    default:
                      return "";
                  }
                })()}
              </Text>
            ))}
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "0.6px solid #777",
            borderTop: "0.6px solid #777",
            borderLeft: "0.6px solid #777",
            borderRight: "0.6px solid #777",
            padding: 0,
            margin: 0,
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ fontWeight: "bold" }}>
            Amount Chargeable (in words)
          </Text>
          <Text style={{ fontSize: 10 }}>E. & O.E</Text>
        </View>

        <View
          style={{
            borderLeft: "0.6px solid #777",
            borderRight: "0.6px solid #777",
            borderBottom: "0px solid #777",
            borderTop: "0px solid #777",
            padding: 3,
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ fontWeight: "bold", textTransform: "uppercase" }}>
            {"  "}
            {val(data?.totals?.amountInWords)}
          </Text>
        </View>

        {data?.taxSummary?.length > 0 &&
          (showIGST ? (
            <View style={{ marginTop: 0, border: "0.6px solid #777" }}>
              <View style={{ flexDirection: "row" }}>
                <Text
                  style={{
                    width: "25%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  HSN/SAC
                </Text>
                <Text
                  style={{
                    width: "25%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                    borderLeft: "0.6px solid #777",
                  }}
                >
                  Taxable Value
                </Text>
                <Text
                  style={{
                    width: "25%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                    borderLeft: "0.6px solid #777",
                  }}
                >
                  IGST Rate
                </Text>
                <Text
                  style={{
                    width: "25%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                    borderLeft: "0.6px solid #777",
                  }}
                >
                  IGST Amount
                </Text>
              </View>

              {data.taxSummary.map((tax, idx) => (
                <View key={idx} style={{ flexDirection: "row" }}>
                  <Text
                    style={{
                      width: "25%",
                      padding: 1,
                      textAlign: "center",
                      borderTop: "0.6px solid #777",
                    }}
                  >
                    {tax.hsn}
                  </Text>
                  <Text
                    style={{
                      width: "25%",
                      padding: 1,
                      textAlign: "center",
                      borderTop: "0.6px solid #777",
                      borderLeft: "0.6px solid #777",
                    }}
                  >
                    {tax?.taxableAmount ??
                      tax?.taxable ??
                      tax?.taxableAmountINR}
                  </Text>
                  <Text
                    style={{
                      width: "25%",
                      padding: 1,
                      textAlign: "center",
                      borderTop: "0.6px solid #777",
                      borderLeft: "0.6px solid #777",
                    }}
                  >
                    {tax.igstRate || "0%"}
                  </Text>
                  <Text
                    style={{
                      width: "25%",
                      padding: 1,
                      textAlign: "center",
                      borderTop: "0.6px solid #777",
                      borderLeft: "0.6px solid #777",
                    }}
                  >
                    {fix2(tax.igst)}
                  </Text>
                </View>
              ))}

              <View
                style={{ flexDirection: "row", backgroundColor: "#f7f7f7" }}
              >
                <Text
                  style={{
                    width: "25%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                    borderTop: "0.6px solid #777",
                  }}
                >
                  TOTAL
                </Text>
                <Text
                  style={{
                    width: "25%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                    borderTop: "0.6px solid #777",
                    borderLeft: "0.6px solid #777",
                  }}
                >
                  {fix2(totals.taxableINR)}
                </Text>
                <Text
                  style={{
                    width: "25%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                    borderTop: "0.6px solid #777",
                    borderLeft: "0.6px solid #777",
                  }}
                >
                  —
                </Text>
                <Text
                  style={{
                    width: "25%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                    borderTop: "0.6px solid #777",
                    borderLeft: "0.6px solid #777",
                  }}
                >
                  {fix2(totals.igst)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ marginTop: 0, border: "0.6px solid #777" }}>
              <View style={{ flexDirection: "row" }}>
                <Text
                  style={{
                    width: "20%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                  }}
                >
                  HSN/SAC
                </Text>
                <Text
                  style={{
                    width: "20%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                    borderLeft: "0.6px solid #777",
                  }}
                >
                  Taxable Value
                </Text>

                <View style={{ width: "20%", borderLeft: "0.6px solid #777" }}>
                  <Text
                    style={{
                      padding: 1,
                      textAlign: "center",
                      fontWeight: "bold",
                      borderBottom: "0.6px solid #777",
                    }}
                  >
                    CGST
                  </Text>
                  <View style={{ flexDirection: "row" }}>
                    <Text
                      style={{
                        width: "50%",
                        padding: 1,
                        textAlign: "center",
                        fontWeight: "bold",
                        borderRight: "0.6px solid #777",
                      }}
                    >
                      Rate
                    </Text>
                    <Text
                      style={{
                        width: "50%",
                        padding: 1,
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      Amount
                    </Text>
                  </View>
                </View>

                <View style={{ width: "20%", borderLeft: "0.6px solid #777" }}>
                  <Text
                    style={{
                      padding: 1,
                      textAlign: "center",
                      fontWeight: "bold",
                      borderBottom: "0.6px solid #777",
                    }}
                  >
                    {showUGST ? "UGST" : "SGST"}
                  </Text>
                  <View style={{ flexDirection: "row" }}>
                    <Text
                      style={{
                        width: "50%",
                        padding: 1,
                        textAlign: "center",
                        fontWeight: "bold",
                        borderRight: "0.6px solid #777",
                      }}
                    >
                      Rate
                    </Text>
                    <Text
                      style={{
                        width: "50%",
                        padding: 1,
                        textAlign: "center",
                        fontWeight: "bold",
                      }}
                    >
                      Amount
                    </Text>
                  </View>
                </View>

                <Text
                  style={{
                    width: "20%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                    borderLeft: "0.6px solid #777",
                  }}
                >
                  Total Tax Amount
                </Text>
              </View>

              {data.taxSummary.map((tax, idx) => (
                <View key={idx} style={{ flexDirection: "row" }}>
                  <Text
                    style={{
                      width: "20%",
                      padding: 1,
                      textAlign: "center",
                      borderTop: "0.6px solid #777",
                    }}
                  >
                    {tax.hsn}
                  </Text>
                  <Text
                    style={{
                      width: "20%",
                      padding: 1,
                      textAlign: "center",
                      borderTop: "0.6px solid #777",
                      borderLeft: "0.6px solid #777",
                    }}
                  >
                    {fix2(tax.amount ?? tax.taxableAmount)}
                  </Text>

                  <View
                    style={{
                      width: "20%",
                      flexDirection: "row",
                      borderLeft: "0.6px solid #777",
                    }}
                  >
                    <Text
                      style={{
                        width: "50%",
                        padding: 1,
                        textAlign: "center",
                        borderTop: "0.6px solid #777",
                        borderRight: "0.6px solid #777",
                      }}
                    >
                      {tax.cgstRate || "0%"}
                    </Text>
                    <Text
                      style={{
                        width: "50%",
                        padding: 1,
                        textAlign: "center",
                        borderTop: "0.6px solid #777",
                      }}
                    >
                      {fix2(tax.cgst)}
                    </Text>
                  </View>

                  <View
                    style={{
                      width: "20%",
                      flexDirection: "row",
                      borderLeft: "0.6px solid #777",
                    }}
                  >
                    <Text
                      style={{
                        width: "50%",
                        padding: 1,
                        textAlign: "center",
                        borderTop: "0.6px solid #777",
                        borderRight: "0.6px solid #777",
                      }}
                    >
                      {showUGST ? tax.ugstRate || "0%" : tax.sgstRate || "0%"}
                    </Text>
                    <Text
                      style={{
                        width: "50%",
                        padding: 1,
                        textAlign: "center",
                        borderTop: "0.6px solid #777",
                      }}
                    >
                      {fix2(showUGST ? tax.ugst : tax.sgst)}
                    </Text>
                  </View>

                  <Text
                    style={{
                      width: "20%",
                      padding: 1,
                      textAlign: "center",
                      borderTop: "0.6px solid #777",
                      borderLeft: "0.6px solid #777",
                    }}
                  >
                    {fix2(num(tax.totalTaxAmount))}
                  </Text>
                </View>
              ))}

              <View
                style={{ flexDirection: "row", backgroundColor: "#f7f7f7" }}
              >
                <Text
                  style={{
                    width: "20%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                    borderTop: "0.6px solid #777",
                  }}
                >
                  TOTAL
                </Text>
                <Text
                  style={{
                    width: "20%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                    borderTop: "0.6px solid #777",
                    borderLeft: "0.6px solid #777",
                  }}
                >
                  {fix2(totals.totalCIFINR)}
                </Text>

                <View
                  style={{
                    width: "20%",
                    flexDirection: "row",
                    borderLeft: "0.6px solid #777",
                  }}
                >
                  <Text
                    style={{
                      width: "50%",
                      padding: 1,
                      textAlign: "center",
                      fontWeight: "bold",
                      borderTop: "0.6px solid #777",
                      borderRight: "0.6px solid #777",
                    }}
                  >
                    —
                  </Text>
                  <Text
                    style={{
                      width: "50%",
                      padding: 1,
                      textAlign: "center",
                      fontWeight: "bold",
                      borderTop: "0.6px solid #777",
                    }}
                  >
                    {fix2(totals.cgst)}
                  </Text>
                </View>

                <View
                  style={{
                    width: "20%",
                    flexDirection: "row",
                    borderLeft: "0.6px solid #777",
                  }}
                >
                  <Text
                    style={{
                      width: "50%",
                      padding: 1,
                      textAlign: "center",
                      fontWeight: "bold",
                      borderTop: "0.6px solid #777",
                      borderRight: "0.6px solid #777",
                    }}
                  >
                    —
                  </Text>
                  <Text
                    style={{
                      width: "50%",
                      padding: 1,
                      textAlign: "center",
                      fontWeight: "bold",
                      borderTop: "0.6px solid #777",
                    }}
                  >
                    {fix2(showUGST ? totals.ugst : totals.sgst)}
                  </Text>
                </View>

                <Text
                  style={{
                    width: "20%",
                    padding: 1,
                    textAlign: "center",
                    fontWeight: "bold",
                    borderTop: "0.6px solid #777",
                    borderLeft: "0.6px solid #777",
                  }}
                >
                  {fix2(totals.totalTaxAmount)}
                </Text>
              </View>
            </View>
          ))}

        <View
          style={{
            marginBottom: 0,
            padding: 1,
            borderLeft: "0.6px solid #777",
            borderRight: "0.6px solid #777",
            borderBottom: "0.6px solid #777",
            borderTop: "0px solid #777",
          }}
        >
          <Text style={{ fontWeight: "bold", marginBottom: 0 }}>
            Tax Amount (in words): {val(data?.totals?.taxAmountInWords)}
          </Text>
        </View>

        {data?.document?.type === "CREDIT NOTE" ? (
          <View
            style={{
              marginBottom: 0,
              padding: 1,
              borderLeft: "0.6px solid #777",
              borderRight: "0.6px solid #777",
              borderBottom: "0.6px solid #777",
              borderTop: "0px solid #777",
            }}
          >
            <Text style={{ fontWeight: "normal", marginBottom: 0 }}>
              Remarks (Notes): {data?.transport?.CreditNoteRemarks}
            </Text>
            {/* <Text>{"  "}</Text> */}
          </View>
        ) : (
          false
        )}

        <View style={{ flexDirection: "row", marginBottom: 0 }}>
          <View
            style={{
              flex: 1,
              borderLeft: "0.6px solid #777",
              borderBottom: "0.6px solid #777",
              borderTop: "0px solid #777",
              borderRight: "none",
              padding: 1,
            }}
          >
            <Text style={styles.bold}>Company's PAN</Text>
            <Text>{val(data?.seller.pan)}</Text>

            <Text style={[styles.bold, { marginTop: 1 }]}>Declaration</Text>
            <Text>
              {val(
                data?.declaration ||
                  "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct."
              )}
            </Text>
          </View>

          <View
            style={{
              flex: 1,
              borderLeft: "0.6px solid #777",
              borderRight: "0.6px solid #777",
              borderBottom: "0.6px solid #777",
              borderTop: "0px solid #777",
              padding: 1,
            }}
          >
            <Text style={styles.bold}>Company's Bank Details</Text>
            <Text>
              A/c Holder's Name : {val(data?.seller.bankDetails?.accountHolder)}
            </Text>
            <Text>Bank Name : {val(data?.seller.bankDetails?.bank)}</Text>
            <Text>
              A/c No. : {val(data?.seller.bankDetails?.accountNumber)}
            </Text>
            <Text>
              Branch & IFS Code : {val(data?.seller.bankDetails?.branchIFSC)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", marginBottom: 0 }}>
          <View
            style={{
              flex: 1,
              borderTop: "0px solid #777",
              borderRight: "0.6px solid #777",
              borderLeft: "0.6px solid #777",
              borderBottom: "0.6px solid #777",
              padding: 1,
            }}
          >
            <Text>Customer's Seal and Signature</Text>
          </View>

          <View
            style={{
              flex: 1,
              borderTop: "0px solid #777",
              borderRight: "0.6px solid #777",
              borderBottom: "0.6px solid #777",
              borderLeft: "none",
              padding: 1,
              alignItems: "flex-end",
            }}
          >
            <Text style={{ textAlign: "center", marginTop: 1 }}>
              For {data?.seller.name}
            </Text>
            <View style={{ height: 20 }} />
            <Text style={{ textAlign: "center", marginTop: 1 }}>
              Authorised Signatory
            </Text>
          </View>
        </View>

        <View style={{ margin: 0, padding: 0 }}>
          <Text
            style={{
              textAlign: "center",
              margin: 0,
              padding: 0,
              fontSize: "8px",
            }}
          >
            {data?.subjectToJurisdiction || "Jurisdiction: N/A"}
          </Text>
          <Text
            style={{
              textAlign: "center",
              margin: 0,
              padding: 0,
              fontSize: "8px",
            }}
          >
            This is a Computer Generated Invoice
          </Text>
        </View>
      </>
    );
  };

  // --- Page renderer that accepts items to render on that page ---
  const renderPageWithItems = (
    copyTitle,
    copyIndex,
    itemsForPage = [],
    showFooter = true,
    pageIndex = 0,
    totalPages = 1,
    startSerial = 1
  ) => {
    // render filler on the last item page or when document is single page
    const isSinglePageWithFooter = totalPages === 1;
    const isLastItemPageBeforeFooter = pageIndex === totalPages - 2;

    // FOOTER-ONLY PAGE: when there are no items for this page but showFooter is true,
    // render only the header + footer (skip the items table entirely).
    if ((!itemsForPage || itemsForPage.length === 0) && showFooter) {
      return (
        <Page
          key={`copy-${copyIndex}-p-${pageIndex}`}
          size="A4"
          style={styles.page}
        >
          {renderHeaderBlock(copyTitle, pageIndex, totalPages)}

          {/* Footer-only content (no items table) */}
          <View style={{ marginTop: 0 }}>
            <FooterBlock style={{ padding: 0, margin: 0 }} />
          </View>
        </Page>
      );
    }
    return (
      <Page
        key={`copy-${copyIndex}-p-${pageIndex}`}
        size="A4"
        style={styles.page}
      >
        {renderHeaderBlock(copyTitle, pageIndex, totalPages)}

        {/* Items Table */}
        <View
          style={{
            flexGrow: 0,
            justifyContent: "flex-start",
            textAlign: "center",
            margin: 0,
            padding: 0,
          }}
        >
          <View style={styles.table}>
            <View
              style={{ ...styles.tableRow, borderBottom: "0.6px solid #777" }}
            >
              <Text style={[styles.tableColHeader, { width: "6%" }]}>Sl</Text>
              <Text style={[styles.tableColHeader, { width: "10%" }]}>
                No & Kind Of Pkgs
              </Text>
              <Text style={[styles.tableColHeader, { width: "35%" }]}>
                Description of Goods
              </Text>
              <Text style={[styles.tableColHeader, { width: "8%" }]}>
                HSN/SAC
              </Text>
              <Text style={[styles.tableColHeader, { width: "10%" }]}>
                Quantity
              </Text>
              <Text style={[styles.tableColHeader, { width: "8%" }]}>Rate</Text>
              <Text style={[styles.tableColHeader, { width: "10%" }]}>
                Discount
              </Text>
              <Text style={[styles.tableColHeader, { width: "13%" }]}>
                Amount
              </Text>
            </View>

            {Array.isArray(itemsForPage) &&
              itemsForPage.map((item, idx) => (
                <View key={idx} style={styles.tableRow}>
                  <Text
                    style={[
                      styles.tableCol,
                      { width: COLS.sl, textAlign: "center" },
                    ]}
                  >
                    {startSerial + idx}
                  </Text>
                  <Text style={[styles.tableCol, { width: COLS.pkg }]} wrap>
                    {item.kindOfPckg || ""}
                  </Text>
                  <View
                    style={[styles.tableCol, { width: COLS.desc, padding: 1 }]}
                  >
                    <Text>{item.description}</Text>
                    {item.batches?.length > 0 && (
                      <Text>
                        {item.batches.map(
                          (b, i) =>
                            `Batch: ${b.batch}${
                              i < item.batches.length - 1 ? "\n" : ""
                            }`
                        )}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.tableCol,
                      { width: COLS.hsn, textAlign: "center" },
                      item?.hsnDecor?.underline
                        ? { textDecoration: "underline" }
                        : null, // @react-pdf
                      item?.hsnDecor?.underline
                        ? { textDecorationLine: "underline" }
                        : null, // RN fallback
                      item?.hsnDecor?.color === "green"
                        ? { color: "green" }
                        : null,
                    ]}
                  >
                    {item.hsn}
                  </Text>

                  <Text
                    style={[
                      styles.tableCol,
                      { width: COLS.qty, textAlign: "center" },
                    ]}
                  >
                    {item.qty} {item.baseUnit}
                    {"\n"}
                    {item.batches?.map(
                      (b, i) =>
                        ` ${b.qty} ${item.baseUnit}${
                          i < item.batches.length - 1 ? "\n" : ""
                        }`
                    )}
                  </Text>
                  <Text
                    style={[
                      styles.tableCol,
                      { width: COLS.rate, textAlign: "center" },
                    ]}
                  >
                    {item?.rate || 0}
                  </Text>
                  <Text
                    style={[
                      styles.tableCol,
                      { width: COLS.disc, textAlign: "right" },
                    ]}
                  >
                    {item?.discountZldv > 0
                      ? -item?.discountZldv
                      : item.discountZdli || 0}
                  </Text>
                  <Text
                    style={[
                      styles.tableCol,
                      { width: COLS.amt, textAlign: "right" },
                    ]}
                  >
                    {item.amount}
                  </Text>
                </View>
              ))}

            {(isSinglePageWithFooter || isLastItemPageBeforeFooter) &&
            blankRows === 1 ? (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCol, { width: COLS.sl }]} />
                <Text style={[styles.tableCol, { width: COLS.pkg }]} />

                {/* LEFT: labels list */}
                <View
                  style={[styles.tableCol, { width: COLS.desc, padding: 1 }]}
                >
                  {sumRows
                    .filter((r) => {
                      if (!r) return false;
                      if (r.type === "hr") return true; // keep divider
                      if (r.label === "Taxable") return true; // always show taxable
                      return Number(r.value) !== 0; // only show non-zero numeric rows
                    })
                    .map((r, idx) =>
                      r.type === "hr" ? (
                        <View key={`lhr-${idx}`} style={sumHR} />
                      ) : (
                        <View key={`lbl-${idx}`} style={sumLine}>
                          <Text style={{ textAlign: "right", width: "100%" }}>
                            {r.label}
                          </Text>
                        </View>
                      )
                    )}
                </View>

                <Text style={[styles.tableCol, { width: COLS.hsn }]} />
                <Text style={[styles.tableCol, { width: COLS.qty }]} />
                <Text style={[styles.tableCol, { width: COLS.rate }]} />
                <Text style={[styles.tableCol, { width: COLS.disc }]} />

                {/* RIGHT: values list */}
                <View
                  style={[styles.tableCol, { width: COLS.amt, padding: 1 }]}
                >
                  {sumRows
                    .filter((r) => {
                      if (!r) return false;
                      if (r.type === "hr") return true;
                      if (r.label === "Taxable") return true;
                      return Number(r.value) !== 0;
                    })
                    .map((r, idx) =>
                      r.type === "hr" ? (
                        <View key={`rhr-${idx}`} style={sumHRBorder} />
                      ) : (
                        <View key={`val-${idx}`} style={sumLine}>
                          <Text style={{ textAlign: "right", width: "100%" }}>
                            {typeof r.value === "number"
                              ? fix2(r.value)
                              : r.value}
                          </Text>
                        </View>
                      )
                    )}
                </View>
              </View>
            ) : null}

            {pageIndex === totalPages - 2 && blankRows === 1 && (
              <View
                style={[
                  styles.table,
                  {
                    marginTop: 0,
                    marginBottom: 0,
                    borderLeft: "0.6px solid #777",
                    borderRight: "0.6px solid #777",
                    borderBottom: "0.6px solid #777",
                    borderTop: "0.6px solid #777",
                  },
                ]}
              >
                <View style={styles.tableRow}>
                  {columnWidths.map((width, idx) => (
                    <Text
                      key={idx}
                      style={[
                        styles.tableCol,
                        {
                          width,
                          textAlign: idx === 0 ? "center" : "right",
                          borderTop: "0.6px solid #777",
                          borderBottom: "0.6px solid #777",
                          borderLeft: idx === 0 ? "0.6px solid #777" : "none",
                          borderRight: "0.6px solid #777",
                          fontWeight: "bold",
                          padding: 2,
                        },
                      ]}
                    >
                      {(() => {
                        switch (idx) {
                          case 0:
                            return "Total";
                          case 4:
                            return val(data?.totals?.totalQty);
                          case 7:
                            return val(data?.totals?.grandTotal);
                          default:
                            return "";
                        }
                      })()}
                    </Text>
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Footer or continuation note */}
        <View style={{ marginTop: 0 }}>
          {showFooter ? (
            <FooterBlock style={{ padding: 0, margin: 0 }} />
          ) : (
            <View style={{ paddingVertical: 6 }}>
              <Text style={{ fontSize: 8, textAlign: "right" }}></Text>
            </View>
            // <FooterBlock />
          )}
        </View>
      </Page>
    );
  };

  // Build pages: paginate items (6 per page) and show totals/footer only on last page
  const docPages = [];
  // original items from data
  const originalItems = Array.isArray(data.items) ? data.items : [];

  // how many dummy items you want to append (set to 7 as requested)
  const dummyItemsToAdd = 0;

  // create simple dummy item objects (tweak fields as needed)
  const dummyItems = Array.from({ length: dummyItemsToAdd }, (_, i) => ({
    description: `Dummy Item ${i + 1}`,
    kindOfPckg: "",
    hsn: "",
    qty: 1,
    baseUnit: "pcs",
    rate: 0,
    discountZldv: 0,
    discountZdli: 0,
    amount: "0.00",
    batches: [],
  }));

  // final items array used for rendering pages
  const allItems = [...originalItems, ...dummyItems];

  /* ---------- pagination & rendering per copy ---------- */
  copies.forEach((copyTitle, copyIndex) => {
    // use the allItems array already created above
    const totalItems = allItems.length;
    const itemsPerPage = 12;

    // no items -> single page with footer
    if (totalItems === 0) {
      docPages.push(
        renderPageWithItems(copyTitle, copyIndex, [], true, 0, 1, 1)
      );
      return;
    }

    // CASE A: totalItems <= 4 -> single page with items AND footer on same page
    if (totalItems <= 3) {
      docPages.push(
        renderPageWithItems(copyTitle, copyIndex, allItems, true, 0, 1, 1)
      );
      return;
    }

    // CASE B: totalItems between 5 and 12 -> show items on one page (no footer),
    // then add a separate page that contains only the footer
    if (totalItems <= itemsPerPage) {
      const pagesCount = 2; // items page + footer page
      // items page (no footer)
      docPages.push(
        renderPageWithItems(
          copyTitle,
          copyIndex,
          allItems,
          false,
          0,
          pagesCount,
          1
        )
      );
      // footer-only page (no items)
      docPages.push(
        renderPageWithItems(
          copyTitle,
          copyIndex,
          [],
          true,
          1,
          pagesCount,
          totalItems + 1
        )
      );
      return;
    }

    // CASE C: totalItems > 12 -> chunk into pages of 12, render item-pages (no footer),
    // then append a final footer-only page
    const pages = [];
    for (let i = 0; i < allItems.length; i += itemsPerPage) {
      pages.push(allItems.slice(i, i + itemsPerPage));
    }

    const pagesCount = pages.length + 1; // extra footer-only page at end
    let absoluteIndex = 0;

    pages.forEach((itemsForPage, pageIdx) => {
      docPages.push(
        renderPageWithItems(
          copyTitle,
          copyIndex,
          itemsForPage,
          false, // no footer on item pages
          pageIdx,
          pagesCount,
          absoluteIndex + 1
        )
      );
      absoluteIndex += itemsForPage.length;
    });

    // final footer-only page
    docPages.push(
      renderPageWithItems(
        copyTitle,
        copyIndex,
        [], // no items on this page
        true,
        pages.length, // zero-based page index of the footer page
        pagesCount,
        absoluteIndex + 1
      )
    );
  });

  return <Document>{docPages}</Document>;
};

export default DomesticExportInvoicePdfViewV1;
