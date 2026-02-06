import React, { useMemo } from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

/* =========================================================
   CONSTANTS
========================================================= */
// ===== PRINT-SAFE UNITS (300 DPI) =====
// 1 cm = 28.346 pt (72 DPI)
const CM = (cm) => cm * 28.346;

const PAGE = CM(10);        // 283.46 pt  → 10 cm
const SAFE_MARGIN = CM(0.2); // 14.17 pt   → 0.5 cm
const FORMAT_HEIGHT = CM(0.5);
    // ~5 mm
const BOTTOM_REDUCE = CM(0.7); // 5 mm from bottom


/* =========================================================
   STYLES
========================================================= */
const styles = StyleSheet.create({
  page: {
    width: PAGE,
    height: PAGE,
    padding: 0, // 🔥 IMPORTANT: NO PAGE PADDING
    backgroundColor: "#fff",
 fontFamily: "Helvetica-Bold", // 🔥 BEST for PDF
   fontSize: 9,
    lineHeight: 1.1,
  },

  /* FORMAT NO ABOVE BORDER */
formatWrapper: {
  height: FORMAT_HEIGHT,
  alignItems: "flex-start",
  justifyContent: "flex-end",
  marginBottom: -1,

  paddingLeft: 50, // ⬅️ CHANGE ONLY THIS
},


  formatText: {
    marginLeft: -20, // ⬅️ shifts text left
    fontSize: 12,
    fontWeight: "bold",
  },
  /* BORDERED AREA */
borderBox: {
  marginLeft: SAFE_MARGIN + 15,
  marginRight: SAFE_MARGIN , // ⬅️ extra right margin
  marginBottom: SAFE_MARGIN,
  height:
    PAGE -
    SAFE_MARGIN * 2 -
    FORMAT_HEIGHT -
    BOTTOM_REDUCE, // ⬅️ THIS reduces bottom

  borderWidth: 1,
  borderColor: "#000",
  padding: 6,
  position: "relative",
},

  /* HEADER */
  header: {
    height: 32,
    justifyContent: "center",
  },
  logo: {
    width: 28,
    height: 28,
  },
  companyWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  companyName: {
   fontSize: 10,
    fontWeight: "bold",
  },
  companyLocation: {
    fontSize: 10,
  },

  separator: {
    borderBottomWidth: 0.8,
    borderBottomColor: "#000",
    marginVertical: 4,
    marginLeft: -6,
    marginRight: -6,
  },

  /* ROW SYSTEM */
  row: {
    flexDirection: "row",
    marginBottom: 2,
    alignItems: "center",
  },
  halfRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  halfCol: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    width: 55,
   fontSize: 9,
    fontWeight: "bold",
  },
   label1: {
    // width: 65,
   fontSize: 9,
    fontWeight: "bold",
  },
  value: {
    flex: 1,
   fontSize: 9,
  },
valueWide: {
  flex: 1,            // take remaining space
  marginLeft: 6,      // ⬅️ breathing space after label
  fontSize: 8,
},

  materialRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  materialLabel: {
    width: 55,
   fontSize: 9,
    fontWeight: "bold",
  },
  materialValue: {
    flex: 1,
   fontSize: 9,
  },

  /* SIGN + FOOTER */
  signRow: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    flexDirection: "row",
  },
  signCol: {
    width: "50%",
    alignItems: "center",
  },
  signText: {
   fontSize: 9,
    fontWeight: "bold",
  },

  formatText: {
   fontSize: 9,
    fontWeight: "bold",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 22,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});

/* =========================================================
   DATA MAP
========================================================= */
const mapItem = (i) => ({
  materialName: i.materialName || " ",
  dec: i.dec || "",
  materialCode: i.materialCode || i.Material || " ",
  grn_no: i.grn_no || " ",
  grn_date: i.grn_date || " ",
  grn_QTY: i.grn_Qty || "",
  baseUnit: i.MaterialBaseUnit || "",
  batch: i.batchNo || " ",
  batchQty: i.Batch_QTY || "",
  // mdi: i.MaterialDocumentItem,
  // grn: i.grn_item_count,
  container: i.container || "",

  // container: `${i.MaterialDocumentItem || ""}/${i.grn_item_count || ""}`,
  mfgDate: i.mfgDate || "",
  expDate: i.expiryDate || "",
  mfgBy: i.ManfNm || "",
  supplier: i.supplierName || "",
  PersonFullName: i.PersonFullName || " ",
});

/* =========================================================
   PDF COMPONENT
========================================================= */
const MigoLabelSlipPdf = ({ data = [] }) => {
  const items = useMemo(() => data.map(mapItem), [data]);

  return (
    <Document>
      {items.map((m, idx) => (
       <Page
  key={idx}
  size={[PAGE, PAGE]}
  wrap={false}
  style={styles.page}
>

          {/* FORMAT NO ABOVE BORDER */}
          <View style={styles.formatWrapper}>
            <Text style={styles.formatText}>FORMAT NO : MWH001-F02-18</Text>
          </View>

          {/* BORDER */}
          <View style={styles.borderBox}>
            {/* FORMAT NO ON BORDER */}

            {/* HEADER */}
            <View style={styles.header}>
              <View style={styles.companyWrapper}>
                <Text style={styles.companyName}>
                  KOPRAN RESEARCH LABORATORIES LTD.
                </Text>
                <Text style={styles.companyLocation}>Mahad</Text>
              </View>
            </View>

            <View style={styles.separator} />

            {/* CONTENT */}
            <View style={styles.materialRow}>
              <Text style={styles.materialLabel}>Material</Text>
              <Text style={styles.materialValue}>
                : {m.materialName} {m.dec}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Item Code</Text>
              <Text style={styles.value}>: {m.materialCode}</Text>
            </View>

            <View style={styles.halfRow}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>GRN No</Text>
                <Text style={styles.value}>: {m.grn_no}</Text>
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label1}>GRN Dt : {m.grn_date}</Text>
                {/* <Text style={styles.value}></Text> */}
              </View>
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>GRN Qty</Text>
                <Text style={styles.value}>: {m.grn_QTY} {m.baseUnit}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Batch No</Text>
              <Text style={styles.value}>: {m.batch}</Text>
            </View>

            <View style={styles.row}>
                <Text style={styles.label}>Batch Qty</Text>
                <Text style={styles.value}>: {m.batchQty} {m.baseUnit}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Container</Text>
              <Text style={styles.value}>: {m.container}</Text>
            </View>

            <View style={styles.halfRow}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Mfg Dt</Text>
                <Text style={styles.value}>: {m.mfgDate}</Text>
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label1}>Exp./Retest Dt : {m.expDate}</Text>
                {/* <Text style={styles.value}>: {m.expDate}</Text> */}
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Mfg By</Text>
              <Text style={styles.value}>: {m.mfgBy}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Supplier</Text>
              <Text style={styles.value}>: {m.supplier}</Text>
            </View>

            {/* SIGN */}
            <View style={styles.signRow}>
              <View style={styles.signCol}>
                     <Text style={styles.signText}>{m.PersonFullName}</Text>
                <Text style={styles.signText}>Prepared By</Text>
           
              </View>
              <View style={styles.signCol}>
                 <Text style={styles.value}> </Text>
                <Text style={styles.signText}>Checked By</Text>
              </View>
            </View>

            {/* FOOTER */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>QUARANTINE</Text>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  );
};

export default React.memo(MigoLabelSlipPdf);
