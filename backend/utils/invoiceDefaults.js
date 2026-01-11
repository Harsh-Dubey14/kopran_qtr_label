// 📁 utils/invoiceDefaults.js

export const DEFAULT_SELLER = {
  name: "MERIT POLYMERS PRIVATE LIMITED",
  address: "Survey No - 370/1/2, Vapi - Kachigam Road, Village Kachigam, Daman",
  gstin: "26AAOCM3634M1ZZ",
  state: "Dadra & Nagar Haveli and Daman & Diu",
  stateCode: "26",
  email: "sales@meritpolymers.com",
  pan: "AAOCM3634M",
  bankDetails: {
    accountHolder: "Kopran Packing Slips Prints Private Limited",
    bank: "Kotak Mahindra Bank (India)",
    accountNumber: "7945133213",
    branchIFSC: "BORIVALI & KKBK0000653",
  },
};

export const DEFAULT_EXPORTER = DEFAULT_SELLER; // Same for now

export const DEFAULT_PACKAGING = {
  marksAndNos: "",
  numberAndKindOfPackages: "",
  grossWeight: "",
  netWeight: "",
};

export const DEFAULT_JURISDICTION = null;
export const DEFAULT_DECLARATION = null;
export const IS_COMPUTER_GENERATED = true;

export const DEFAULT_TITLE_DESCRIPTION = "(ORIGINAL FOR RECEIPIENT)";
export const DEFAULT_EXPORT_LUT_TITLE_DESCRIPTION =
  "Export under LUT (without payment of IGST) in accordance with Rule 96A of the CGST Rules, 2017.";

// --- Job Work HSN enforcement (FG-only) ---
export const JW_TARGET_MATERIALS = new Set([
  "FGFLFPPWIMJW", // FPP WIM
  "FGFLFPPPRIMA JW", // FPP PRIMA
]);
export const FORCE_HSN_FOR_JW = "39029000"; // print with green underline
