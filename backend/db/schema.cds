namespace billingDb;

entity BillingDocuments {
    key ID            : UUID;
        billingNumber : String(20);
        billingDate   : Date;
        billingType   : String(5);
        companyCode   : String(10);
        fiscalYear    : Integer;
        salesOrg      : String(10);
        division      : String(10);
        distChannel   : String(10);
        soldToParty   : String(10);
        customerName  : String(100);
}
