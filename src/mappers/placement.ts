import * as path from "path";
import Excel from "exceljs";
import type {
	BillingRateType,
	PayRateType,
	Placement,
	TimeSheetFrequency,
	WorkLocationType,
} from "../models";
import { getCell, getDayFromDate } from "../utils";

export async function transformPlacementsData() {
	const filePath = path.join(__dirname, "../../data/placements.xlsx");
	const workbook = new Excel.Workbook();
	const content = await workbook.xlsx.readFile(filePath);

	const worksheet = content.getWorksheet(1);
	const rows = worksheet.getRows(2, worksheet.rowCount - 1);

	const placements: Placement[] =
		rows?.map(
			(row): Placement => ({
				employeeId: getCell(row, 1),
				jobCode: `JOB-${getCell(row, 2)}`,
				billableClientId: getCell(row, 3),
				jobTitle: getCell(row, 4),
				netTerms: Number(getCell(row, 5)),
				startDate: getCell(row, 6),
				endDate: getCell(row, 7),
				projectEndDate: getCell(row, 8),
				workLocationType: <WorkLocationType>getCell(row, 9),
				workLocationLine1: getCell(row, 10),
				workLocationLine2: getCell(row, 11),
				workLocationCity: getCell(row, 12),
				workLocationState: getCell(row, 13),
				workLocationCountry: getCell(row, 14),
				workLocationZipCode: getCell(row, 15),
				timeSheetFrequency: <TimeSheetFrequency>getCell(row, 16),
				timeSheetStartDay: getDayFromDate(getCell(row, 17)),
				endClientID: getCell(row, 18),
				invoiceFrequency: getCell(row, 19),
				billingRateType: <BillingRateType>getCell(row, 20),
				billingRate: Number(getCell(row, 21)),
				oTBillingRate: Number(getCell(row, 22) ?? 0),
				payRateType: <PayRateType>getCell(row, 23),
				payPercentage: Number(getCell(row, 24)),
				pONumber: getCell(row, 25) ?? "",
			})
		) ?? [];

	return placements;
}
