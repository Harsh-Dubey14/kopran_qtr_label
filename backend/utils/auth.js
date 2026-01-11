// utils/auth.js
exports.getSAPHeaders = () => {
  const auth = Buffer.from(
    "abhishek1494:lZxlZVBpNDCPrKCk7KUSqdysL%GsyZtyedCtkxfs"
  ).toString("base64");
  return {
    Authorization: `Basic ${auth}`,
    Accept: "application/json",
    Cookie: "sap-usercontext=sap-client=100",
  };
};
