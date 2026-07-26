import fs from 'node:fs/promises';
import { SpreadsheetFile, Workbook } from '@oai/artifact-tool';
import { CURRICULUM_CATEGORIES, REAL_QUESTION_BANK } from '../../quiz-worker/src/question-bank.js';

const outputPath = '../../outputs/quiz-question-bank/GuestGuard_Inspector_Certification_Question_Bank.xlsx';
const previewDir = '../../outputs/quiz-question-bank/previews';
const workbook = Workbook.create();

const navy = '#161A24';
const navy2 = '#222838';
const gold = '#C9A84C';
const cream = '#EEE8DA';
const teal = '#4AAFB8';
const muted = '#8A94A8';
const red = '#D44A4A';

const summary = workbook.worksheets.add('Executive Summary');
summary.showGridLines = false;
summary.getRange('A1:H1').merge();
summary.getRange('A1').values = [['GuestGuard Inspector Certification — Question Bank']];
summary.getRange('A1:H1').format = {
  fill: navy,
  font: { bold: true, color: cream, size: 20 },
  rowHeight: 34,
  verticalAlignment: 'center'
};
summary.getRange('A2:H2').merge();
summary.getRange('A2').values = [['INTERNAL REVIEW ONLY — This workbook contains the correct answers. Do not distribute it to learners.']];
summary.getRange('A2:H2').format = {
  fill: red,
  font: { bold: true, color: '#FFFFFF', size: 10 },
  rowHeight: 26,
  verticalAlignment: 'center'
};
summary.getRange('A4:B9').values = [
  ['Program rule', 'Current configuration'],
  ['Question pool', '100 questions'],
  ['Initial certification exam', '50 questions'],
  ['Passing score', '80%'],
  ['Attempts allowed', '1 initial attempt + 3 retakes'],
  ['Retake size', 'Twice the number missed (for example, 15 missed → 30 questions)']
];
summary.getRange('A4:B4').format = { fill: gold, font: { bold: true, color: navy } };
summary.getRange('A5:A9').format = { fill: navy2, font: { bold: true, color: cream } };
summary.getRange('B5:B9').format = { fill: '#F4F1EA', font: { color: '#1E1A14' }, wrapText: true };
summary.getRange('A11:H11').values = [['Category', 'Pool', 'Initial selection', 'Pool used', 'Retake targeting', '', '', '']];
summary.getRange('A11:E11').format = { fill: gold, font: { bold: true, color: navy } };
const summaryRows = CURRICULUM_CATEGORIES.map((category) => [
  category.label,
  REAL_QUESTION_BANK.filter((question) => question.category === category.id).length,
  category.testCount,
  null,
  'One targeted slot per missed question in this category'
]);
summary.getRange(`A12:E${11 + summaryRows.length}`).values = summaryRows;
for (let row = 12; row <= 21; row += 1) summary.getRange(`D${row}`).formulas = [[`=C${row}/B${row}`]];
summary.getRange('A22:E22').values = [['TOTAL', null, null, null, '']];
summary.getRange('B22').formulas = [['=SUM(B12:B21)']];
summary.getRange('C22').formulas = [['=SUM(C12:C21)']];
summary.getRange('D22').formulas = [['=C22/B22']];
summary.getRange('A22:E22').format = { fill: navy, font: { bold: true, color: cream } };
summary.getRange('D12:D22').format.numberFormat = '0%';
summary.getRange('A11:E22').format.borders = {
  top: { style: 'continuous', color: '#D0C8BB' },
  bottom: { style: 'continuous', color: '#D0C8BB' },
  left: { style: 'continuous', color: '#D0C8BB' },
  right: { style: 'continuous', color: '#D0C8BB' }
};
summary.getRange('A24:H24').merge();
summary.getRange('A24').values = [['Retake logic: if the learner fails, half of the retake is targeted to the categories of the questions missed, one category-matched slot per missed question. The other half is broad curriculum practice, preferring unseen questions.']];
summary.getRange('A24:H24').format = { fill: '#E7F3F4', font: { color: '#163D42' }, wrapText: true, rowHeight: 44 };
summary.getRange('A25:H25').merge();
summary.getRange('A25').values = [['Question and answer order is randomized for each attempt. Incorrect results identify missed questions but do not reveal the correct answer.']];
summary.getRange('A25:H25').format = { fill: '#F4F1EA', font: { color: '#1E1A14' }, wrapText: true, rowHeight: 38 };
summary.getRange('A1:H25').format.verticalAlignment = 'center';
summary.getRange('A:A').format.columnWidth = 43;
summary.getRange('B:B').format.columnWidth = 22;
summary.getRange('C:C').format.columnWidth = 20;
summary.getRange('D:D').format.columnWidth = 15;
summary.getRange('E:E').format.columnWidth = 48;
summary.getRange('F:H').format.columnWidth = 4;
summary.freezePanes.freezeRows(2);

const coverage = workbook.worksheets.add('Coverage Plan');
coverage.showGridLines = false;
coverage.getRange('A1:G1').merge();
coverage.getRange('A1').values = [['Curriculum Coverage and Selection Rules']];
coverage.getRange('A1:G1').format = { fill: navy, font: { bold: true, color: cream, size: 18 }, rowHeight: 32 };
coverage.getRange('A3:G3').values = [['Category ID', 'Category', 'Pool questions', 'Initial exam quota', 'Initial coverage', 'Retake rule', 'Verification']];
coverage.getRange('A3:G3').format = { fill: gold, font: { bold: true, color: navy }, wrapText: true };
const coverageRows = CURRICULUM_CATEGORIES.map((category, index) => [
  category.id,
  category.label,
  REAL_QUESTION_BANK.filter((question) => question.category === category.id).length,
  category.testCount,
  null,
  'Same-category replacement for each missed item',
  null
]);
coverage.getRange('A4:G13').values = coverageRows;
for (let row = 4; row <= 13; row += 1) {
  coverage.getRange(`E${row}`).formulas = [[`=D${row}/C${row}`]];
  coverage.getRange(`G${row}`).formulas = [[`=IF(C${row}>=D${row},"OK","REVIEW")`]];
}
coverage.getRange('A14:G14').values = [['TOTAL', '', null, null, null, '', '']];
coverage.getRange('C14').formulas = [['=SUM(C4:C13)']];
coverage.getRange('D14').formulas = [['=SUM(D4:D13)']];
coverage.getRange('E14').formulas = [['=D14/C14']];
coverage.getRange('G14').formulas = [['=IF(AND(C14=100,D14=50),"OK","REVIEW")']];
coverage.getRange('A14:G14').format = { fill: navy, font: { bold: true, color: cream } };
coverage.getRange('E4:E14').format.numberFormat = '0%';
coverage.getRange('A3:G14').format.borders = {
  top: { style: 'continuous', color: '#D0C8BB' },
  bottom: { style: 'continuous', color: '#D0C8BB' },
  left: { style: 'continuous', color: '#D0C8BB' },
  right: { style: 'continuous', color: '#D0C8BB' }
};
coverage.getRange('A4:G13').conditionalFormats.addCustom('=$G4="REVIEW"', { fill: '#FCE8E6', font: { color: '#8B2A1A' } });
coverage.getRange('A:A').format.columnWidth = 22;
coverage.getRange('B:B').format.columnWidth = 46;
coverage.getRange('C:E').format.columnWidth = 18;
coverage.getRange('F:F').format.columnWidth = 42;
coverage.getRange('G:G').format.columnWidth = 14;
coverage.getRange('A3:G14').format.wrapText = true;
coverage.freezePanes.freezeRows(3);
coverage.tables.add('A3:G14', true, 'CoverageTable');

const bank = workbook.worksheets.add('Question Bank');
bank.showGridLines = false;
bank.getRange('A1:I1').merge();
bank.getRange('A1').values = [['Complete Certification Question Bank — 100 Questions']];
bank.getRange('A1:I1').format = { fill: navy, font: { bold: true, color: cream, size: 18 }, rowHeight: 32 };
bank.getRange('A2:I2').merge();
bank.getRange('A2').values = [['CONFIDENTIAL ANSWER KEY — FOR INTERNAL CONTENT REVIEW ONLY']];
bank.getRange('A2:I2').format = { fill: red, font: { bold: true, color: '#FFFFFF' }, rowHeight: 25 };
bank.getRange('A4:I4').values = [['Question ID', 'Category', 'Question', 'Answer A', 'Answer B', 'Answer C', 'Answer D', 'Correct option', 'Correct answer']];
bank.getRange('A4:I4').format = { fill: gold, font: { bold: true, color: navy }, wrapText: true, rowHeight: 32 };
const categoryLabels = Object.fromEntries(CURRICULUM_CATEGORIES.map((category) => [category.id, category.label]));
const bankRows = REAL_QUESTION_BANK.map((question) => {
  const correctIndex = question.options.findIndex((option) => option.id === question.correct);
  return [
    question.id,
    categoryLabels[question.category],
    question.text,
    question.options[0].text,
    question.options[1].text,
    question.options[2].text,
    question.options[3].text,
    String.fromCharCode(65 + correctIndex),
    question.options[correctIndex].text
  ];
});
bank.getRange('A5:I104').values = bankRows;
bank.getRange('A5:I104').format = { wrapText: true, verticalAlignment: 'top' };
for (let row = 5; row <= 104; row += 1) {
  bank.getRange(`A${row}:I${row}`).format.fill = row % 2 ? '#F8F6F1' : '#EEE9E0';
}
bank.getRange('H5:I104').format = { fill: '#E7F3F4', font: { bold: true, color: '#163D42' }, wrapText: true, verticalAlignment: 'top' };
bank.getRange('A:A').format.columnWidth = 12;
bank.getRange('B:B').format.columnWidth = 34;
bank.getRange('C:C').format.columnWidth = 52;
bank.getRange('D:G').format.columnWidth = 42;
bank.getRange('H:H').format.columnWidth = 15;
bank.getRange('I:I').format.columnWidth = 42;
bank.getRange('A4:I104').format.rowHeight = 54;
bank.getRange('A4:I104').format.borders = {
  top: { style: 'continuous', color: '#D0C8BB' },
  bottom: { style: 'continuous', color: '#D0C8BB' },
  left: { style: 'continuous', color: '#D0C8BB' },
  right: { style: 'continuous', color: '#D0C8BB' }
};
bank.freezePanes.freezeRows(4);
bank.tables.add('A4:I104', true, 'QuestionBankTable');

await fs.mkdir(previewDir, { recursive: true });
const summaryPreview = await workbook.render({ sheetName: 'Executive Summary', range: 'A1:H25', autoCrop: 'all', format: 'png', scale: 1.5 });
const coveragePreview = await workbook.render({ sheetName: 'Coverage Plan', range: 'A1:G14', autoCrop: 'all', format: 'png', scale: 1.5 });
const bankPreview = await workbook.render({ sheetName: 'Question Bank', range: 'A1:I18', autoCrop: 'all', format: 'png', scale: 1.1 });
await fs.writeFile(`${previewDir}/executive-summary.png`, new Uint8Array(await summaryPreview.arrayBuffer()));
await fs.writeFile(`${previewDir}/coverage-plan.png`, new Uint8Array(await coveragePreview.arrayBuffer()));
await fs.writeFile(`${previewDir}/question-bank-sample.png`, new Uint8Array(await bankPreview.arrayBuffer()));
const coverageInspection = await workbook.inspect({
  kind: 'table',
  range: 'Coverage Plan!A3:G14',
  include: 'values,formulas',
  tableMaxRows: 20,
  tableMaxCols: 8
});
const bankInspection = await workbook.inspect({
  kind: 'table',
  range: 'Question Bank!A4:I104',
  include: 'values',
  tableMaxRows: 110,
  tableMaxCols: 10
});
const errorInspection = await workbook.inspect({
  kind: 'match',
  searchTerm: '#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A',
  options: { useRegex: true, maxResults: 100 },
  summary: 'final formula error scan'
});
const xlsx = await SpreadsheetFile.exportXlsx(workbook);
await xlsx.save(outputPath);

console.log(JSON.stringify({
  outputPath,
  sheets: workbook.worksheets.items.map((sheet) => sheet.name),
  questionCount: REAL_QUESTION_BANK.length,
  categoryCount: CURRICULUM_CATEGORIES.length,
  coverageInspection: coverageInspection.ndjson,
  questionBankRowsInspected: bankInspection.ndjson.split('\n').length,
  formulaErrors: errorInspection.ndjson
}));
