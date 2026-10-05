// reporters/security-reporter.ts
import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';

interface SecurityFinding {
  test: string;
  risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  recommendation: string;
}

class SecurityReporter implements Reporter {
  private findings: SecurityFinding[] = [];
  private startTime: number = 0;

  onBegin() {
    this.startTime = Date.now();
    console.log('\n🔒 SECURITY ASSESSMENT REPORT\n' + '='.repeat(60));
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const annotations = test.annotations || [];
    
    for (const annotation of annotations) {
      if (annotation.type === 'security-headers' || 
          annotation.type === 'rate-limit' ||
          annotation.type === 'headers') {
        this.findings.push({
          test: test.title,
          risk: 'INFO',
          description: annotation.description || '',
          recommendation: 'Проверить и устранить'
        });
      }
    }

    if (result.status === 'failed') {
      this.findings.push({
        test: test.title,
        risk: 'CRITICAL',
        description: result.error?.message || 'Тест не пройден',
        recommendation: 'Немедленно исправить'
      });
    }
  }

  onEnd(result: FullResult) {
    const duration = ((Date.now() - this.startTime) / 1000).toFixed(1);
    
    console.log(`\n📊 ИТОГИ АУДИТА (${duration}s)\n` + '='.repeat(60));
    
    const critical = this.findings.filter(f => f.risk === 'CRITICAL');
    const high = this.findings.filter(f => f.risk === 'HIGH');
    
    if (critical.length > 0) {
      console.log(`\n🔴 КРИТИЧЕСКИЕ (${critical.length}):`);
      critical.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.test}`);
        console.log(`     ${f.description.slice(0, 200)}`);
      });
    }

    if (high.length > 0) {
      console.log(`\n🟠 ВЫСОКИЕ (${high.length}):`);
      high.forEach((f, i) => {
        console.log(`  ${i + 1}. ${f.test}`);
      });
    }

    console.log(`\n✅ Всего проверок: ${this.findings.length}`);
    console.log(`🔴 Критических: ${critical.length}`);
    console.log(`🟠 Высоких: ${high.length}`);
    console.log('\n📄 Полный отчёт: playwright-report/index.html\n');
  }
}

export default SecurityReporter;