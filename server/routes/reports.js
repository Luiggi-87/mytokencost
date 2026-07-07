import express from "express";
import { authMiddleware } from "../auth.js";
import { dbRun, dbGet, dbAll } from "../db.js";
import PDFDocument from "pdfkit";
import { createObjectCsvWriter } from "csv-writer";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

router.use(authMiddleware);

// GET relatório em PDF ou CSV
router.get("/summary", async (req, res) => {
  try {
    const { startDate, endDate, format = "pdf", projectId } = req.query;

    let dateFilter = "";
    const params = [req.userId];

    if (startDate) {
      dateFilter += " AND c.date >= ?";
      params.push(startDate);
    }

    if (endDate) {
      dateFilter += " AND c.date <= ?";
      params.push(endDate);
    }

    if (projectId) {
      dateFilter += " AND c.project_id = ?";
      params.push(projectId);
    }

    // Query dos dados
    const costs = await dbAll(
      `SELECT
         p.name as project_name,
         a.name as api_name,
         c.amount,
         c.units,
         c.unit_type,
         c.date,
         c.description
       FROM costs c
       LEFT JOIN projects p ON c.project_id = p.id
       LEFT JOIN apis a ON c.api_id = a.id
       WHERE c.user_id = ? ${dateFilter}
       ORDER BY c.date DESC`,
      params
    );

    if (format === "csv") {
      generateCSV(res, costs);
    } else {
      generatePDF(res, costs, startDate, endDate);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function generatePDF(res, costs, startDate, endDate) {
  const doc = new PDFDocument();
  const filename = `relatorio-${Date.now()}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  doc.pipe(res);

  // Header
  doc.fontSize(20).text("Relatório de Custos de APIs", 100, 50);
  doc.fontSize(12).text(`Período: ${startDate || "Início"} até ${endDate || "Hoje"}`, 100, 80);

  // Table
  let y = 120;
  doc.fontSize(10);

  // Header da tabela
  doc.text("Data", 50, y);
  doc.text("Projeto", 150, y);
  doc.text("API", 300, y);
  doc.text("Valor", 450, y);

  y += 20;
  doc.moveTo(50, y).lineTo(550, y).stroke();
  y += 10;

  // Linhas
  let total = 0;
  for (const cost of costs) {
    if (y > 700) {
      doc.addPage();
      y = 50;
    }

    doc.text(new Date(cost.date).toLocaleDateString("pt-BR"), 50, y);
    doc.text(cost.project_name || "-", 150, y);
    doc.text(cost.api_name || "-", 300, y);
    doc.text(`$ ${cost.amount.toFixed(2)}`, 450, y);

    total += cost.amount;
    y += 15;
  }

  // Total
  y += 10;
  doc.moveTo(50, y).lineTo(550, y).stroke();
  y += 10;
  doc.fontSize(12).text(`TOTAL: $ ${total.toFixed(2)}`, 450, y);

  doc.end();
}

function generateCSV(res, costs) {
  const filename = `relatorio-${Date.now()}.csv`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  // Cabeçalho
  const rows = [["Data", "Projeto", "API", "Quantidade", "Tipo", "Valor ($)"]];

  for (const cost of costs) {
    rows.push([
      new Date(cost.date).toLocaleDateString("pt-BR"),
      cost.project_name || "-",
      cost.api_name || "-",
      cost.units || "-",
      cost.unit_type || "-",
      cost.amount.toFixed(2),
    ]);
  }

  // Total
  const total = costs.reduce((sum, c) => sum + c.amount, 0);
  rows.push(["", "", "", "", "TOTAL", total.toFixed(2)]);

  // Converter para CSV
  const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

  res.send(csv);
}

export default router;
