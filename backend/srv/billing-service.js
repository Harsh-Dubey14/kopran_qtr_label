// srv/billing-service.js
const mountgetMaterialDocumentItem = require("./handlers/getMaterialDocumentItem");
const mountgetMaterialDocumentDetails = require("./handlers/getMaterialDocumentDetails");
const mountgetMaterialDocument = require("./handlers/getMaterialDocument");

module.exports = (srv) => {
  // Register each action handler module
  mountgetMaterialDocumentItem(srv);
  mountgetMaterialDocument(srv);
  mountgetMaterialDocumentDetails(srv);
};
