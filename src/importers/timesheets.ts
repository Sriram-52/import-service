import { db } from "../db/admin";
import { transformTimesheetsData } from "../mappers/timesheets";
import { parseDate } from "../utils";

export async function importTimesheets() {
	const timesheets = await transformTimesheetsData();
	console.log(`Total timesheets to import: ${timesheets.length}`);
	const promises = timesheets.map(async (timesheet) => {
		try {
			const timesheetRef = db
				.collection(`EMPLOYEES/${timesheet.employeeId}/TIMESHEETS`)
				.doc();

			const placementRef = db
				.collection(`EMPLOYEES/${timesheet.employeeId}/PLACEMENTS`)
				.doc(timesheet.jobCode);

			const placement = (await placementRef.get()).data();
			if (!placement) {
				return Promise.reject(`Placement ${timesheet.jobCode} does not exist`);
			}

			await timesheetRef.set({
				approvedDetails: {
					approvedAt: new Date(timesheet.approvedAt).toISOString(),
					approvedBy: timesheet.approvedBy,
				},
				attachmentDetails: {
					publicURL: "",
					sourcePath: "",
				},
				clientId: placement.clientId,
				createdAt: new Date(timesheet.submittedAt).toISOString(),
				createdBy: timesheet.employeeId,
				employeeID: timesheet.employeeId,
				endDate: parseDate(timesheet.toDate),
				id: timesheetRef.id,
				invoiceDetails: {
					invoiceIds: [],
					isInvoiced: true,
				},
				isApproved: true,
				isDefaulter: false,
				isExist: true,
				isRejected: false,
				placementID: timesheet.jobCode,
				reportingManager: timesheet.reportingManager,
				startDate: parseDate(timesheet.fromDate),
				statusReport: "<p></p>",
				timesheetDetails: {},
				totalWorkedHours: {
					OT: timesheet.totalWorkingHoursOT,
					standard: timesheet.totalWorkingHoursStandard,
				},
				workdetails: {
					OTtime: [],
					standardTime: [],
				},
			});
			return Promise.resolve(
				`Timesheet ${timesheetRef.id} - ${timesheet.employeeId} -${timesheet.jobCode} imported successfully`
			);
		} catch (error) {
			return Promise.reject((<Error>error).message);
		}
	});
	const promiseSettedResult = await Promise.allSettled(promises);
	console.log(`Total: ${promiseSettedResult.length}`);
	const rejected = promiseSettedResult.filter(
		(result) => result.status === "rejected"
	);
	rejected.forEach((result) => console.log(result));
	console.log(`Rejected: ${rejected.length}`);
	const fulfilled = promiseSettedResult.filter(
		(result) => result.status === "fulfilled"
	);
	fulfilled.forEach((result) => console.log(result));
	console.log(`Fulfilled: ${fulfilled.length}`);
}
