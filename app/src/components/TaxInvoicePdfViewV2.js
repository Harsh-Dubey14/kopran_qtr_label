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
    // position: "sticky",
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

const TaxInvoicePdfViewV2 = ({ data, qrImage }) => {
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

  const showUGST = data?.items?.some(
    (item) => parseFloat(item?.tax?.ugst || 0) > 0
  );

  console.log("showUGST", showUGST);

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

  /** helpers (put above return) */
  const num = (v) => Number((v ?? 0).toString().replace(/,/g, "")) || 0;
  const fix2 = (v) => num(v).toFixed(2);

  // Build synchronized rows so both columns have identical line boxes
  const buildSummaryRows = () => {
    const flat = num(data?.totals?.discountFlat);
    const percent = num(data?.totals?.discountPercent);

    const discountVal = flat > 0 ? flat : percent > 0 ? percent : 0;

    const rows = [
      discountVal > 0 && {
        type: "row",
        label: "Discount",
        value: fix2(discountVal),
      },

      num(data?.totals?.freight) > 0 && {
        type: "row",
        label: "Freight",
        value: fix2(data?.totals?.freight),
      },

      num(data?.totals?.insurance) > 0 && {
        type: "row",
        label: "Insurance",
        value: fix2(data?.totals?.insurance),
      },

      num(data?.totals?.packing) > 0 && {
        type: "row",
        label: "Packing",
        value: fix2(data?.totals?.packing),
      },

      { type: "hr" },
      { type: "row", label: "Taxable", value: fix2(data?.totals?.taxable) },
    ];

    if (data?.totals) {
      const t = data.totals;
      if (num(t.igst) > 0) {
        rows.push({ type: "row", label: "IGST", value: fix2(t.igst) });
      } else {
        if (num(t.cgst) > 0)
          rows.push({ type: "row", label: "CGST", value: fix2(t.cgst) });
        const hasUGST = num(t.ugst) > 0;
        const hasSGST = num(t.sgst) > 0;
        if (hasUGST || hasSGST) {
          rows.push({
            type: "row",
            label: hasUGST ? "UGST" : "SGST",
            value: fix2(hasUGST ? t.ugst : t.sgst),
          });
        }
      }
    }

    rows.push({
      type: "row",
      label: "Round Off",
      value: fix2(data?.totals?.roundOffZrof),
    });

    // ✅ remove falsy entries so nothing renders for absent rows
    return rows.filter(Boolean);
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

  // build copies list from payload; fallback to one page with existing titleDescription
  const copies =
    Array.isArray(data?.document?.copies) && data.document.copies.length
      ? data.document.copies
      : [data?.document?.titleDescription || ""];

  // normalize how you want to display each copy title in header
  const formatCopyTitle = (label) => {
    if (!label) return "";
    // Show as "(ORIGINAL FOR RECIPIENT)" etc. Keep your preferred style here:
    return `(${String(label).toUpperCase()})`;
  };

  const renderPage = (copyTitle, idx) => (
    <Page key={idx} size="A4" style={styles.page}>
      {/* Header Row */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 1,
          position: "relative",
        }}
      >
        {/* LEFT: Logo + IRN */}
        <View style={{ width: "35%" }}>
          <Image
            src="/kopran_logo.png"
            style={{ width: 70, height: 66, marginBottom: 1 }}
          />
          <View>
            <Text>
              <Text style={{ fontWeight: "bold" }}>
                IRN: {val(data?.document?.irn ?? NotAvailabaleValue)}
              </Text>
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
            <Text>
              <Text style={{ fontWeight: "bold" }}>EWay BillNo.</Text> :{" "}
              {val(data?.document?.eWayBillNo ?? NotAvailabaleValue)}
            </Text>
          </View>
        </View>

        {/* CENTER: Title (uses copyTitle) */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "normal" }}>
            {data?.document?.type}
          </Text>
          <Text style={{ fontSize: 8 }}>
            {formatCopyTitle(copyTitle) ||
              data?.document?.titleDescription ||
              ""}
          </Text>
        </View>

        {/* RIGHT: QR */}
        <View style={{ width: "30%", alignItems: "center" }}>
          <Text style={{ fontWeight: "bold", marginBottom: 2 }}>e-Invoice</Text>
          {qrImage ? (
            <Image src={qrImage} style={{ width: 64, height: 64 }} />
          ) : (
            <View
              style={{
                width: 64,
                height: 64,
                border: "0.5px solid #aaa",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 7, color: "#888" }}>
                QR Not Available
              </Text>
            </View>
          )}
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
            padding: 1,
          }}
        >
          <Text style={styles.bold}>{data?.seller.name}</Text>
          <Text>{data?.seller.address}</Text>
          <Text>GSTIN/UIN: {data?.seller.gstin}</Text>
          <Text>
            State Name : {data?.seller?.state}, Code : {data?.seller?.stateCode}
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
      {/*  */}
      <View
        style={{
          flexDirection: "row",
          width: "100%",
          marginBottom: 0,
        }}
      >
        {/* LEFT: Consignee Info */}
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

          <Text>GSTIN/UIN: {data?.consignee.gstin || NotAvailabaleValue}</Text>

          <Text>
            State Name : {data?.consignee.state || NotAvailabaleValue} Code :{" "}
            {data?.consignee?.stateCode}
          </Text>

          <Text>
            Contact person :{" "}
            {data?.consignee.contactPerson || NotAvailabaleValue}
          </Text>

          <Text>Contact : {data?.consignee.contact || NotAvailabaleValue}</Text>

          <Text>E-Mail : {data?.consignee.email || NotAvailabaleValue}</Text>
        </View>

        {/* RIGHT: Dispatch Doc No. Delivery Note Date           */}
        {/* RIGHT COLUMN — one wrapper so vertical borders are continuous */}
        <View style={{ width: "50%" }}>
          {/* Outer right column borders (own the vertical lines) */}
          <View
            style={{
              borderLeft: "0.6px solid #777",
              borderRight: "0.6px solid #777",
              // no bottom here; the next section will close it
            }}
          >
            {/* DISPATCH ROWS (only top borders per row) */}
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
                data?.shipping?.countryInfo?.destination || NotAvailabaleValue,
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
                    borderLeft: "0.6px solid #777", // center seam
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

          {/* BILLING INSTRUCTIONS — connects with a top border, closes bottom */}
          {/* filler row */}
          <View
            style={{
              borderLeft: "0.6px solid #777",
              borderRight: "0.6px solid #777",
              borderTop: "0.6px solid #777", // connects to above
              borderBottom: "0.6px solid #777", // closes the right column box
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
                    borderTop: "0px solid #777", // connects to above
                    borderBottom: "0px solid #777", // closes the right
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
            padding: 1,
          }}
        >
          <Text style={styles.bold}>Buyer (Bill To)</Text>
          <Text style={styles.bold}>
            {" "}
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
            Place of Supply : {data?.buyer.placeOfSupply || NotAvailabaleValue}
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
              style={[styles.col, { width: "100%", border: "0px solid black" }]}
            >
              Billing Instructions:{"\n"}
              <Text style={{ fontWeight: "bold" }}>
                {data?.transport.BillingInstructionLongText || ""}
              </Text>
            </Text>
          </View>
        </View>
      </View>
      {/* Items Table */}
      {/* Items Table - Fixed Column Widths */}
      <View
        style={{
          flexGrow: 0,
          justifyContent: "flex-start",
          textAlign: "center",
        }}
      >
        <View style={styles.table}>
          {/* Table Header */}
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

              <View style={[styles.tableCol, { width: COLS.desc, padding: 1 }]}>
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
                  item?.hsnDecor?.color === "green" ? { color: "green" } : null,
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
                {item.rate}
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
                {item.amount}
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
              <View style={[styles.tableCol, { width: COLS.desc, padding: 1 }]}>
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
              <View style={[styles.tableCol, { width: COLS.amt, padding: 1 }]}>
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
                  style={[
                    styles.tableCol,
                    {
                      width,
                      textAlign: "right",
                      borderBottom: "0px solid black",
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
        </View>
      </View>

      <View
        // break
        style={
          {
            // marginTop: 12,
            // paddingTop: 4,
            // borderTop: "0.6px solid #777",
          }
        }
      >
        <footer
          style={{
            ...styles.footer,
            marginTop: 0,
            borderTop: "0px solid #777",
          }}
        >
          {" "}
          {/*  */}
          {/* Total Amount in Words */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "0.6px solid #777",
              borderTop: "0px solid #777",
              borderLeft: "0.6px solid #777",
              borderRight: "0.6px solid #777",
              padding: 3,
              marginBottom: 0,
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
              // border: "0px solid #777",
              padding: 3,
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

              const showIGST = data?.taxSummary?.some((t) => num(t?.igst) > 0);
              const showUGST = data?.taxSummary?.some((t) => num(t?.ugst) > 0);

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
                );
              }

              // CGST + SGST/UGST table
              return (
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

                    {/* CGST header */}
                    <View
                      style={{ width: "20%", borderLeft: "0.6px solid #777" }}
                    >
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

                    {/* UGST or SGST header */}
                    <View
                      style={{ width: "20%", borderLeft: "0.6px solid #777" }}
                    >
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
                          {showUGST
                            ? tax.ugstRate || "0%"
                            : tax.sgstRate || "0%"}
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
              );
            })()}
          {/* Amount in Words */}
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
            {/* <Text>{"  "}</Text> */}
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
          {/* PAN + Declaration + Bank */}
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
                A/c Holder's Name :{" "}
                {val(data?.seller.bankDetails?.accountHolder)}
              </Text>
              <Text>Bank Name : {val(data?.seller.bankDetails?.bank)}</Text>
              <Text>
                A/c No. : {val(data?.seller.bankDetails?.accountNumber)}
              </Text>
              <Text>
                Branch & IFS Code : {val(data?.seller.bankDetails?.branchIFSC)}
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
                // borderLeft: "0.6px solid #777",
                borderBottom: "0.6px solid #777",
                borderLeft: "none",
                padding: 1,
                alignItems: "flex-end",
              }}
            >
              <Text style={{ textAlign: "center", marginTop: 1 }}>
                For {data?.seller.name}
              </Text>

              {/* Spacer */}
              <View style={{ height: 20 }} />

              <Text style={{ textAlign: "center", marginTop: 1 }}>
                Authorised Signatory
              </Text>
            </View>
          </View>
          {/* Footer */}
          <View style={{ marginTop: 1 }}>
            <Text style={{ textAlign: "center" }}>
              {data?.subjectToJurisdiction || "Jurisdiction: N/A"}
            </Text>
            <Text style={{ textAlign: "center" }}>
              {data?.document?.type === "CREDIT NOTE"
                ? "This is a Computer Generated Document"
                : "This is a Computer Generated Invoice"}
            </Text>
          </View>
        </footer>
      </View>
    </Page>
  );

  return (
    <Document>
      {copies.map((copyTitle, idx) => renderPage(copyTitle, idx))}
    </Document>
  );
};

export default TaxInvoicePdfViewV2;
