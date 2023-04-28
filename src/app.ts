import { importInvoices } from "./importers/invoices";
import { importPlacements } from "./importers/placement";

async function main() {
	// await importPlacements();
	await importInvoices();
}

main();
