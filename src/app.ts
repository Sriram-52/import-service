import { db } from "./db/admin";
import {
	deleteMissedInvoices,
	importInvoices,
	missedInvoices,
	updateEmpIds,
	updatedInvoices,
} from "./importers/invoices";
import { importPlacements } from "./importers/placement";
import {
	importTimesheets,
	missedTimesheets,
	updateTimesheets,
} from "./importers/timesheets";
import { transformInvoicesData } from "./mappers/invoices";
import fs from "fs";

async function getEmployees() {
	const ref = db
		.collection("EMPLOYEES")
		.where("employeeStatus", "==", "Bench")
		.get();
	const employees = (await ref).docs.map((doc) => doc.id);
	const data: Record<string, any> = {};
	const promises = employees.map(async (id) => {
		const placements = await db
			.collection(`EMPLOYEES/${id}/PLACEMENTS`)
			.where("draft", "==", false)
			.where("isExist", "==", true)
			.get();
		const activePlacements = placements.docs.filter(
			(doc) => !doc.data()?.closingReason
		);
		if (activePlacements.length) {
			// const lookupData = await getLookupData(id);
			// data[id] = {
			// 	id,
			// 	placements: activePlacements.length,
			// 	lookupData,
			// };
			await db
				.collection("EMPLOYEES")
				.doc(id)
				.update({ employeeStatus: "Working" });
		}
	});
	await Promise.all(promises);
	// fs.writeFileSync("employees.json", JSON.stringify(data, null, 2));
}

async function getLookupData(empId: string) {
	const snapshot = await db
		.collection(`EMPLOYEES/${empId}/LOOKUP`)
		.doc("employee_status")
		.get();
	const data = snapshot.data()?.info || [];
	const filteredInfo = data.filter(
		(item: any) =>
			!(
				1687099117264 < Date.parse(item.createdAt) && // Sun Jun 18 2023 22:08:37 GMT+0530 (India Standard Time) Migration date
				Date.parse(item.createdAt) < 1687106317264
			)
	);
	return {
		id: snapshot.id,
		info: filteredInfo,
	};
}

async function main() {
	// import data
	// await importPlacements();
	// await importTimesheets();
	// await importInvoices();
	// await deleteMissedInvoices();
	// missed data
	// await missedTimesheets();
	// await missedInvoices();
	// await updateEmpIds();
	// await updateTimesheets();
	await getEmployees();
	// const data = await transformInvoicesData();
	// fs.writeFileSync("invoices.json", JSON.stringify(data, null, 2));
}

main().catch((err) => console.log(err));
