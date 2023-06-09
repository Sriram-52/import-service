import * as path from "path";
import Excel from "exceljs";
import type { TimeSheet } from "../models";
import { getCell, reportingManagerId } from "../utils";

export async function transformTimesheetsData() {
	const filePath = path.join(__dirname, "../../data/timesheets.xlsx");
	const workbook = new Excel.Workbook();
	const content = await workbook.xlsx.readFile(filePath);

	const worksheet = content.getWorksheet(1);
	const rows = worksheet.getRows(2, worksheet.rowCount - 1);

	const timesheets: TimeSheet[] =
		rows?.map(
			(row): TimeSheet => ({
				employeeId: getCell(row, 1),
				jobCode: `JOB-${getCell(row, 2)}`,
				fromDate: getCell(row, 3),
				toDate: getCell(row, 4),
				submittedAt: getCell(row, 5),
				submittedBy: getCell(row, 1),
				approvedAt: getCell(row, 7),
				approvedBy: reportingManagerId,
				totalWorkingHoursStandard: getCell(row, 9),
				totalWorkingHoursOT: getCell(row, 10) ?? "00:00",
				reportingManager: reportingManagerId,
			})
		) ?? [];
	return timesheets;
}
