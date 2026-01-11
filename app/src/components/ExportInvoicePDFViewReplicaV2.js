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
    fontSize: 7,
    padding: 10,
    fontFamily: "Helvetica",
    lineHeight: 1.3,
  },
  bold: { fontWeight: "bold" },
  row: { flexDirection: "row" },
  col: { flexGrow: 1, padding: 2, border: "0.6px solid #777" },
  table: {
    display: "table",
    width: "100%",
    border: "0.6px solid #777",
    marginBottom: 0,
  },
  tableRow: {
    flexDirection: "row",
  },

  tableColHeader: {
    padding: 3,
    borderRight: "0.6px solid #777",
    fontWeight: "bold",
  },
  itemRow: {
    flexDirection: "row",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "0.3 solid #ccc",
  },
  //   tallColumn: {
  //     borderTop: "0.6px solid #777",
  //     borderBottom: "0.6px solid #777",
  //     minHeight: "35%", // allow stretch vertically
  //     justifyContent: "flex-start",
  //   },
  itemLine: {
    marginBottom: 4, // Adjust spacing as needed
  },
  tableCol: {
    padding: 3,
    borderRight: "0.6px solid #777",
  },
  tableCell: {
    padding: 3,
  },
  footer: {
    fontSize: 7,
    borderTop: "0.6px solid #777",
    textAlign: "left",
    backgroundColor: "#fff",
    marginTop: 2,
    position: "sticky",
    bottom: 0,
    padding: "1rem",
  },

  borderBoxStyle: {
    border: "0.6px solid #777",
    padding: 2,
    backgroundColor: "#fff",
  },
  logo: {
    width: 70,
    height: 60,
  },
});

const ExportInvoicePDFViewReplicaV2 = ({ data, qrImage }) => {
  const NotAvailabaleValue = "N/A";
  const val = (v) => (v?.toString()?.trim() ? v : NotAvailabaleValue);

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

  const columnWidths = [
    "4%", // Sl
    "10%", // Pkg
    "35%", // Description
    "10%", // HSN
    "10%", // Qty
    "8%", // Rate
    "10%", // Discount
    "13%", // Amount
  ];

  const COLS = {
    sl: "4%",
    pkg: "10%",
    desc: "35%",
    hsn: "10%",
    qty: "10%",
    rate: "8%",
    disc: "10%",
    amt: "13%",
  };

  /** helpers (put above return) */
  const num = (v) => Number((v ?? 0).toString().replace(/,/g, "")) || 0;
  const fix2 = (v) => num(v).toFixed(2);

  // Build synchronized rows so both columns have identical line boxes
  const buildSummaryRows = () => {
    const flat = num(data?.totals?.discountFlat);
    const percent = num(data?.totals?.discountPercent);
    const discountStr =
      flat > 0 ? fix2(flat) : percent > 0 ? fix2(percent) : "0.00";

    const rows = [
      { type: "row", label: "Discount", value: discountStr },
      { type: "row", label: "Freight", value: fix2(data?.totals?.freight) },
      { type: "row", label: "Insurance", value: fix2(data?.totals?.insurance) },
      { type: "row", label: "Packing", value: fix2(data?.totals?.packing) },
      { type: "hr" }, // visual divider before taxable / taxes
      {
        type: "row",
        label: "Taxable",
        value: data?.totals?.taxableINR ?? "0.00",
      },
    ];

    // Taxes (IGST or CGST+UGST/SGST)
    if (data?.taxSummary?.[0]) {
      const t = data.taxSummary[0];
      if (num(t.igst) > 0) {
        rows.push({ type: "row", label: "IGST", value: fix2(t.igst) });
      } else {
        rows.push({ type: "row", label: "CGST", value: fix2(t.cgst) });
        rows.push({
          type: "row",
          label: num(t.ugst) > 0 ? "UGST" : "SGST",
          value: fix2(num(t.ugst) > 0 ? t.ugst : t.sgst),
        });
      }
    }

    rows.push({
      type: "row",
      label: "Round Off",
      value:
        Math.abs(num(data?.totals?.roundOffZrof)) < 0.005
          ? "0.00"
          : fix2(data?.totals?.roundOffZrof),
    });

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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Title */}
        <Text style={{ fontSize: 7, textAlign: "center", marginBottom: 0 }}>
          {data?.document?.type}{" "}
        </Text>
        <Text style={{ fontSize: 5, textAlign: "center", marginBottom: 2 }}>
          {data?.document?.titleDescription}
        </Text>
        {/*  */}
        {/* Sticky Header - includes everything until IGST */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            padding: 2,
            marginBottom: 0,
            alignItems: "flex-start",
          }}
        >
          <View style={[styles.row, { justifyContent: "space-between" }]}>
            <Image style={styles.logo} src="/kopran_logo.png" />
          </View>
          {/* Right: QR Code */}
          <View
            style={{
              width: "30%",
              alignItems: "center", // Center everything horizontally
              padding: 1,
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                marginBottom: 4,
                textAlign: "center",
              }}
            >
              e-Invoice
            </Text>
            {qrImage !== null ? (
              <Image src={qrImage} style={{ width: 80, height: 80 }} />
            ) : (
              <View
                style={{
                  width: 80,
                  height: 80,
                  border: "0.5px solid #aaa",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ fontSize: 8, color: "#888", textAlign: "center" }}
                >
                  QR Not Available
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* E-Invoice QR Code Section */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            padding: 2,
            marginBottom: 0,
            alignItems: "flex-start",
          }}
        >
          {/* E-Invoice QR Code Section */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 2,
              marginBottom: 0,
              alignItems: "flex-start",
            }}
          >
            {/* Left: IRN Details */}
            <View style={{ width: "65%" }}>
              <Text>
                <Text style={{ fontWeight: "bold" }}>IRN</Text> :{" "}
                {val(data?.document?.irn ?? NotAvailabaleValue)}
              </Text>
              <Text>
                <Text style={{ fontWeight: "bold" }}>Ack No.</Text> :{" "}
                {val(data?.document?.ackNo ?? NotAvailabaleValue)}
              </Text>
              <Text>
                <Text style={{ fontWeight: "bold" }}>Ack Date</Text> :{" "}
                {val(data?.document?.ackDate ?? NotAvailabaleValue)}
              </Text>
              <Text>
                <Text style={{ fontWeight: "bold" }}>IRN Status</Text> :{" "}
                {val(data?.document?.irnStatus ?? NotAvailabaleValue)}
              </Text>
              <Text>
                <Text style={{ fontWeight: "bold" }}>Cancel Date</Text> :{" "}
                {val(data?.document?.cancelDate ?? NotAvailabaleValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Seller, Consignee, Buyer */}
        <View style={{ flexDirection: "row", width: "100%", marginBottom: 0 }}>
          {/* LEFT: Seller Information */}
          <View
            style={{
              width: "50%",
              borderTop: "0.6px solid #777",
              borderLeft: "0.6px solid #777",
              borderRight: "0px solid #777",
              borderBottom: "0px solid #777",
              padding: 2,
            }}
          >
            <Text>{data?.seller?.name || "N/A"}</Text>
            <Text>{data?.seller?.address || "N/A"}</Text>
            <Text>GSTIN/UIN: {data?.seller?.gstin || "N/A"}</Text>
            <Text>
              State Name : {val(data?.seller?.state)}, Code :{" "}
              {val(data?.seller?.stateCode)}
            </Text>
            <Text>E-Mail : {data?.seller?.email || "N/A"}</Text>
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
                "",
                "",
                "Mode/Terms of Payment",
                data?.transport.termsOfPayment || NotAvailabaleValue,
              ],
              [
                "Reference No. & Date",
                data?.document.numberDate || NotAvailabaleValue,
                " Purchase Order Date:",
                data?.transport.poDate,
              ],
            ].map(([label1, value1, label2, value2], idx) => (
              <View key={idx} style={styles.tableRow}>
                <Text
                  style={[
                    {
                      padding: "2px",
                      borderTop: "0.6px solid #777",
                      borderLeft: "0.6px solid #777",
                      borderRight: "0px solid #777",
                      borderBottom: "0px solid #777",
                      width: "50%",
                    },
                  ]}
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
                  style={[
                    {
                      padding: "2px",
                      borderTop: "0.6px solid #777",
                      borderLeft: "0.6px solid #777",
                      borderRight: "0.6px solid #777",
                      borderBottom: "0px solid #777",
                      width: "50%",
                    },
                  ]}
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
        </View>
        {/*  */}
        <View style={{ flexDirection: "row", width: "100%", marginBottom: 0 }}>
          {/* LEFT: Consignee Info */}
          <View
            style={{
              width: "50%",
              borderTop: "0.6px solid #777",
              borderLeft: "0.6px solid #777",
              borderRight: "0px solid #777",
              borderBottom: "0px solid #777",
              padding: 2,
            }}
          >
            <Text style={styles.bold}>Consignee (Ship To)</Text>
            <Text style={styles.bold}>
              {data?.consignee.name || NotAvailabaleValue}
            </Text>
            <Text>
              {data?.consignee?.address
                ? `${data.consignee.address?.street || ""}, ${
                    data.consignee.address?.city || ""
                  }, ${data.consignee.address?.region || ""}, ${
                    data.consignee.address?.postalCode || ""
                  }, ${data.consignee.address?.country || ""}`
                : NotAvailabaleValue}
            </Text>

            <Text>
              State Name : {data?.consignee.placeOfSupply || NotAvailabaleValue}{" "}
              , Code : {data?.consignee?.stateCode}
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

          {/* RIGHT: Terms of Delivery */}
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
        {/* BUYER */}
        <View style={{ flexDirection: "row", width: "100%", marginBottom: 0 }}>
          {/* LEFT: Buyer Info */}
          <View
            style={{
              width: "50%",
              borderTop: "0.6px solid #777",
              borderLeft: "0.6px solid #777",
              borderRight: "0px solid #777",
              borderBottom: "0px solid #777",
              padding: 2,
            }}
          >
            <Text style={styles.bold}>Buyer (Bill To)</Text>
            <Text style={styles.bold}>
              {data?.buyer?.name || NotAvailabaleValue}
            </Text>
            <Text>
              {data?.buyer?.address
                ? `${data.buyer.address?.street || ""}, ${
                    data.buyer.address?.city || ""
                  }, ${data.buyer.address?.region || ""}, ${
                    data.buyer.address?.postalCode || ""
                  }, ${data.buyer.address?.country || ""}`
                : NotAvailabaleValue}
            </Text>

            <Text>GSTIN/UIN: {data?.buyer.gstin || NotAvailabaleValue}</Text>

            <Text>
              State Name : {data?.buyer.address?.region || NotAvailabaleValue}
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

          {/* RIGHT: Terms of Delivery */}
          <View
            style={{
              width: "50%",
              borderTop: "0.6px solid #777",
              borderLeft: "0.6px solid #777",
              borderRight: "0.6px solid #777",
              borderBottom: "0px solid #777",
              alignSelf: "stretch", // ✅ Ensures height matches left column
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
                  {data?.transport?.BillingInstructionLongText || ""}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Items Table - Fixed Column Widths */}
        <View
          style={{
            flexGrow: 1,
            justifyContent: "flex-start",
            textAlign: "center",
          }}
        >
          <View style={styles.table}>
            {/* Table Header */}
            <View
              style={{
                ...styles.tableRow,
                borderBottom: "0.6px solid #777",
              }}
            >
              {" "}
              <Text style={[styles.tableColHeader, { width: "4%" }]}>Sl</Text>
              <Text style={[styles.tableColHeader, { width: "10%" }]}>
                No. & kind of Pkgs
              </Text>
              <Text style={[styles.tableColHeader, { width: "35%" }]}>
                Description of Goods
              </Text>
              <Text style={[styles.tableColHeader, { width: "10%" }]}>
                HSN/SAC
              </Text>
              <Text style={[styles.tableColHeader, { width: "10%" }]}>Qty</Text>
              <Text style={[styles.tableColHeader, { width: "8%" }]}>Rate</Text>
              <Text style={[styles.tableColHeader, { width: "10%" }]}>
                Discount
              </Text>
              <Text style={[styles.tableColHeader, { width: "13%" }]}>
                Amount (INR){" "}
              </Text>
            </View>

            {/* Table Rows */}
            {data?.items.map((item, i) => (
              <View key={i} style={styles.tableRow}>
                <Text
                  style={[
                    styles.tableCol,
                    { width: COLS.sl, textAlign: "center" },
                  ]}
                >
                  {i + 1}
                </Text>

                <Text style={[styles.tableCol, { width: COLS.pkg }]} wrap>
                  {item.kindOfPckg || ""}
                </Text>

                <View
                  style={[styles.tableCol, { width: COLS.desc, padding: 3 }]}
                >
                  <Text>{item.description}</Text>
                  {item.batches?.length > 0 && (
                    <Text>
                      {item.batches.map(
                        (b, idx) =>
                          `Batch: ${b.batch}${
                            idx < item.batches.length - 1 ? "\n" : ""
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
                    (b, idx) =>
                      ` ${b.qty} ${item.baseUnit}${
                        idx < item.batches.length - 1 ? "\n" : ""
                      }`
                  )}
                </Text>

                <Text
                  style={[
                    styles.tableCol,
                    { width: COLS.rate, textAlign: "center" },
                  ]}
                >
                  {item?.rateINR}
                </Text>

                {/* Discount column – keep if you don’t have a per-line discount just render blank */}
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

                {/* Amount column */}
                <Text
                  style={[
                    styles.tableCol,
                    { width: COLS.amt, textAlign: "right" },
                  ]}
                >
                  {item.amountINR}
                </Text>
              </View>
            ))}

            {/* Filler Rows */}
            {/* Filler Row (exactly one line-item height if there's space) */}
            {blankRows === 1 && (
              <View style={styles.tableRow}>
                <Text style={[styles.tableCol, { width: COLS.sl }]} />
                <Text style={[styles.tableCol, { width: COLS.pkg }]} />

                {/* LEFT: labels list */}
                <View
                  style={[styles.tableCol, { width: COLS.desc, padding: 3 }]}
                >
                  {sumRows.map((r, idx) =>
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
                  style={[styles.tableCol, { width: COLS.amt, padding: 3 }]}
                >
                  {sumRows.map((r, idx) =>
                    r.type === "hr" ? (
                      <View key={`rhr-${idx}`} style={sumHRBorder} />
                    ) : (
                      <View key={`val-${idx}`} style={sumLine}>
                        <Text style={{ textAlign: "right", width: "100%" }}>
                          {r.value}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              </View>
            )}

            {/* FIX FOOTER */}
            <View
              style={[
                styles.table,
                {
                  marginTop: 0,
                  borderLeft: "0px solid black",
                  borderRight: "0px solid black",
                  borderBottom: "0px solid black",
                  borderTop: "0.6px solid #777",
                },
              ]}
            >
              <View style={styles.tableRow}>
                {columnWidths.map((width, idx) => (
                  <Text
                    key={idx}
                    style={[styles.tableCol, { width, textAlign: "center" }]}
                  >
                    {(() => {
                      switch (idx) {
                        case 0:
                          return "Total";
                        case 4:
                          return val(data?.totals?.totalQty); // Quantity
                        case 7:
                          return val(data?.totals?.grandTotalINR); // grandTotal
                        default:
                          return "";
                      }
                    })()}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {/* Total Amount in Words */}
          {/* <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              border: "0.6px solid #777",
              padding: 4,
              marginBottom: 0,
            }}
          >
            <Text style={{ fontWeight: "bold" }}></Text>
            <Text style={{ fontSize: 7 }}>
              Total Invoice Amount in {val(data?.totals.totalFOB)} @{" "}
              {val(data?.totals.exchangeRate)} /{" "}
              {data?.totals.transactionCurrency} ={" "}
              {data?.totals.transactionCurrency}{" "}
              {val(data?.totals.transactionCurrencyAmount)}
            </Text>
          </View> */}
        </View>

        <View
          break
          style={{
            marginTop: 12,
            paddingTop: 4,
            borderTop: "0.6px solid #777",
          }}
        >
          <footer style={{ ...styles.footer, marginTop: 0 }}>
            {" "}
            {/*  */}
            {/* Total Amount in Words */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                border: "0.6px solid #777",
                padding: 4,
                marginBottom: 0,
              }}
            >
              <Text style={{ fontWeight: "bold" }}>
                Amount Chargeable (in words)
              </Text>
              <Text style={{ fontSize: 7 }}>E. & O.E</Text>
            </View>
            <View
              style={{
                borderLeft: "0.6px solid #777",
                borderRight: "0.6px solid #777",
                borderBottom: "0px solid #777",
                borderTop: "0px solid #777",
                // border: "0px solid #777",
                padding: 4,
              }}
            >
              <Text style={{ fontWeight: "bold", textTransform: "uppercase" }}>
                {"  "}
                {val(data?.totals?.amountInWords)}
              </Text>
            </View>
            {/* Tax Summary Table */}
            {data?.taxSummary?.length > 0 &&
              (() => {
                // helpers (keep numeric and 2-dec fixed)
                const num = (v) =>
                  Number((v ?? 0).toString().replace(/,/g, "")) || 0;
                const fix2 = (v) => num(v).toFixed(2);

                const showIGST = data?.taxSummary?.some(
                  (t) => num(t?.igst) > 0
                );
                const showUGST = data?.taxSummary?.some(
                  (t) => num(t?.ugst) > 0
                );

                // ⬇️ accumulate exactly the fields you display in each table
                const totals = data.taxSummary.reduce(
                  (a, t) => {
                    // For IGST table "Taxable Value" you render taxableAmountINR
                    a.taxableINR += num(
                      t.taxableAmountINR ?? t.taxableAmount ?? t.totalCIFINR
                    );
                    // For CGST/UGST(SGST) table "Taxable Value" you render totalCIFINR
                    a.totalCIFINR += num(
                      t.totalCIFINR ?? t.taxableAmountINR ?? t.taxableAmount
                    );

                    a.igst += num(t.igst);
                    a.cgst += num(t.cgst);
                    a.sgst += num(t.sgst);
                    a.ugst += num(t.ugst);
                    a.totalTaxAmount +=
                      num(t.igst) + num(t.cgst) + num(t.sgst) + num(t.ugst);
                    return a;
                  },
                  {
                    taxableINR: 0, // used in IGST TOTAL row
                    totalCIFINR: 0, // used in CGST/UGST(SGST) TOTAL row
                    igst: 0,
                    cgst: 0,
                    sgst: 0,
                    ugst: 0,
                    totalTaxAmount: 0,
                  }
                );

                if (showIGST) {
                  // IGST table
                  return (
                    <View style={{ marginTop: 0, border: "0.6px solid #777" }}>
                      <View style={{ flexDirection: "row" }}>
                        <Text
                          style={{
                            width: "25%",
                            padding: 3,
                            textAlign: "center",
                            fontWeight: "bold",
                          }}
                        >
                          HSN/SAC
                        </Text>
                        <Text
                          style={{
                            width: "25%",
                            padding: 3,
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
                            padding: 3,
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
                            padding: 3,
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
                              padding: 3,
                              textAlign: "center",
                              borderTop: "0.6px solid #777",
                            }}
                          >
                            {tax.hsn}
                          </Text>
                          <Text
                            style={{
                              width: "25%",
                              padding: 3,
                              textAlign: "center",
                              borderTop: "0.6px solid #777",
                              borderLeft: "0.6px solid #777",
                            }}
                          >
                            {fix2(tax.taxableAmountINR)}
                          </Text>
                          <Text
                            style={{
                              width: "25%",
                              padding: 3,
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
                              padding: 3,
                              textAlign: "center",
                              borderTop: "0.6px solid #777",
                              borderLeft: "0.6px solid #777",
                            }}
                          >
                            {fix2(tax.igst)}
                          </Text>
                        </View>
                      ))}

                      {/* TOTAL row */}
                      <View
                        style={{
                          flexDirection: "row",
                          backgroundColor: "#f7f7f7",
                        }}
                      >
                        <Text
                          style={{
                            width: "25%",
                            padding: 3,
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
                            padding: 3,
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
                            padding: 3,
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
                            padding: 3,
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
                  );
                }

                // CGST + SGST/UGST table
                return (
                  <View style={{ marginTop: 0, border: "0.6px solid #777" }}>
                    <View style={{ flexDirection: "row" }}>
                      <Text
                        style={{
                          width: "20%",
                          padding: 3,
                          textAlign: "center",
                          fontWeight: "bold",
                        }}
                      >
                        HSN/SAC
                      </Text>
                      <Text
                        style={{
                          width: "20%",
                          padding: 3,
                          textAlign: "center",
                          fontWeight: "bold",
                          borderLeft: "0.6px solid #777",
                        }}
                      >
                        Taxable Value
                      </Text>

                      {/* CGST header */}
                      <View
                        style={{ width: "20%", borderLeft: "0.6px solid #777" }}
                      >
                        <Text
                          style={{
                            padding: 3,
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
                              padding: 3,
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
                              padding: 3,
                              textAlign: "center",
                              fontWeight: "bold",
                            }}
                          >
                            Amount
                          </Text>
                        </View>
                      </View>

                      {/* UGST or SGST header */}
                      <View
                        style={{ width: "20%", borderLeft: "0.6px solid #777" }}
                      >
                        <Text
                          style={{
                            padding: 3,
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
                              padding: 3,
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
                              padding: 3,
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
                          padding: 3,
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
                            padding: 3,
                            textAlign: "center",
                            borderTop: "0.6px solid #777",
                          }}
                        >
                          {tax.hsn}
                        </Text>
                        <Text
                          style={{
                            width: "20%",
                            padding: 3,
                            textAlign: "center",
                            borderTop: "0.6px solid #777",
                            borderLeft: "0.6px solid #777",
                          }}
                        >
                          {fix2(tax.totalCIFINR)}
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
                              padding: 3,
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
                              padding: 3,
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
                              padding: 3,
                              textAlign: "center",
                              borderTop: "0.6px solid #777",
                              borderRight: "0.6px solid #777",
                            }}
                          >
                            {showUGST
                              ? tax.ugstRate || "0%"
                              : tax.sgstRate || "0%"}
                          </Text>
                          <Text
                            style={{
                              width: "50%",
                              padding: 3,
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
                            padding: 3,
                            textAlign: "center",
                            borderTop: "0.6px solid #777",
                            borderLeft: "0.6px solid #777",
                          }}
                        >
                          {fix2(num(tax.totalTaxAmount))}
                        </Text>
                      </View>
                    ))}

                    {/* TOTAL row */}
                    <View
                      style={{
                        flexDirection: "row",
                        backgroundColor: "#f7f7f7",
                      }}
                    >
                      <Text
                        style={{
                          width: "20%",
                          padding: 3,
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
                          padding: 3,
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
                            padding: 3,
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
                            padding: 3,
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
                            padding: 3,
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
                            padding: 3,
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
                          padding: 3,
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
                );
              })()}
            {/* Amount in Words */}
            <View
              style={{
                marginBottom: 0,
                padding: 3,
                borderLeft: "0.6px solid #777",
                borderRight: "0.6px solid #777",
                borderBottom: "0.6px solid #777",
                borderTop: "0px solid #777",
              }}
            >
              <Text style={{ fontWeight: "bold", marginBottom: 2 }}>
                Tax Amount (in words)
              </Text>
              <Text>
                {"  "}
                {val(data?.totals?.taxAmountInWords)}
              </Text>
            </View>
            {/* PAN + Declaration + Bank */}
            <View style={{ flexDirection: "row", marginBottom: 0 }}>
              <View
                style={{
                  flex: 1,
                  borderLeft: "0.6px solid #777",
                  borderBottom: "0.6px solid #777",
                  borderTop: "0px solid #777",
                  borderRight: "none",
                  padding: 6,
                }}
              >
                <Text style={styles.bold}>Company's PAN</Text>
                <Text>{val(data?.seller.pan)}</Text>

                <Text style={[styles.bold, { marginTop: 4 }]}>Declaration</Text>
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
                  padding: 6,
                }}
              >
                <Text style={styles.bold}>Company's Bank Details</Text>
                <Text>
                  A/c Holder's Name :{" "}
                  {val(data?.seller.bankDetails?.accountHolder)}
                </Text>
                <Text>Bank Name : {val(data?.seller.bankDetails?.bank)}</Text>
                <Text>
                  A/c No. : {val(data?.seller.bankDetails?.accountNumber)}
                </Text>
                <Text>
                  Branch & IFS Code :{" "}
                  {val(data?.seller.bankDetails?.branchIFSC)}
                </Text>

                {/* <Text
                        style={{
                          textAlign: "center",
                          fontWeight: "bold",
                          marginTop: 12,
                        }}
                      >
                        for {val(data?.seller.name)}
                        For {data?.seller.name}
                      </Text> */}
              </View>
            </View>
            {/* Signature Row */}
            <View style={{ flexDirection: "row", marginBottom: 0 }}>
              <View
                style={{
                  flex: 1,
                  border: "0.6px solid #777",
                  borderRight: "none",
                  padding: 6,
                }}
              >
                <Text>Customer's Seal and Signature</Text>
              </View>

              <View
                style={{
                  flex: 1,
                  border: "0.6px solid #777",
                  borderLeft: "none",
                  padding: 6,
                  alignItems: "flex-end",
                }}
              >
                <Text style={{ textAlign: "center", marginTop: 4 }}>
                  For {data?.seller.name}
                </Text>

                {/* Spacer */}
                <View style={{ height: 30 }} />

                <Text style={{ textAlign: "center", marginTop: 4 }}>
                  Authorised Signatory
                </Text>
              </View>
            </View>
            {/* Footer */}
            <View style={{ marginTop: 6 }}>
              <Text style={{ textAlign: "center" }}>
                {data?.subjectToJurisdiction || "Jurisdiction: N/A"}
              </Text>
              <Text style={{ textAlign: "center" }}>
                This is a Computer Generated Invoice
              </Text>
            </View>
          </footer>
        </View>
      </Page>
    </Document>
  );
};

export default ExportInvoicePDFViewReplicaV2;
