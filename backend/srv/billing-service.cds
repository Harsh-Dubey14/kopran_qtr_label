// BillingService CDS definitions with beginner-friendly comments
// Filename: BillingService_CDS_commented.cds

// -------------------------------------------------------------
// Imports / "using" statements
// -------------------------------------------------------------
// "using {billingDb as b} from '../db/schema';" imports the database
// schema named `billingDb` and gives it the shorter alias `b` so we
// can reference tables like `b.BillingDocuments` below.
using {billingDb as b} from '../db/schema';

// We also import an external service (likely an external OData or
// API model). `ext` will be used later to reference the external
// types (header, items, partners) that represent billing details.
using {API_BILLING_DOCUMENT_SRV as ext} from '../external/API_BILLING_DOCUMENT_SRV';


// -------------------------------------------------------------
// Service declaration
// -------------------------------------------------------------
// @rest marks this as a REST-enabled CDS service. The service
// groups related entity types, functions and actions that clients
// (like a frontend app or an API consumer) can call.
// @requires: 'authenticated-user' is a security annotation telling
// the runtime that only authenticated users may call this service.
// In a real system you'd configure the authentication provider
// separately (JWT, OAuth, SAP BTP XSUAA, etc.).
//
// `service BillingService { ... }` defines a named service. Inside
// we declare entities, functions and actions that are part of the
// public contract of the service.

// Note: Some runtimes accept @rest directly on individual elements
// (like @rest.GET). This example uses both top-level @rest and
// per-operation annotations to map CDS elements to REST endpoints.

// @requires: 'authenticated-user'
@rest
service BillingService {

    // ---------------------------------------------------------
    // Exposing an entity as a projection on a database table
    // ---------------------------------------------------------
    // `entity BillingDocuments as projection on b.BillingDocuments;`
    // creates a service entity named BillingDocuments that is a
    // projection (a subset or view) of the physical DB table
    // `b.BillingDocuments`. Projections allow you to expose only the
    // fields you want and add service-level annotations (security,
    // OData settings, etc.).
    @rest
    entity BillingDocuments as projection on b.BillingDocuments;

    // ---------------------------------------------------------
    // Functions and actions exposed over REST
    // ---------------------------------------------------------
    // Each function/action below is annotated with @rest.GET which
    // maps it to an HTTP GET. In CDS, `function` means a read-only
    // operation that returns data; `action` is typically used for
    // operations that may have side-effects (create/update/delete).
    // Here many are read-only but the code author used `action` for
    // some to allow parameters or more complex processing.

    // A simple GET that returns many BillingDocument records
    @rest.GET
    function getBillingDocsZdata()                                                               returns many BillingDocument;

    // Another GET returning a different projection or view for
    // merit/summary information about billing documents.
    @rest.GET
    function getMaterialDocumentItem()                                                           returns many BillingDocumentMerit;

    @rest.GET
    function getMaterialDocument()                                                           returns many MaterialDocumentHeader ;


    // When the client calls the endpoint path 'generateExportInvoiceData'
    // this action will run. Action accepts a billingDocumentId string
    // and returns an ExportInvoiceData structure. The @path annotation
    // lets you define a custom REST path segment for the generated
    // endpoint.
    @path: 'generateExportInvoiceData'
    @rest.GET
    action   generateExportInvoiceData(billingDocumentId: String)                                returns ExportInvoiceData;

    // Similar action to produce data for a tax invoice
    @path: 'generateTaxInvoiceData'
    @rest.GET
    action   generateTaxInvoiceData(billingDocumentId: String)                                   returns TaxInvoiceData;

    // A general invoice generation endpoint, perhaps used for
    // rendering or PDF creation. It accepts an ID and returns the
    // TaxInvoiceData structure.
    @path: 'getMaterialDocumentDetails'
    @rest.POST
    // Accept either an array of document ids (legacy) or an array of
    // document+item pairs for item-level selection. Both parameters are
    // optional but at least one must be provided by the client.
    action   getMaterialDocumentDetails(MaterialDocuments: array of String,
                                        MaterialDocumentItems: array of MaterialDocumentItemRef) returns array of MaterialDocumentSimple;

    // Type for simplified Material Document response
    type MaterialDocumentSimple {
        materialName    : String;
        supplierName    : String;
        supplierBatch   : String;
        icplBatch       : String;
        receivedDate    : String;
        materialCode    : String;
        mfgDate         : String;
        netWeightKgs    : String;
        expiryDate      : String;
        procurementType : String;
    }

    // Reference type used when clients select specific MaterialDocument
    // items. This allows the client to request only particular
    // MaterialDocument + MaterialDocumentItem combinations.
    type MaterialDocumentItemRef {
        MaterialDocument     : String;
        MaterialDocumentItem : String;
    }

    // Delivery challan generation endpoint. A delivery challan is
    // typically a packing/delivery document used in India and other
    // countries for goods-in-transit.
    @path: 'generateDeliveryChallan'
    @rest.GET
    action   generateDeliveryChallan(billingDocumentId: String)                                  returns TaxInvoiceData;

    // GET action to retrieve raw HTML for an invoice (note the ID
    // parameter is a UUID). This could be used to fetch pre-rendered
    // HTML from a backend renderer or template engine.
    @rest.GET
    action   getInvoiceHtml(ID: UUID)                                                            returns String;

    // A plain function (not necessarily a REST endpoint) that returns
    // a composed BillingDetails structure — useful for internal use
    // inside the server logic. Returning `BillingDetails` composes
    // header, items and partners from the external service model.
    function getExportInvoiceData(billingDocumentId: String)                                     returns BillingDetails;

}


// -------------------------------------------------------------
// Service Types: Data structures returned by the service
// -------------------------------------------------------------
// These type definitions describe the payloads returned by the
// service. They are not physical database tables; they are shapes
// (like TypeScript interfaces) that help consumers and tooling.

@rest
type BillingDocument {
    // Basic fields for a billing document. Types such as Date and
    // String are standard CDS types. The names match what the DB or
    // external service returns.
    BillingDocument     : String;
    BillingDocumentDate : Date;
    BillingDocumentType : String;
    CompanyCode         : String;
    FiscalYear          : String;
    SalesOrganization   : String;
    Division            : String;
    DistributionChannel : String;
    SoldToParty         : String;
    CustomerName        : String;
}

@rest
type MaterialDocumentHeader {

    MaterialDocumentYear              : String;
    MaterialDocument                  : String;
    InventoryTransactionType          : String;

    DocumentDate                      : Date;
    PostingDate                       : Date;
    CreationDate                      : Date;

    CreationTime                      : String;  
    CreatedByUser                     : String;

    MaterialDocumentHeaderText        : String;
    ReferenceDocument                 : String;

    VersionForPrintingSlip            : String;
    ManualPrintIsTriggered            : Boolean;
    CtrlPostgForExtWhseMgmtSyst        : String;
    GoodsMovementCode                 : String;

}

@rest
type BillingDocumentMerit {
    MaterialDocumentYear           : String;
    MaterialDocument               : String;
    MaterialDocumentItem           : String;
    Material                       : String;
    Plant                          : String;
    StorageLocation                : String;
    Batch                          : String;
    BatchBySupplier                : String;
    GoodsMovementType              : String;
    InventoryStockType             : String;
    InventoryValuationType         : String;
    InventorySpecialStockType      : String;
    Supplier                       : String;
    Customer                       : String;
    SalesOrder                     : String;
    SalesOrderItem                 : String;
    SalesOrderScheduleLine         : String;
    PurchaseOrder                  : String;
    PurchaseOrderItem              : String;
    WBSElement                     : String;
    ManufacturingOrder             : String;
    ManufacturingOrderItem         : String;
    GoodsMovementRefDocType        : String;
    GoodsMovementReasonCode        : String;
    Delivery                       : String;
    DeliveryItem                   : String;
    AccountAssignmentCategory      : String;
    CostCenter                     : String;
    ControllingArea                : String;
    CostObject                     : String;
    GLAccount                      : String;
    FunctionalArea                 : String;
    ProfitabilitySegment           : String;
    ProfitCenter                   : String;
    MasterFixedAsset               : String;
    FixedAsset                     : String;
    MaterialBaseUnitISOCode        : String;
    MaterialBaseUnitSAPCode        : String;
    MaterialBaseUnit               : String;
    QuantityInBaseUnit             : Decimal(15, 3);
    EntryUnitISOCode               : String;
    EntryUnitSAPCode               : String;
    EntryUnit                      : String;
    QuantityInEntryUnit            : Decimal(15, 3);
    CompanyCodeCurrency            : String;
    GdsMvtExtAmtInCoCodeCrcy       : Decimal(15, 2);
    SlsPrcAmtInclVATInCoCodeCrcy   : Decimal(15, 2);
    FiscalYear                     : String;
    FiscalYearPeriod               : String;
    FiscalYearVariant              : String;
    IssgOrRcvgMaterial             : String;
    IssgOrRcvgBatch                : String;
    IssuingOrReceivingPlant        : String;
    IssuingOrReceivingStorageLoc   : String;
    IssuingOrReceivingStockType    : String;
    IssgOrRcvgSpclStockInd         : String;
    IssuingOrReceivingValType      : String;
    IsCompletelyDelivered          : Boolean;
    MaterialDocumentItemText       : String;
    GoodsRecipientName             : String;
    UnloadingPointName             : String;
    ShelfLifeExpirationDate        : Date;
    ManufactureDate                : Date;
    SerialNumbersAreCreatedAutomly : Boolean;
    Reservation                    : String;
    ReservationItem                : String;
    ReservationItemRecordType      : String;
    ReservationIsFinallyIssued     : Boolean;
    SpecialStockIdfgSalesOrder     : String;
    SpecialStockIdfgSalesOrderItem : String;
    SpecialStockIdfgWBSElement     : String;
    IsAutomaticallyCreated         : String;
    MaterialDocumentLine           : String;
    MaterialDocumentParentLine     : String;
    HierarchyNodeLevel             : String;
    GoodsMovementIsCancelled       : Boolean;
    ReversedMaterialDocumentYear   : String;
    ReversedMaterialDocument       : String;
    ReversedMaterialDocumentItem   : String;
    ReferenceDocumentFiscalYear    : String;
    InvtryMgmtRefDocumentItem      : String;
    InvtryMgmtReferenceDocument    : String;
    MaterialDocumentPostingType    : String;
    InventoryUsabilityCode         : String;
    EWMWarehouse                   : String;
    EWMStorageBin                  : String;
    DebitCreditCode                : String;
    YY1_supplier_batch1_MMI        : String;
    YY1_BOEDate_MMI                : Date;
    YY1_LRNO1_MMI                  : String;
    YY1_VehicleNo1_MMI             : String;
    YY1_BOENo_MMI                  : String;
    YY1_InvoiceNo_MMI              : String;
    YY1_CustomExchangeRat_MMI      : Decimal(15, 2);
    YY1_EwayBillNo_MMI             : String;
    YY1_BLDate_MMI                 : Date;
    YY1_InvoiceDate_MMI            : Date;
    YY1_Transporter_MMI            : String;
    YY1_BLNo_MMI                   : String;
    YY1_qrcode_label_MMI           : String;
}


// -------------------------------------------------------------
// Types for Export Invoice generation
// -------------------------------------------------------------
// `ExportInvoiceItem` models a single line item on an export
// invoice. We store qty, rate and computed amount.

type ExportInvoiceItem {
    description : String;
    qty         : Decimal(15, 2); // quantity with two decimals
    rate        : Decimal(15, 5); // rate with higher precision
    amount      : Decimal(15, 2); // qty * rate (rounded to 2 decimals)
}

// `ExportInvoiceData` models the whole export invoice payload
// including header, totals and a list of items.

type ExportInvoiceData {
    invoiceNo   : String;
    invoiceDate : String; // sometimes kept as text to control formatting
    currency    : String;
    netAmount   : Decimal(15, 2);
    grossAmount : Decimal(15, 2);
    incoterms   : String; // e.g. FOB, CIF
    location    : String; // Incoterms location or port
    items       : many ExportInvoiceItem; // a list of line items
    totalFOB    : Decimal(15, 2);
    freight     : Decimal(15, 2);
    insurance   : Decimal(15, 2);
    totalCIF    : Decimal(15, 2);
    amountWords : String; // textual representation of grand total
}


// -------------------------------------------------------------
// Composition type that uses external service types
// -------------------------------------------------------------
// `BillingDetails` uses `Composition` to combine related entities
// from the external service `ext`. This tells the runtime how to
// fetch header, its items and partners together.

type BillingDetails {
    header   : Composition of one ext.A_BillingDocument; // single header

    // `items` is a composition of many ext.A_BillingDocumentItem
    // and is linked by the `BillingDocument` key. This effectively
    // says: "items where items.BillingDocument = header.BillingDocument".
    items    : Composition of many ext.A_BillingDocumentItem
                   on items.BillingDocument = header.BillingDocument;

    // `partners` contains buyer/seller/ship-to like partner roles
    partners : Composition of many ext.A_BillingDocumentPartner
                   on partners.BillingDocument = header.BillingDocument;
}


// -------------------------------------------------------------
// Types used by tax / general invoice generation
// -------------------------------------------------------------
// These are plain data shapes (document, parties, items, totals)
// used to shape the JSON returned to clients that render invoices
// or generate PDFs.

type TaxInvoiceData {
    document : DocumentInfo; // metadata about the invoice
    seller   : PartyInfo; // selling party details
    buyer    : PartyInfo; // buying party details
    items    : array of InvoiceItem;
    totals   : TotalsInfo; // base, taxes and grand total
}

// Document-level metadata

type DocumentInfo {
    type       : String; // e.g. "Tax Invoice" or "Export Invoice"
    title      : String; // human readable title
    numberDate : String; // combined number and date string for ease
    gstin      : String; // GSTIN (Indian tax id) if applicable
    date       : Date;
    currency   : String;
}

// Party (seller or buyer) information

type PartyInfo {
    name    : String;
    address : Address; // structured address block
}

// Standard address fields

type Address {
    street     : String;
    city       : String;
    region     : String;
    postalCode : String;
    country    : String;
}

// Line item used in tax invoices. qty/rate/amount use higher
// precision (3 decimal places here) in case of fractional units.

type InvoiceItem {
    description : String;
    qty         : Decimal(15, 3);
    rate        : Decimal(15, 3);
    amount      : Decimal(15, 3);
}

// Totals block containing GST splits (CGST/SGST) and grand total

type TotalsInfo {
    base          : Decimal(15, 2); // taxable base amount
    cgst          : Decimal(15, 2); // central GST (if applicable)
    sgst          : Decimal(15, 2); // state GST (if applicable)
    grandTotal    : Decimal(15, 2);
    amountInWords : String; // human-readable amount
}


// -------------------------------------------------------------
// NOTES / best practices (for beginners)
// -------------------------------------------------------------
// 1) Keep types small and focused. If a structure grows large,
//    split it into smaller types and compose them.
// 2) Use `Decimal` for currency to avoid floating-point rounding
//    issues. Choose appropriate precision and scale for your use
//    case (e.g. Decimal(15,2) for rupees/INR, Decimal(15,5) for
//    unit price that needs higher precision).
// 3) Use `Composition` when data naturally belongs together (header
//    and items). Compositions help the runtime fetch and serialize
//    related data in one go.
// 4) Annotate service operations with @rest and @path to control
//    the generated HTTP endpoints. Match the HTTP method to the
//    operation semantics (GET for read-only, POST/PUT for changes).
// 5) Keep naming consistent and meaningful (e.g., BillingDocument,
//    ExportInvoiceData). This helps both humans and tools.
// 6) Add unit tests or small scripts to call these endpoints and
//    validate the shapes during development.

// End of file
