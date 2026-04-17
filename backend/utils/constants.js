require("dotenv").config(); // ensure this is at the top

let auth_username, auth_password, baseURL;

switch (process.env.DEPLOYMENT_ENV) {
  case "DEVELOPMENT":
    auth_username = "BAS_USER";
    auth_password = `6a(8S~df6JZ=hYDB)KgtZ(ShWc4-7+j<QCp2W8(}`;
    baseURL = "https://my430774-api.s4hana.cloud.sap";
    break;

    case "QUALITY":
    auth_username = "BAS_USER";
    auth_password = "eK2(BRaS6Nyqc5cccJ8SUQ-==%d$uVZEHFSjy)GG";
    baseURL = "https://my431480.s4hana.cloud.sap/";
    break;

  case "PRODUCTION":
  default:
    auth_username = "BAS_USER";
    auth_password = `j8QJRTJH]2s=SAF%qH)#q9%QRR-f=/MEplB>4@in`;
    baseURL = "https://my433016-api.s4hana.cloud.sap";
    break;
}

const auth = Buffer.from(`${auth_username}:${auth_password}`).toString(
  "base64",
);

module.exports = {
  auth,
  baseURL,
  auth_username,
  auth_password,
};
