import path from "path";
import { admin, db } from "../db/admin";
import { transformTimesheetsData } from "../mappers/timesheets";
import { getCell, parseDate, reportingManagerId, uploadFile } from "../utils";
import Excel from "exceljs";
import fs from "fs";
// import log4js from "log4js";
import timesheetIds from "../timesheet-ids.json";

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

export async function updateTimesheets() {
	// const filePath = path.join(__dirname, "../../data/timesheets.xlsx");
	// const workbook = new Excel.Workbook();
	// const content = await workbook.xlsx.readFile(filePath);

	// const timesheetsWs = content.getWorksheet(1);
	// const timesheets = timesheetsWs.getRows(2, timesheetsWs.rowCount - 1) ?? [];

	// const promises = timesheets.map(async (row) => {
	// 	const timesheetId = `${getCell(row, "A")}`;
	// 	const timesheetQuery = db
	// 		.collectionGroup("TIMESHEETS")
	// 		.where("id", "==", timesheetId);
	// 	const timesheetQuerySnap = await timesheetQuery.get();
	// 	if (timesheetQuerySnap.size === 0) {
	// 		return;
	// 	}

	// 	const timesheetRef = timesheetQuerySnap.docs[0].ref;
	// 	const timesheet = timesheetQuerySnap.docs[0].data();

	// 	// const { OTtime, standardTime } = timesheet.workdetails;

	// 	// const otTimeArray = standardTime.map((time: any) => {
	// 	// 	const otTime = OTtime.find((ot: any) => ot.date === time.date);
	// 	// 	if (otTime) {
	// 	// 		return otTime;
	// 	// 	}
	// 	// 	return {
	// 	// 		date: time.date,
	// 	// 		value: "00:00",
	// 	// 	};
	// 	// });

	// 	const payload: Record<string, any> = {};

	// 	if (!timesheet?.isRejected && !timesheet?.isApproved) {
	// 		payload["isApproved"] = true;
	// 		payload["approvedDetails"] = {
	// 			approvedAt: new Date("2023-06-01").toISOString(),
	// 			approvedBy: reportingManagerId,
	// 		};
	// 	}

	// 	await timesheetRef.update({
	// 		// reportingManager: timesheet?.reportingManger ?? "",
	// 		// reportingManger: admin.firestore.FieldValue.delete(),
	// 		// "workdetails.OTtime": otTimeArray,
	// 		...payload,
	// 	});

	// 	console.log(`Timesheet ${timesheetId} updated successfully`);
	// });
	// await Promise.all(promises);
	// console.log(`Done`);
	try {
		const timesheets = await db.collectionGroup("TIMESHEETS").get();
		console.log(`Total timesheets: ${timesheets.size}`);
		const requiredTimesheets = timesheets.docs.filter((timesheet) =>
			timesheetIds.includes(timesheet.id)
		);
		console.log(`Total required timesheets: ${requiredTimesheets.length}`);
		const promises = requiredTimesheets.map(async (timesheet) => {
			try {
				await timesheet.ref.update({
					employeeID: "NET000154",
				});
				console.log(`Timesheet ${timesheet.id} updated successfully`);
				return Promise.resolve(
					`Timesheet ${timesheet.id} updated successfully`
				);
			} catch (error) {
				console.error(
					`Timesheet ${timesheet.id} update failed: ${(<Error>error).stack}`
				);
				return Promise.reject(
					`Timesheet ${timesheet.id} update failed: ${(<Error>error).stack}`
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
	} catch (error) {
		console.error(`Timesheet update failed: ${(<Error>error).stack}`);
	}
}

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
