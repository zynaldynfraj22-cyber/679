import fs from 'node:fs';
import path from 'node:path';
import { buildMigrationDryRunReport } from '../server/questionStore';

function main() {
  const args = process.argv.slice(2);
  const isExecuteRequested = args.includes('--execute');
  const outArg = args.find((a) => a.startsWith('--out='));
  const outFile = outArg ? outArg.slice('--out='.length).trim() : '';

  if (isExecuteRequested) {
    console.error(
      'STOP: Live database migration (--execute) is disabled by Phase 3.5 policy until admin reviews the dry-run report and enables Firebase Admin IAM.'
    );
    process.exit(1);
  }

  const { report, publicRecords, privateKeyRecords } = buildMigrationDryRunReport();

  if (outFile) {
    const resolved = path.resolve(process.cwd(), outFile);
    fs.writeFileSync(
      resolved,
      JSON.stringify(
        {
          report,
          samplePublicRecord: publicRecords[0] ?? null,
          samplePrivateKeyRecord: privateKeyRecords[0] ?? null,
        },
        null,
        2
      ),
      'utf8'
    );
    console.log(`Dry-run migration report written to: ${resolved}`);
  }

  console.log('=== STUDY CORE Phase 3.5 Migration Dry-Run Report ===');
  console.log(`Generated At: ${report.generatedAtIso}`);
  console.log(`Total Questions Scanned: ${report.totalScanned}`);
  console.log(`  - Legacy Server Bank: ${report.legacyCount}`);
  console.log(`  - Extended Server Bank: ${report.extendedCount}`);
  console.log(`Public Docs Prepared (/questionBank): ${report.publicDocsPrepared}`);
  console.log(`Private Key Docs Prepared (/questionAnswerKeys): ${report.privateAnswerKeyDocsPrepared}`);
  console.log(`Public Leak Check Passed: ${report.publicLeakCheckPassed}`);
  console.log(`Public/Private ID Parity Passed: ${report.parityCheckPassed}`);
  console.log('Verification Status Breakdown:', JSON.stringify(report.statusBreakdown, null, 2));
  console.log(`Incomplete/Missing Source IDs (${report.incompleteOrMissingSourceIds.length}):`, report.incompleteOrMissingSourceIds.slice(0, 10).join(', '));
  console.log(`Duplicate Pairs Flagged: ${report.duplicateMatches.length}`);
  if (report.warningsAr.length > 0) {
    console.log('Warnings:');
    for (const w of report.warningsAr) {
      console.log(`  - ${w}`);
    }
  }
}

main();
