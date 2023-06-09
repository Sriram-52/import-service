import { db } from "../db/admin";
import { transformTimesheetsData } from "../mappers/timesheets";
import { parseDate } from "../utils";
// import log4js from "log4js";

// log4js.configure({
// 	appenders: { timesheets: { type: "file", filename: "timesheets.log" } },
// 	categories: { default: { appenders: ["timesheets"], level: "error" } },
// });

// const logger = log4js.getLogger("timesheets");

export const countTimesheets = async (employeeID: string) => {
	const timesheets = await db
		.collection(`EMPLOYEES/${employeeID}/TIMESHEETS`)
		.get();
	console.log(`Total timesheets for ${employeeID}: ${timesheets.size}`);
};

export const deleteTimesheets = async (employeeID: string) => {
	const timesheets = await db
		.collection(`EMPLOYEES/${employeeID}/TIMESHEETS`)
		.get();
	console.log(`Total timesheets for ${employeeID}: ${timesheets.size}`);
	const promises = timesheets.docs.map(async (timesheet) => {
		try {
			console.log(`Deleting timesheet ${timesheet.id}`);
			await timesheet.ref.delete();
			console.log(`Timesheet ${timesheet.id} deleted successfully`);
			return Promise.resolve(`Timesheet ${timesheet.id} deleted successfully`);
		} catch (error) {
			console.error(
				`Timesheet ${timesheet.id} deletion failed: ${(<Error>error).stack}`
			);
			return Promise.reject(
				`Timesheet ${timesheet.id} deletion failed: ${(<Error>error).stack}`
			);
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
};

export async function importTimesheets() {
	const timesheets = await transformTimesheetsData();
	console.log(`Total timesheets to import: ${timesheets.length}`);
	const promises = timesheets.map(async (timesheet, index) => {
		const timesheetRef = db
			.collection(`EMPLOYEES/${timesheet.employeeId}/TIMESHEETS`)
			.doc();
		try {
			const placementRef = db
				.collection(`EMPLOYEES/${timesheet.employeeId}/PLACEMENTS`)
				.doc(timesheet.jobCode);

			const placement = (await placementRef.get()).data();
			if (!placement) {
				return Promise.reject(`Placement ${timesheet.jobCode} does not exist`);
			}

			console.log(
				`Importing timesheet ${timesheetRef.id} - ${timesheet.employeeId} -${timesheet.jobCode}`
			);
			if (index % 400 === 0) {
				console.log(`Sleeping for 2 seconds`);
				await new Promise((resolve) => setTimeout(resolve, 2000));
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
			console.log(
				`Timesheet ${timesheetRef.id} - ${timesheet.employeeId} -${timesheet.jobCode} -${index} imported successfully`
			);

			return Promise.resolve(
				`Timesheet ${timesheetRef.id} - ${timesheet.employeeId} -${timesheet.jobCode} imported successfully`
			);
		} catch (error) {
			console.error(
				`Timesheet ${timesheetRef.id} - ${timesheet.employeeId} -${
					timesheet.jobCode
				} import failed: ${(<Error>error).stack}`
			);
			return Promise.reject(
				`Timesheet ${timesheetRef.id} - ${timesheet.employeeId} -${
					timesheet.jobCode
				} import failed: ${(<Error>error).stack}`
			);
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
