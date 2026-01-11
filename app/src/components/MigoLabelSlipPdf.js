import React, { useMemo } from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

/* =========================================================
   STYLES — SINGLE SOURCE OF TRUTH
========================================================= */
const styles = StyleSheet.create({
  page: {
    fontSize: 9,
    fontFamily: "Helvetica",
    lineHeight: 1.1,
    backgroundColor: "#fff",
    width: 283.46,
    height: 283.46,
    position: "relative",
  },

  borderBox: {
    width: 273.6,
    height: 267,
    borderWidth: 1,
    borderColor: "#000",
    padding: 6,
    marginTop: 14,
    alignSelf: "center",
    position: "relative",
  },

  /* ---------- HEADER ---------- */
  header: {
    height: 32,
    justifyContent: "center",
  },
  logo: {
    width: 30,
    height: 30,
  },
  companyWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  companyName: {
    fontSize: 9,
    fontWeight: "bold",
  },
  companyLocation: {
    fontSize: 8,
  },

  formatText: {
    position: "absolute",
    top: 6,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 7,
    fontWeight: "bold",
  },

  separator: {
    borderBottomWidth: 0.8,
    borderBottomColor: "#000",
    marginVertical: 4,
    marginLeft: -6,
    marginRight: -6,
  },

  /* ---------- MATERIAL ---------- */
  materialRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  materialLabel: {
    width: 55,
    fontSize: 8,
    fontWeight: "bold",
  },
  materialValue: {
    flex: 1,
    fontSize: 9,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  /* ---------- ROW SYSTEM ---------- */
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },

  halfRow: {
    flexDirection: "row",
    marginBottom: 2,
  },

  halfCol: {
    flexDirection: "row",
    width: "50%",
    alignItems: "center",
  },

  label: {
    width: 55,
    fontSize: 8,
    fontWeight: "bold",
  },

  value: {
    flex: 1,
    fontSize: 9,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },

  /* ---------- SIGN & FOOTER ---------- */
  signRow: {
    position: "absolute",
    bottom: 45,
    left: 0,
    right: 0,
    flexDirection: "row",
  },
  signCol: {
    width: "50%",
    alignItems: "center",
  },
  signText: {
    fontSize: 8,
    fontWeight: "bold",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 22,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});

/* =========================================================
   DATA MAPPING
========================================================= */
function mapSapItemToLabel(item) {
  return {
    materialName: item.materialName || "N/A",
    materialCode: item.materialCode || item.Material || "N/A",
    grn_no: item.grn_no || "N/A",
    grn_date: item.grn_date || "N/A",
    grn_QTY: item.grn_Qty || "N/A",
    batch: item.batchNo || "N/A",
    mfgDate: item.mfgDate || "N/A",
    expiryDate: item.expiryDate || "N/A",
    supplierName: item.supplierName || "N/A",
    MaterialBaseUnit:item.MaterialBaseUnit || "N/A",
    Batch_Qty:item.Batch_QTY || " ",
    dec: item.YY1_AA16_MMIT || " ",
    ManfNm: item.ManfNm || " ",
    YY1_AA1_MMI:item.YY1_AA1_MMI || " ",
     YY1_AA2_MMI:item.YY1_AA2_MMI || " ",
     grn_item_count : item.grn_item_count || " ",
     MaterialDocumentItem : item.MaterialDocumentItem || " ",
  };
}

/* =========================================================
   PDF COMPONENT
========================================================= */
const MigoLabelSlipPdf = ({ data = [] }) => {
  const items = useMemo(
    () => data.map((item) => mapSapItemToLabel(item)),
    [data]
  );

  return (
    <Document>
      {items.map((mapped, idx) => (
        <Page key={idx} size={{ width: 288, height: 288 }} style={styles.page}>
          <Text style={styles.formatText}>FORMAT NO:MWH001-F02-18</Text>

          <View style={styles.borderBox}>
            {/* HEADER */}
            <View style={styles.header}>
              <Image style={styles.logo} src="/kopran_logo.png" />
              <View style={styles.companyWrapper}>
                <Text style={styles.companyName}>
                  KOPRAN RESEARCH LABORATORIES LTD.
                </Text>
                <Text style={styles.companyLocation}>Mahad</Text>
              </View>
            </View>

            <View style={styles.separator} />

            {/* MATERIAL */}
            <View style={styles.materialRow}>
              <Text style={styles.materialLabel}>Material</Text>
              <Text style={styles.materialValue} wrap={false}>
                : {mapped.materialName} ( {mapped.dec})
              </Text>
            </View>

            {/* SINGLE ROWS */}
            <View style={styles.row}>
              <Text style={styles.label}>Item code No</Text>
              <Text style={styles.value} wrap={false}>
                : {mapped.materialCode}
              </Text>
            </View>

            {/* DOUBLE ROWS */}
            <View style={styles.halfRow}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>GRN No</Text>
                <Text style={styles.value} wrap={false}>
                  : {mapped.grn_no}
                </Text>
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>GRN Dt</Text>
                <Text style={styles.value} wrap={false}>
                  : {mapped.grn_date}
                </Text>
              </View>
            </View>

              <View style={styles.halfRow}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>GRN Qty</Text>
                <Text style={styles.value} wrap={false}>
                  : {mapped.grn_QTY}
                </Text>
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>{mapped.MaterialBaseUnit}</Text>
              </View>
            </View>


            <View style={styles.row}>
              <Text style={styles.label}>Batch No</Text>
              <Text style={styles.value} wrap={false}>
                : {mapped.batch}
              </Text>
            </View>
             <View style={styles.halfRow}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Batch Qty</Text>
                <Text style={styles.value} wrap={false}>
                  : {mapped.Batch_Qty}
                </Text>
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>{mapped.MaterialBaseUnit}</Text>
              </View>
            </View>

                <View style={styles.row}>
              <Text style={styles.label}>Container No</Text>
              <Text style={styles.value} wrap={false}>
                : {mapped.MaterialDocumentItem}/{mapped.grn_item_count}
              </Text>
            </View>

            <View style={styles.halfRow}>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Mfg.Dt </Text>
                <Text style={styles.value} wrap={false}>
                  : {mapped.mfgDate}
                </Text>
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.label}>Exp./Retest Dt </Text>
                <Text style={styles.value} wrap={false}>
                  : {mapped.expiryDate}
                </Text>
              </View>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Mfg.By </Text>
              <Text style={styles.value} wrap={false}>: {mapped.ManfNm}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Supplied</Text>
              <Text style={styles.value} wrap={false}>
                : {mapped.supplierName}
              </Text>
            </View>

            {/* SIGNATURE */}
            <View style={styles.signRow}>
              <View style={styles.signCol}>
                <Text style={styles.signText}>Prepared By</Text>
              </View>
              <View style={styles.signCol}>
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
