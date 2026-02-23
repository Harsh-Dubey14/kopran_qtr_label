import React, { useMemo } from "react";
import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    fontSize: 9,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 8,
    paddingRight: 8,
    fontFamily: "Helvetica",
    lineHeight: 1.1,
    backgroundColor: "#fff",
    width: 288,
    height: 216,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  label: {
    fontWeight: "bold",
    width: 90,
    marginRight: 4,
  },
  value: {
    fontWeight: "normal",
    flex: 1,
  },
  qrContainer: {
    marginTop: 2,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  qr: {
    width: 40,
    height: 40,
  },
  logo: {
    width: 60,
    height: 30,
    marginBottom: 4,
    marginLeft: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
    justifyContent: "space-between",
  },
  headerTitle: {
    fontWeight: "bold",
    fontSize: 10,
  },
  headerName: {
    fontSize: 10,
  },
});

// IMPORTANT: The 'data' prop should be the API response (invoiceDataArray) from getMaterialDocumentDetails, not the table data.
function mapSapItemToLabel(item) {
  return {
    materialName: item.materialName || "N/A",
    supplierName: item.supplierName || "N/A",
    icplBatch: item.icplBatch || item.Batch || item.MaterialDocument || "N/A",
    supplierBatch:
      item.supplierBatch ||
      item.BatchBySupplier ||
      item.YY1_supplier_batch1_MMI ||
      "N/A",
    materialCode: item.materialCode || item.Material || "N/A",
    receivedDate:
      item.receivedDate ||
      item.ShelfLifeExpirationDate ||
      item.YY1_InvoiceDate_MMI ||
      "N/A",
    netWeightKgs: item.netWeightKgs || item.QuantityInBaseUnit || "N/A",
    mfgDate: item.mfgDate || item.ManufactureDate || "N/A",
    expiryDate: item.expiryDate || item.ShelfLifeExpirationDate || "N/A",
    procurementType: item.procurementType || "N/A",
    // Add more mappings as needed
  };
}

const MigoLabelSlipPdf = ({ data, qrImages = [], mappedData }) => {
  // Allow caller to pass pre-mapped data; otherwise compute once with useMemo
  const items = useMemo(() => {
    if (Array.isArray(mappedData) && mappedData.length) return mappedData;
    return (data || []).map((item) => mapSapItemToLabel(item));
  }, [data, mappedData]);

  return (
    <Document>
      {items.map((mapped, idx) => {
        const original = data && data[idx] ? data[idx] : {};
        const key = `${original.MaterialDocument || idx}_${
          original.Material || idx
        }`;
        return (
          <Page
            key={key}
            size={{ width: 288, height: 216 }}
            orientation="portrait"
            style={styles.page}
          >
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Material Name</Text>
                <Text style={styles.headerName}>{mapped.materialName}</Text>
              </View>
              <Image style={styles.logo} src="/kopran_logo.png" />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Supplier Name</Text>
              <Text style={styles.value}>{mapped.supplierName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>ICPL Batch</Text>
              <Text style={styles.value}>{mapped.icplBatch}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Supplier Batch</Text>
              <Text style={styles.value}>{mapped.supplierBatch}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Material Code</Text>
              <Text style={styles.value}>{mapped.materialCode}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Received Date</Text>
              <Text style={styles.value}>{mapped.receivedDate}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Net Wt. in Kgs</Text>
              <Text style={styles.value}>{mapped.netWeightKgs}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Mfg Date</Text>
              <Text style={styles.value}>{mapped.mfgDate}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Expiry Date</Text>
              <Text style={styles.value}>{mapped.expiryDate}</Text>
            </View>
            <View style={styles.qrContainer}>
              {qrImages && qrImages[idx] && (
                <Image style={styles.qr} src={qrImages[idx]} />
              )}
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

export default React.memo(MigoLabelSlipPdf);
