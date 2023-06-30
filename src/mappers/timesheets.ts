import * as path from "path";
import Excel from "exceljs";
import type { Models } from "../models";
import { getCell, reportingManagerId } from "../utils";

export async function transformTimesheetsData(): Promise<Models.TimeSheets[]> {
	const filePath = path.join(__dirname, "../../data/timesheets.xlsx");
	const workbook = new Excel.Workbook();
	const content = await workbook.xlsx.readFile(filePath);

	const timesheetsWs = content.getWorksheet(1);
	const timesheetDetailsWs = content.getWorksheet(2);
	const timesheetAttachmentsWs = content.getWorksheet(3);
	const timesheetActivitiesWs = content.getWorksheet(4);

	const timesheets = timesheetsWs.getRows(2, timesheetsWs.rowCount - 1) ?? [];
	const timesheetDetails =
		timesheetDetailsWs.getRows(2, timesheetDetailsWs.rowCount - 1) ?? [];
	const timesheetAttachments =
		timesheetAttachmentsWs.getRows(2, timesheetAttachmentsWs.rowCount - 1) ??
		[];
	const timesheetActivities =
		timesheetActivitiesWs.getRows(2, timesheetActivitiesWs.rowCount - 1) ?? [];

	const timesheetData: Models.TimeSheets[] = [];
	for await (const timesheet of timesheets) {
		const timesheetId = getCell(timesheet, "A");
		const reqActivities = timesheetActivities.filter(
			(activity) => getCell(activity, "A") === timesheetId
		);
		const statusTypes = {
			Submitted: 0,
			Approved: 1,
			Discrepant: 1,
			Rejected: 2,
		} as const;
		const status =
			statusTypes[getCell(timesheet, "N") as keyof typeof statusTypes];
		const data: Models.TimeSheets = {
			attachmentDetails: {
				publicURL: "",
				sourcePath: "",
			},
			clientId: getCell(timesheet, "K"),
			createdAt: new Date(getCell(reqActivities[0], "B")).toISOString(),
			createdBy: getCell(timesheet, "D"),
			employeeID: getCell(timesheet, "D"),
			endDate: getCell(timesheet, "M"),
			id: timesheetId,
			invoiceDetails: {
				invoiceIds: [],
				isInvoiced: true,
			},
			isApproved: false,
			isDefaulter: false,
			isExist: true,
			isRejected: false,
			placementID: getCell(timesheet, "I"),
			reportingManager: reportingManagerId,
			startDate: getCell(timesheet, "L"),
			statusReport: "",
			timesheetDetails: {},
			totalWorkedHours: {
				OT: "",
				standard: "",
			},
			workdetails: {
				OTtime: [],
				standardTime: [],
			},
		};
		if (status === 1) {
			data.isApproved = true;
			let approvedAt = getCell(timesheet, "U");
			const approvedActivity = reqActivities.find((activity) =>
				getCell(activity, "F").toLowerCase().includes("approved")
			);
			if (!approvedActivity) {
				console.warn(
					`Approved activity not found for timesheet ${timesheetId}`
				);
			} else {
				approvedAt = getCell(approvedActivity, "B");
			}
			data.approvedDetails = {
				approvedAt: new Date(approvedAt).toISOString(),
				approvedBy: reportingManagerId,
			};
		} else if (status === 2) {
			data.isRejected = true;
			const rejectedActivity = reqActivities.find((activity) =>
				getCell(activity, "F").toLowerCase().includes("rejected")
			);
			if (!rejectedActivity) {
				throw new Error(
					`Rejected activity not found for timesheet ${timesheetId}`
				);
			}
			data.rejectedDetails = {
				rejectedAt: new Date(getCell(rejectedActivity, "B")).toISOString(),
				reason: getCell(rejectedActivity, "F"),
				rejectedBy: reportingManagerId,
			};
		}

		const reqDetails = timesheetDetails.filter(
			(detail) => getCell(detail, "C") === timesheetId
		);
		data.workdetails.standardTime = reqDetails
			.filter((detail) => getCell(detail, "F") === "Standard Time")
			.map((detail) => ({
				date: getCell(detail, "D"),
				value: getCell(detail, "E"),
			}));
		data.workdetails.OTtime = reqDetails
			.filter((detail) => getCell(detail, "F") === "OT")
			.map((detail) => ({
				date: getCell(detail, "D"),
				value: getCell(detail, "E"),
			}));

		const updatedOTtime = data.workdetails.standardTime.map((time: any) => {
			const otTime = data.workdetails.OTtime.find(
				(ot: any) => ot.date === time.date
			);
			if (otTime) {
				return otTime;
			}
			return {
				date: time.date,
				value: "00:00",
			};
		});
		data.workdetails.OTtime = updatedOTtime;

		const totalWorkedHours = {
			OT: 0,
			standard: 0,
		};

		for (const detail of data.workdetails.standardTime) {
			const [hours, minutes] = detail.value.split(":");
			totalWorkedHours.standard += Number(hours) + Number(minutes) / 60;
		}

		for (const detail of data.workdetails.OTtime) {
			const [hours, minutes] = detail.value.split(":");
			totalWorkedHours.OT += Number(hours) + Number(minutes) / 60;
		}

		// now convert to string format of HH:MM with zero padding
		const standardHours = Math.floor(totalWorkedHours.standard);
		const standardMinutes = Math.round(
			(totalWorkedHours.standard - standardHours) * 60
		);
		const OTHours = Math.floor(totalWorkedHours.OT);
		const OTMinutes = Math.round((totalWorkedHours.OT - OTHours) * 60);

		data.totalWorkedHours = {
			OT: `${OTHours.toString().padStart(
				2,
				"0"
			)}:${OTMinutes.toString().padStart(2, "0")}`,
			standard: `${standardHours.toString().padStart(2, "0")}:${standardMinutes
				.toString()
				.padStart(2, "0")}`,
		};

		const reqAttachments = timesheetAttachments.filter(
			(attachment) => getCell(attachment, "A") === timesheetId
		);
		if (reqAttachments.length) {
			const attachment = reqAttachments[0];
			data.attachmentDetails = {
				publicURL: getCell(attachment, "C").replace(
					"Timesheet_attachment_folders/timesheet_approvals/",
					"timesheet_approvals_2/"
				),
				sourcePath: getCell(attachment, "B"),
			};
		}

		timesheetData.push(data);
	}
	return timesheetData;
}
