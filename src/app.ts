import { importEmployees } from "./importers/employee";
import { deleteInvoices, importInvoices } from "./importers/invoices";
import { deletePlacements, importPlacements } from "./importers/placement";
import { deleteTimesheets, importTimesheets } from "./importers/timesheets";

async function main() {
	// await importPlacements();
	// await deletePlacements();
	await importInvoices();
	// await deleteInvoices();
	// await importTimesheets();
	// await deleteTimesheets("KUBE000389");
	// await deleteTimesheets("KUBE000390");
	// await deleteTimesheets("KUBE000392");
	// await deleteTimesheets("KUBE000393");
	// await importEmployees();
}

main();
