import * as path from "path";
import Excel from "exceljs";
import type { Invoice } from "../models";
import { getCell } from "../utils";

export async function transformInvoicesData() {
	const filePath = path.join(__dirname, "../../data/invoices.xlsx");
	const workbook = new Excel.Workbook();
	const content = await workbook.xlsx.readFile(filePath);

	const worksheet = content.getWorksheet(1);
	const rows = worksheet.getRows(2, worksheet.rowCount - 1);

	const invoices: Invoice[] =
		rows?.map(
			(row): Invoice => ({
				employeeId: getCell(row, 1),
				jobCode: getCell(row, 2),
				activity: getCell(row, 3),
				hours: Number(getCell(row, 4)),
				invoicedAmount: Number(getCell(row, 5)),
				receivedAmount: Number(getCell(row, 6)),
				invoicedDate: getCell(row, 7),
				invoiceDueDate: getCell(row, 8),
				latestPaymentDate: getCell(row, 9),
				discountAmount: Number(getCell(row, 10)),
			})
		) ?? [];

	return invoices;
}
