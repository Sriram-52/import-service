import Excel from "exceljs";

export const getCell = (row: Excel.Row, col: number) => {
	const cell = row.getCell(col);
	return cell.value?.toString() ?? "";
};
