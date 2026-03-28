import PDFDocument from "pdfkit";
import PDFTable from "pdfkit-table";

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
