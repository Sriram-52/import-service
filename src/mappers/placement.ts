import * as path from "path";
import Excel from "exceljs";

export async function importPlacements() {
	const filePath = path.join(__dirname, "../../data/placements.xlsx");
	console.log(filePath);
	const workbook = new Excel.Workbook();
	const content = await workbook.xlsx.readFile(filePath);

	const worksheet = content.getWorksheet(1);
	const rows = worksheet.getRows(1, worksheet.rowCount);

	rows?.forEach((row) => {
		row.eachCell((cell, colNumber) => {
			console.log(`Cell ${colNumber} = ${cell.value}`);
		});
	});
}
