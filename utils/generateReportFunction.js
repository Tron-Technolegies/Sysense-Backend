import PDFDocument from "pdfkit";
import PDFTable from "pdfkit-table";
import ExcelJS from "exceljs";

const startSection = (doc, title) => {
  const safeBottom = doc.page.height - doc.page.margins.bottom - 120;

  // If we're too low on the page → force a new page
  if (doc.y > safeBottom) {
    doc.addPage();
  }

  doc.moveDown(1.5);
  doc.fontSize(14).text(title);
  doc.moveDown(0.5);
};

export const generateReportByUser = async (data, res) => {
  const doc = new PDFTable({ margin: 30, size: "A4" });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=employee-report.pdf",
  );
  doc.pipe(res);
  //Title
  doc.fontSize(18).text("Employee Report", { align: "center" });
  doc.moveDown();

  doc.fontSize(12).text(`Employee: ${data?.employeeName}`);
  doc.text(`Period: ${data?.from} to ${data?.to}`);
  doc.moveDown(1.5);

  //Summary Table
  const summaryTable = {
    headers: ["Total Leaves", "Total PettyCash", "Total Timesheets"],
    rows: [
      [
        data?.totalLeaves || 0,
        data?.totalPettyCash ? `AED ${data?.totalPettyCash}` : 0,
        data?.totalTimesheets || 0,
      ],
    ],
  };

  await doc.table(summaryTable, {
    width: 500,
    columnSpacing: 10,
    padding: 10,
  });

  doc.moveDown(2);

  //Timesheet Details
  if (data.timesheets.length > 0) {
    startSection(doc, "TimeSheet Details");

    const timeSheetTable = {
      headers: [
        "Name",
        "Employee No",
        "Date of Submission",
        "Job",
        "Time Worked",
        "Comment",
        "Status",
      ],
      rows: data?.timesheets?.map((x) => [
        x.user?.username,
        x.user?.employeeCode,
        new Date(x.createdAt).toLocaleDateString(),
        x.job?.jobName,
        x.timeWorked,
        x.commentHistory && x.commentHistory.length > 0
          ? x.commentHistory.map((item) => `• ${item.comment}`).join("\n")
          : "-",
        x.status,
      ]),
    };
    await doc.table(timeSheetTable, {
      width: 500,
      columnSpacing: 10,
      padding: 10,
    });

    doc.moveDown(2);
  }

  if (data?.pettyCash.length > 0) {
    startSection(doc, "PettyCash Details");

    const pettyCashTable = {
      headers: [
        "Name",
        "Employee No",
        "Date of Submission",
        "Amount",
        "JV Account",
        "Comment",
        "Status",
      ],
      rows: data?.pettyCash?.map((x) => [
        x.user?.username,
        x.user?.employeeCode,
        new Date(x.date).toLocaleDateString(),
        x.amount,
        x.JVEntry || "-", // ensure field exists
        x.commentHistory && x.commentHistory.length > 0
          ? x.commentHistory.map((item) => `• ${item.comment}`).join("\n")
          : "-",
        x.status,
      ]),
    };

    await doc.table(pettyCashTable, {
      width: 500,
      columnSpacing: 10,
      padding: 10,
    });

    doc.moveDown(2);
  }

  if (data?.leaves?.length > 0) {
    startSection(doc, "Leave Details");

    const leaveTable = {
      headers: [
        "Name",
        "Employee No",
        "Applied On",
        "Start Date",
        "End Date",
        "Leave Type",
        "Reason",
        "Status",
      ],
      rows: data?.leaves?.map((x) => [
        x.user?.username,
        x.user?.employeeCode,
        new Date(x.createdAt).toLocaleDateString(),
        new Date(x.startDate).toLocaleDateString(),
        new Date(x.endDate).toLocaleDateString(),
        x.leaveType,
        x.reason,
        x.status,
      ]),
    };

    await doc.table(leaveTable, { width: 500, columnSpacing: 10, padding: 10 });
    doc.moveDown(2);
  }
  doc.end();
};

const styleHeader = (row) => {
  row.font = { bold: true };
  row.alignment = { vertical: "middle", horizontal: "center" };
};

export const generateExcelReport = async (data, res) => {
  const workbook = new ExcelJS.Workbook();

  if (data.timesheets?.length > 0) {
    const sheet = workbook.addWorksheet("Timesheets");
    sheet.columns = [
      { header: "Name", key: "name", width: 20 },
      { header: "Employee No", key: "employeeNo", width: 20 },
      { header: "Date", key: "date", width: 20 },
      { header: "Job", key: "job", width: 25 },
      { header: "Time Worked", key: "timeWorked", width: 15 },
      { header: "Comment", key: "comment", width: 40 },
      { header: "Status", key: "status", width: 15 },
    ];
    styleHeader(sheet.getRow(1));
    data.timesheets.forEach((x) => {
      sheet.addRow({
        name: x.user?.username,
        employeeNo: x.user?.employeeCode,
        date: new Date(x.createdAt).toLocaleDateString(),
        job: x.job?.jobName,
        timeWorked: x.timeWorked,
        comment: x.commentHistory?.map((c) => c.comment).join(" | ") || "-",
        status: x.status,
      });
    });
  }

  if (data.pettyCash?.length > 0) {
    const sheet = workbook.addWorksheet("PettyCash");

    sheet.columns = [
      { header: "Name", key: "name", width: 20 },
      { header: "Employee No", key: "employeeNo", width: 20 },
      { header: "Date", key: "date", width: 20 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "JV Account", key: "jv", width: 20 },
      { header: "Comment", key: "comment", width: 40 },
      { header: "Status", key: "status", width: 15 },
    ];

    styleHeader(sheet.getRow(1));

    data.pettyCash.forEach((x) => {
      sheet.addRow({
        name: x.user?.username,
        employeeNo: x.user?.employeeCode,
        date: new Date(x.date).toLocaleDateString(),
        amount: x.amount,
        jv: x.JVEntry || "-",
        comment: x.commentHistory?.map((c) => c.comment).join(" | ") || "-",
        status: x.status,
      });
    });
  }

  if (data.leaves?.length > 0) {
    const sheet = workbook.addWorksheet("Leaves");

    sheet.columns = [
      { header: "Name", key: "name", width: 20 },
      { header: "Employee No", key: "employeeNo", width: 20 },
      { header: "Applied On", key: "applied", width: 20 },
      { header: "Start Date", key: "start", width: 20 },
      { header: "End Date", key: "end", width: 20 },
      { header: "Leave Type", key: "type", width: 20 },
      { header: "Reason", key: "reason", width: 30 },
      { header: "Status", key: "status", width: 15 },
    ];

    styleHeader(sheet.getRow(1));

    data.leaves.forEach((x) => {
      sheet.addRow({
        name: x.user?.username,
        employeeNo: x.user?.employeeCode,
        applied: new Date(x.createdAt).toLocaleDateString(),
        start: new Date(x.startDate).toLocaleDateString(),
        end: new Date(x.endDate).toLocaleDateString(),
        type: x.leaveType,
        reason: x.reason,
        status: x.status,
      });
    });
  }
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", "attachment; filename=report.xlsx");
  await workbook.xlsx.write(res);
  res.end();
};
