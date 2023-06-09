import * as path from "path";
import Excel from "exceljs";
import type { Employee } from "../models";
import { getCell } from "../utils";

export async function transformEmployeeData() {
	const filePath = path.join(__dirname, "../../data/employees.xlsx");
	const workbook = new Excel.Workbook();
	const content = await workbook.xlsx.readFile(filePath);

	const worksheet = content.getWorksheet(1);
	const rows = worksheet.getRows(2, worksheet.rowCount - 1);

	const employees: Employee[] =
		rows?.map(
			(row): Employee => ({
				firstName: getCell(row, 1),
				lastName: getCell(row, 2),
				gender: getCell(row, 3),
				email: getCell(row, 4),
				phoneNumber: getCell(row, 5),
				reportingMangerID: getCell(row, 6),
				category: getCell(row, 7),
				jobTitle: getCell(row, 8),
				dateOfBirth: getCell(row, 9),
				department: getCell(row, 10),
				payrollId: getCell(row, 11),
				branch: getCell(row, 12),
				dateOfJoining: getCell(row, 13),
				dateOfExit: getCell(row, 14),
				exitByID: getCell(row, 15),
				reasonOfExit: getCell(row, 16),
			})
		) ?? [];

	return employees;
}
