import path from "path";
import { db } from "../db/admin";
import { transformTimesheetsData } from "../mappers/timesheets";
import { getCell, parseDate, uploadFile } from "../utils";
import Excel from "exceljs";
import fs from "fs";
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

export async function missedTimesheets() {
	const filePath = path.join(__dirname, "../../data/timesheets.xlsx");
	const workbook = new Excel.Workbook();
	const content = await workbook.xlsx.readFile(filePath);

	const timesheetsWs = content.getWorksheet(1);
	const timesheets = timesheetsWs.getRows(2, timesheetsWs.rowCount - 1) ?? [];

	const timesheetIds: string[] = [];
	const promises = timesheets.map(async (row) => {
		const timesheetId = `${getCell(row, "A")}`;
		const timesheetQuery = db
			.collectionGroup("TIMESHEETS")
			.where("id", "==", timesheetId);
		const timesheetQuerySnap = await timesheetQuery.get();
		if (timesheetQuerySnap.size === 0) {
			timesheetIds.push(timesheetId);
			return;
		}
	});
	await Promise.all(promises);
	fs.writeFileSync(
		"missed-timesheets.json",
		JSON.stringify(timesheetIds, null, 2)
	);
	console.log(`Done`);
}

export async function importTimesheets() {
	const timesheets = await transformTimesheetsData();
	console.log(`Total timesheets to import: ${timesheets.length}`);
	for await (const timesheet of timesheets) {
		const timesheetRef = db
			.collection(`EMPLOYEES/${timesheet.employeeID}/TIMESHEETS`)
			.doc(timesheet.id);
		try {
			const placementRef = db
				.collection(`EMPLOYEES/${timesheet.employeeID}/PLACEMENTS`)
				.doc(timesheet.placementID);

			console.log(
				`Checking if placement exists for timesheet: ${timesheet.id}`,
				timesheet.placementID
			);
			const placement = (await placementRef.get()).data();
			if (!placement) {
				return Promise.reject(
					`Placement ${timesheet.placementID} does not exist`
				);
			}

			console.log(
				`Importing timesheet ${timesheetRef.id} - ${timesheet.employeeID} -${timesheet.placementID}`
			);
			const newSourcePath = `EMPLOYEES/${timesheet.employeeID}/TIMESHEETS/${timesheet.attachmentDetails.sourcePath}`;
			let fileurl: string;
			try {
				fileurl = await uploadFile(
					timesheet.attachmentDetails.publicURL,
					timesheet.attachmentDetails.sourcePath,
					newSourcePath
				);
			} catch (error) {
				console.log(
					`file upload failed for Timesheet ${timesheetRef.id}: ${
						(<Error>error).stack
					}`
				);
				fileurl = "";
			}
			timesheet.attachmentDetails.publicURL = fileurl;
			timesheet.attachmentDetails.sourcePath = newSourcePath;
			await timesheetRef.set(timesheet);
			console.log(
				`Timesheet ${timesheetRef.id} - ${timesheet.employeeID} -${timesheet.placementID} imported successfully`
			);
			console.log(
				"===================================================================================================="
			);
		} catch (error) {
			console.log(
				`Timesheet ${timesheetRef.id} - ${timesheet.employeeID} -${
					timesheet.placementID
				} import failed: ${(<Error>error).stack}`
			);
		}
	}
}
