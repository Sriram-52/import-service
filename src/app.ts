import { importInvoices, missedInvoices } from "./importers/invoices";
import { importPlacements } from "./importers/placement";
import { importTimesheets, missedTimesheets } from "./importers/timesheets";

async function main() {
	// import data
	// await importPlacements();
	// await importTimesheets();
	// await importInvoices();
	// missed data
	// await missedTimesheets();
	// await missedInvoices();
}

main().catch((err) => console.log(err));
