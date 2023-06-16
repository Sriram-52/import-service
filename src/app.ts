import {
	importInvoices,
	missedInvoices,
	updateEmpIds,
} from "./importers/invoices";
import { importPlacements } from "./importers/placement";
import {
	importTimesheets,
	missedTimesheets,
	updateTimesheets,
} from "./importers/timesheets";

async function main() {
	// import data
	// await importPlacements();
	// await importTimesheets();
	// await importInvoices();
	// missed data
	// await missedTimesheets();
	// await missedInvoices();
	await updateEmpIds();
	// await updateTimesheets();
}

main().catch((err) => console.log(err));
