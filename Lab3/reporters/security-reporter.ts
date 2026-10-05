import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

interface Finding {
  test: string;
  risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  title: string;
  description: string;
  recommendation: string;
}

class SecurityReporter implements Reporter {
  private findings: Finding[] = [];
  private failedTests: Finding[] = [];
  private startTime = 0;

  onBegin() {
    this.startTime = Date.now();
    console.log('\nSECURITY / FUNCTIONAL ASSESSMENT REPORT\n' + '='.repeat(70));
  }

  onTestEnd(test: TestCase, result: TestResult) {
    for (const annotation of test.annotations || []) {
      if (annotation.type === 'security-finding') {
        try {
          const data = JSON.parse(annotation.description || '{}');
          this.findings.push({
            test: test.title,
            risk: data.severity || 'INFO',
            title: data.title || 'Security finding',
            description: data.description || '',
            recommendation: data.recommendation || ''
          });
        } catch {
          this.findings.push({
            test: test.title, risk: 'INFO', title: 'Unstructured security finding',
            description: annotation.description || '', recommendation: ''
          });
        }
      }
      if (annotation.type === 'headers' || annotation.type === 'security-note') {
        this.findings.push({
          test: test.title, risk: 'INFO',
          title: annotation.type === 'headers' ? 'Security headers inventory' : 'Security test note',
          description: annotation.description || '',
          recommendation: 'Review the attached evidence in the Playwright report.'
        });
      }
    }
    if (result.status === 'failed') {
      this.failedTests.push({
        test: test.title, risk: 'CRITICAL', title: 'Automated check failed',
        description: result.error?.message || 'Test failed',
        recommendation: 'Open the test in the HTML report and inspect the action steps, screenshot, trace and attachments before classifying it as a product defect.'
      });
    }
  }

  onEnd(result: FullResult) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const high = this.findings.filter(f => f.risk === 'HIGH' || f.risk === 'CRITICAL');
    const medium = this.findings.filter(f => f.risk === 'MEDIUM');
    console.log('\nAUDIT SUMMARY (' + duration + 's)\n' + '='.repeat(70));
    console.log('Security findings: ' + this.findings.length);
    console.log('High/Critical findings: ' + high.length);
    console.log('Medium findings: ' + medium.length);
    console.log('Test failures: ' + this.failedTests.length);
    if (high.length) {
      console.log('\nHIGH / CRITICAL FINDINGS:');
      high.forEach((f, i) => console.log('  ' + (i + 1) + '. [' + f.risk + '] ' + f.title + ' — ' + f.test));
    }
    if (this.failedTests.length) {
      console.log('\nFAILED CHECKS:');
      this.failedTests.forEach((f, i) => console.log('  ' + (i + 1) + '. ' + f.test));
    }
    console.log('\nHTML report: playwright-report/index.html');
  }
}

export default SecurityReporter;
