import { db } from "../db/admin";
import { transformEmployeeData } from "../mappers/employee";

export async function importEmployees() {
	const employees = await transformEmployeeData();
	console.log(`Total employees to import: ${employees.length}`);
	const idTrackerRef = db.collection("ID_TRACKER").doc("employees");
	const idTracker = (await idTrackerRef.get()).data();
	const currentId = idTracker?.companyID ?? 0;
	const promises = employees.map(async (employee, index) => {
		try {
			const currId = currentId + index;
			const employeeId =
				"KUBE" + "0".repeat(6 - currId.toString().length) + currId.toString();
			console.log(employeeId);
			const employeeRef = db.collection(`EMPLOYEES`).doc(employeeId);
			await employeeRef.set(employee);
			console.log(`Employee ${index + 1} imported`);
		} catch (error) {
			console.log(error);
		}
	});
	await Promise.all(promises);
	console.log("All employees imported");
}
