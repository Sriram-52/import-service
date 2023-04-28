import { importInvoices } from "./importers/invoices";
import { importPlacements } from "./importers/placement";
import { importTimesheets } from "./importers/timesheets";

async function main() {
	// await importPlacements();
	await importInvoices();
	// await importTimesheets();
}

main();
